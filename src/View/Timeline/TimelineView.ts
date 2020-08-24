import * as PIXI from "pixi.js";
import { SongTimeline } from "./SongTimeline";
import { TrackList, TrackHorizontalLines } from "./TrackList.js";
import { UITrack } from "../UIObjects/UITrack.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { VerticalScrollView } from "../Shared/VerticalScrollView.js";

export class TimelineView extends VerticalScrollView {

    public trackList : TrackList;
    public timeline : SongTimeline;
    private _trackLines : TrackHorizontalLines;

    private _tracks : UITrack[];

    constructor(renderer : PIXI.Renderer, tracks : UITrack[], songManager : SongManager) {
        super(renderer.width, renderer.height);
        this.interactive = true;
        this._tracks = tracks;

        this._trackLines = new TrackHorizontalLines(tracks, renderer.width);
        this.addChild(this._trackLines);
        this.timeline = new SongTimeline(this._sidebarPosition, renderer.width, renderer.height, songManager, tracks);
        this.addChild(this.timeline);
        this.trackList = new TrackList(this._sidebarPosition, renderer.width, tracks);
        this.addChild(this.trackList);

        if (this.contentHeight < renderer.height) {
            this.scrollingEnabled = false;
        }
    }

    get contentHeight() {
        return this._tracks[this._tracks.length - 1].startY + this._tracks[this._tracks.length - 1].height;
    }

    protected updateVerticalScroll(value : number) {
        value = Math.min(0, value);
        this.timeline.updateVerticalScroll(value);
        this._trackLines.y = value;
    }
}