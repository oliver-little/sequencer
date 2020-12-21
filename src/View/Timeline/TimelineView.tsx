import * as PIXI from "pixi.js";
import * as React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { SongTimeline } from "./SongTimeline";
import { TrackList } from "./TrackList.js";
import { NoteUITrack, SoundFileUITrack, UITrack } from "../Shared/UITrack.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { VerticalScrollView } from "../Shared/VerticalScrollView.js";
import { UIPositioning } from "../Settings/UITheme";
import { navigationView } from "../Shared/NavigationView";
import { SequencerView } from "../Sequencer/SequencerView";
import { Dropdown } from "../SharedReact/BasicElements";
import { IUIOscillatorTrackSettings, IUISoundFileTrackSettings } from "../Interfaces/UIInterfaces";
import { SimpleEvent } from "../../HelperModules/SimpleEvent";
import { UITrackStore } from "../ReactUI/UITrackStore";

export class TimelineView extends VerticalScrollView {

    public trackList: TrackList;
    public timeline: SongTimeline;

    protected _sidebarPosition: number = UIPositioning.timelineSidebarWidth;

    private _newTrackDropdownContainer: HTMLDivElement;

    private _songManager: SongManager;
    private _cleanupListener: Function;

    constructor(width: number, height: number, songManager: SongManager) {
        super(width, height);
        this._songManager = songManager;
        this.interactive = true;

        this.showSequencer = this.showSequencer.bind(this);
        this.addedHandler = this.addedHandler.bind(this);
        this.removedHandler = this.removedHandler.bind(this);
        this._trackEdited = this._trackEdited.bind(this);
        this._UITrackUpdateHandler = this._UITrackUpdateHandler.bind(this);

        this.on("added", this.addedHandler);
        this.on("removed", this.removedHandler);

        this.trackList = new TrackList(this._sidebarPosition, width, height, songManager);
        this.trackList.trackEdited.addListener(this._trackEdited);
        this.addChild(this.trackList);
        this.timeline = new SongTimeline(this._sidebarPosition, width, height, songManager, this.showSequencer);
        this.addChild(this.timeline);

        this._newTrackDropdownContainer = document.createElement("div");
        document.getElementById("applicationContainer").appendChild(this._newTrackDropdownContainer);
        Object.assign(this._newTrackDropdownContainer.style, {
            position: "absolute",
            top: "5px",
            left: "5px"
        });

        this._renderNewTrackObject();

        this._cleanupListener = UITrackStore.subscribe(this._UITrackUpdateHandler);
    }

    get contentHeight() {
        let tracks = UITrackStore.getState().tracks;
        if (tracks.length == 0) {
            return 0;
        }
        else {
            return tracks[tracks.length - 1].startY + tracks[tracks.length - 1].height;
        }
    }

    public resize(width: number, height: number) {
        super.resize(width, height);
        this.trackList.resize(width, height);
    }

    public destroy() {
        unmountComponentAtNode(this._newTrackDropdownContainer);
        document.getElementById("applicationContainer").removeChild(this._newTrackDropdownContainer);
        this.removeAllListeners();
        this._cleanupListener();
        super.destroy();
    }

    /**
     * Shows a NoteUITrack in the sequencer view (optionally with a position to jump to)
     *
     * @param {NoteUITrack} track The track to show
     * @param {number} [startPosition] Optional position to start the timeline at
     * @memberof TimelineView
     */
    public showSequencer(track: NoteUITrack, startPosition?: number) {
        let sequencerView = new SequencerView(this.endX, this.endY, track, this._songManager, Math.floor(this.timeline.metadata.positionQuarterNoteToBars(startPosition)));
        navigationView.show(sequencerView);
    }

    public addedHandler() {
        super.addedHandler();
        this.trackList.addedHandler();
        this._renderNewTrackObject();
    }

    public removedHandler() {
        super.removedHandler();
        this.trackList.removedHandler();
        unmountComponentAtNode(this._newTrackDropdownContainer);
    }

    public addOscillatorTrack() {
        let tracks = UITrackStore.getState().tracks;
        let track = this._songManager.addOscillatorTrack();
        let startY = this.contentHeight != 0 ? this.contentHeight : UIPositioning.timelineHeaderHeight;
        let settings = { name: "Track " + (tracks.length + 1).toString(), startY: startY, height: 250, modelTrackID: track.id, noteGroups: [] } as IUIOscillatorTrackSettings;

        UITrackStore.dispatch({ type: "ADD_TRACK", track: new NoteUITrack(settings, track) });


        /*this.UITracksChanged.emit(this._tracks);
        this.trackList.drawTracks();
        // Force a resize event to edit bar heights
        this.timeline.resize(this.endX, this.endY);*/
    }

    public async addSoundFileTrack() {
        let tracks = UITrackStore.getState().tracks;
        let track = await this._songManager.addSoundFileTrack();
        let startY = this.contentHeight != 0 ? this.contentHeight : UIPositioning.timelineHeaderHeight;
        let settings = { type: "soundFile", name: ("Track " + (tracks.length + 1).toString()), startY: startY, height: 250, displayActualWidth: true, modelTrackID: track.id } as IUISoundFileTrackSettings;

        UITrackStore.dispatch({ type: "ADD_TRACK", track: new SoundFileUITrack(settings, track) });
    }

    protected updateVerticalScroll(value: number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this.trackList.updateVerticalScroll(value);
    }

    private _trackEdited(index: number) {
        let tracks = UITrackStore.getState().tracks;
        this.timeline.reinitialiseTrack(tracks[index]);
    }

    private _UITrackUpdateHandler() {
        let tracks = UITrackStore.getState().tracks;
        // Also check vertical scroll is still correct
        if (tracks.length > 0) {
            let lastTrack = tracks[tracks.length - 1];
            let endHeight = lastTrack.startY + lastTrack.height + this.verticalScrollPosition;
            if (endHeight < this.endY) {
                this.verticalScrollPosition += (this.endY - endHeight);
            }
        }
        else {
            this.verticalScrollPosition = 0;
        }

        this._renderNewTrackObject();
    }

    private _renderNewTrackObject() {
        let buttonClassName = "addTrackButton";
        if (UITrackStore.getState().tracks.length == 0) {
            buttonClassName += " highlight";
        }
        render(<Dropdown title="New Track" iconName="fa fa-plus" optionTitles={["New Oscillator Track", "New Sound File Track"]} buttonClassName={buttonClassName} optionsDivClassName={"addTrackOptionsDiv"} optionClassName={"addTrackItem"}
            optionClickCallback={async (index) => {
                if (index == 0) {
                    this.addOscillatorTrack();
                }
                else if (index == 1) {
                    await this.addSoundFileTrack();
                }
            }} />, this._newTrackDropdownContainer);
    }
}