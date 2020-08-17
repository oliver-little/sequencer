import * as PIXI from "pixi.js";
import { SongTimeline } from "./SongTimeline";
import { TrackList, TrackHorizontalLines } from "./TrackList.js";
import { UITrack } from "../UIObjects/UITrack.js";
import { SongManager } from "../../Model/SongManagement/SongManager";

export class TimelineView extends PIXI.Container {

    public trackList : TrackList;
    public timeline : SongTimeline;

    private _trackLines : TrackHorizontalLines;

    private _sidebarPosition : number = 100;

    constructor(renderer : PIXI.Renderer, tracks : UITrack[], songManager : SongManager) {
        super();
        this.interactive = true;

        this._trackLines = new TrackHorizontalLines(tracks, renderer.width);
        this.addChild(this._trackLines);
        this.timeline = new SongTimeline(this._sidebarPosition, renderer.width, renderer.height, songManager, tracks);
        this.addChild(this.timeline);
        this.trackList = new TrackList(this._sidebarPosition, renderer.width, tracks);
        this.addChild(this.trackList);
    }
}