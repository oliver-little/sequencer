import * as PIXI from "pixi.js";
import { SongTimeline } from "./SongTimeline";
import { TrackList, TrackLines } from "./TrackList.js";
import { UITrack } from "../UIObjects/UITrack.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { VerticalScrollView } from "../Shared/VerticalScrollView.js";
import { UIPositioning } from "../Shared/UITheme";

export class TimelineView extends VerticalScrollView {

    public trackList : TrackList;
    public timeline : SongTimeline;

    protected _sidebarPosition : number = UIPositioning.timelineSidebarWidth;

    private _tracks : UITrack[];

    constructor(renderer : PIXI.Renderer, tracks : UITrack[], songManager : SongManager) {
        super(renderer.width, renderer.height);
        this.interactive = true;
        this._tracks = tracks;

        this.timeline = new SongTimeline(this._sidebarPosition, renderer.width, renderer.height, songManager, tracks);
        this.addChild(this.timeline);
        this.trackList = new TrackList(this._sidebarPosition, renderer.width, renderer.height, tracks);
        this.addChild(this.trackList);
    }

    get contentHeight() {
        return this._tracks[this._tracks.length - 1].startY + this._tracks[this._tracks.length - 1].height;
    }

    protected updateVerticalScroll(value : number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this.trackList.updateVerticalScroll(value);
    }
}