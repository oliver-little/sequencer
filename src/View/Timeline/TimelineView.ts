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
        this.on("pointerdown", this._pointerDownHandler.bind(this));
        this.on("pointermove", this._pointerMoveHandler.bind(this));
        this.on("pointerup", this._pointerUpHandler.bind(this));
        this.on("pointerupoutside", this._pointerUpHandler.bind(this));
        this._interactivityRect = new PIXI.Graphics();
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

    // Custom code to delegate events to children.
    // TODO: This is not a good system to do this, as it overrides the usual event capture/bubble system, need to add the interactivity rect to the children rather than this object.

    private _pointerDownHandler(event : PIXI.InteractionEvent) {
        if (event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this.timeline.pointerDownHandler(event);
        }
    }

    private _pointerMoveHandler(event : PIXI.InteractionEvent) {;
        if (this.timeline.isDragging || event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this.timeline.pointerMoveHandler(event);
        }
    }

    private _pointerUpHandler(event : PIXI.InteractionEvent) {
        if (this.timeline.isDragging || event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this.timeline.pointerUpHandler(event);
        }
    }
}