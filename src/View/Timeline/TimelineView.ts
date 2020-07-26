import * as PIXI from "pixi.js";
import { SongTimeline } from "./SongTimeline";
import SongMetadata from "../../Model/SongManagement/SongMetadata.js";
import { TrackList, TrackHorizontalLines } from "./TrackList.js";
import { UITrack } from "../UIObjects/UITrack.js";

export class TimelineView extends PIXI.Container {

    public trackList : TrackList;
    public timeline : SongTimeline;

    private _trackLines : TrackHorizontalLines;

    private _interactivityRect : PIXI.Graphics;
    private _sidebarPosition : number = 100;

    constructor(renderer : PIXI.Renderer, tracks : UITrack[], metadata : SongMetadata) {
        super();
        this.interactive = true;
        this.resize(renderer.width, renderer.height);

        this.timeline = new SongTimeline(this._sidebarPosition, renderer.width, renderer.height, metadata, tracks);
        this.addChild(this.timeline);
        this.trackList = new TrackList(this._sidebarPosition, renderer.width, tracks);
        this.addChild(this.trackList);
        this._trackLines = new TrackHorizontalLines(tracks, renderer.width);
        this.addChild(this._trackLines);
        this.addChild(this._interactivityRect);
    }

    public resize(width : number, height : number) {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(0, 0, width, height);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }
}