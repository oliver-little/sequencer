import * as PIXI from "pixi.js";
import * as React from "react";
import {render, unmountComponentAtNode} from "react-dom";
import { SongTimeline } from "./SongTimeline";
import { TrackList } from "./TrackList.js";
import { NoteUITrack, SoundFileUITrack, UITrack } from "../UIObjects/UITrack.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { VerticalScrollView } from "../Shared/VerticalScrollView.js";
import { UIPositioning } from "../Shared/UITheme";
import { navigationView } from "../Shared/NavigationView";
import { SequencerView } from "../Sequencer/SequencerView";
import { Dropdown } from "../SharedReact/BasicElements";

export class TimelineView extends VerticalScrollView {

    public trackList : TrackList;
    public timeline : SongTimeline;

    protected _sidebarPosition : number = UIPositioning.timelineSidebarWidth;

    private _newTrackDropdownContainer : HTMLDivElement;

    private _songManager : SongManager;
    private _tracks : UITrack[];

    constructor(width: number, height: number, tracks : UITrack[], songManager : SongManager) {
        super(width, height);
        this._songManager = songManager;
        this._tracks = tracks;
        this.interactive = true;

        this.showSequencer = this.showSequencer.bind(this);
        this.addedHandler = this.addedHandler.bind(this);
        this.removedHandler = this.removedHandler.bind(this);
        this._trackEdited = this._trackEdited.bind(this);
        this._trackRemoved = this._trackRemoved.bind(this);
        
        this.on("added", this.addedHandler);
        this.on("removed", this.removedHandler);

        this.timeline = new SongTimeline(this._sidebarPosition, width, height, songManager, tracks, this.showSequencer);
        this.addChild(this.timeline);
        this.trackList = new TrackList(this._sidebarPosition, width, height, songManager, tracks);
        this.trackList.trackRemoved.addListener(this._trackRemoved);
        this.trackList.trackEdited.addListener(this._trackEdited);
        this.addChild(this.trackList);

        this._newTrackDropdownContainer = document.createElement("div");
        document.getElementById("applicationContainer").appendChild(this._newTrackDropdownContainer);
        Object.assign(this._newTrackDropdownContainer.style, {
            position: "absolute",
            top: "5px",
            left: "5px"
        });

        this._renderNewTrackObject();
    }

    get contentHeight() {
        if (this._tracks.length == 0) {
            return 0;
        }
        else {
            return this._tracks[this._tracks.length - 1].startY + this._tracks[this._tracks.length - 1].height;
        }
    }

    public resize(width: number, height: number) {
        super.resize(width, height);
        this.trackList.resize(width, height);
    }

    public destroy() {
        unmountComponentAtNode(this._newTrackDropdownContainer);
        document.getElementById("applicationContainer").removeChild(this._newTrackDropdownContainer);
        this.trackList.trackRemoved.removeListener(this._trackRemoved);
        this.removeAllListeners();
        super.destroy();
    }

    public showSequencer(track : NoteUITrack) {
        navigationView.show(new SequencerView(this.endX, this.endY, track, this._songManager));
    }

    public addedHandler() {
        this.trackList.addedHandler();
        this.timeline.regenerateNoteGroups();
        this.timeline.regenerateAroundPosition(0);
        this._renderNewTrackObject();
    }

    public removedHandler() {
        this.trackList.removedHandler();
        unmountComponentAtNode(this._newTrackDropdownContainer);
    }

    public addOscillatorTrack() {
        let track = this._songManager.addOscillatorTrack();
        let startY = this.contentHeight != 0 ? this.contentHeight : UIPositioning.timelineHeaderHeight;
        this._tracks.push(new NoteUITrack("Track " + (this._tracks.length+1).toString(), startY, 250, track));
        this.trackList.drawTracks();
        // Force a resize event to edit bar heights
        this.timeline.resize(this.endX, this.endY);
    }

    public async addSoundFileTrack() {
        let track = await this._songManager.addSoundFileTrack();
        let startY = this.contentHeight != 0 ? this.contentHeight : UIPositioning.timelineHeaderHeight;
        this._tracks.push(new SoundFileUITrack("Track " + (this._tracks.length+1).toString(), startY, 250, track));
        this.trackList.drawTracks();
        this.timeline.resize(this.endX, this.endY);
    }

    protected updateVerticalScroll(value : number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this.trackList.updateVerticalScroll(value);
    }

    private _trackEdited(index : number) {
        this.timeline.reinitialiseTrack(this._tracks[index]);
    }

    private _trackRemoved() {
        this.timeline.regenerateTracks();
    }

    private _renderNewTrackObject() {
        render(<Dropdown title={"+"} optionTitles={["New Oscillator Track", "New Sound File Track"]} buttonClassName={"addTrackButton"} optionsDivClassName={"addTrackOptionsDiv"} optionClassName={"addTrackItem"}
        optionClickCallback={async (index) => {
            if(index == 0) {
                this.addOscillatorTrack();
            }
            else if (index == 1) {
                await this.addSoundFileTrack();
            }
        }}/>, this._newTrackDropdownContainer);
    }
}