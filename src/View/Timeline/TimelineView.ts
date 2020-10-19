import * as PIXI from "pixi.js";
import { SongTimeline } from "./SongTimeline";
import { TrackList, TrackLines } from "./TrackList.js";
import { NoteUITrack, UITrack } from "../UIObjects/UITrack.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { VerticalScrollView } from "../Shared/VerticalScrollView.js";
import { UIPositioning } from "../Shared/UITheme";
import { navigationView } from "../Shared/NavigationView";
import { SequencerView } from "../Sequencer/SequencerView";

export class TimelineView extends VerticalScrollView {

    public trackList : TrackList;
    public timeline : SongTimeline;

    protected _sidebarPosition : number = UIPositioning.timelineSidebarWidth;

    private _renderer : PIXI.Renderer;
    private _songManager : SongManager;
    private _tracks : UITrack[];

    constructor(renderer : PIXI.Renderer, tracks : UITrack[], songManager : SongManager) {
        super(renderer.width, renderer.height);
        this._renderer = renderer;
        this._songManager = songManager;
        this._tracks = tracks;
        this.interactive = true;

        this.showSequencer = this.showSequencer.bind(this);
        this.addedHandler = this.addedHandler.bind(this);
        this.removedHandler = this.removedHandler.bind(this);

        
        this.on("added", this.addedHandler);
        this.on("removed", this.removedHandler);

        this.timeline = new SongTimeline(this._sidebarPosition, renderer.width, renderer.height, songManager, tracks, this.showSequencer);
        this.addChild(this.timeline);
        this.trackList = new TrackList(this._sidebarPosition, renderer.width, renderer.height, tracks);
        this.addChild(this.trackList);
    }

    get contentHeight() {
        return this._tracks[this._tracks.length - 1].startY + this._tracks[this._tracks.length - 1].height;
    }

    public showSequencer(track : NoteUITrack) {
        navigationView.show(new SequencerView(this._renderer, track, this._songManager));
    }

    public addedHandler() {
        this.trackList.addedHandler();
        this.timeline.regenerateNoteGroups();
        this.timeline.regenerateAroundPosition(0);
    }

    public removedHandler() {
        this.trackList.removedHandler();
    }

    protected updateVerticalScroll(value : number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this.trackList.updateVerticalScroll(value);
    }
}