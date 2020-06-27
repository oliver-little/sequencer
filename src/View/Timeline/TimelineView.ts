import * as PIXI from "pixi.js";
import { BarTimeline } from "./Bar.js";

export class TimelineView extends PIXI.Container {

    private _interactivityRect : PIXI.Graphics;
    private _timeline : BarTimeline;
    private _sidebarPosition : number = 100;

    constructor(renderer : PIXI.Renderer) {
        super();
        this.interactive = true;
        this.on("pointerdown", this._pointerDownHandler.bind(this));
        this.on("pointermove", this._pointerMoveHandler.bind(this));
        this.on("pointerup", this._pointerUpHandler.bind(this));
        this.on("pointerupoutside", this._pointerUpHandler.bind(this));
        this._interactivityRect = new PIXI.Graphics();
        this.resize(renderer.width, renderer.height);
        this._timeline = new BarTimeline(this._sidebarPosition, renderer.width - this._sidebarPosition, renderer.height);
        this.addChild(this._timeline);
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

    private _pointerDownHandler(event : PIXI.InteractionEvent) {
        if (event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this._timeline.pointerDownHandler(event);
        }
    }

    private _pointerMoveHandler(event : PIXI.InteractionEvent) {;
        if (this._timeline.isDragging || event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this._timeline.pointerMoveHandler(event);
        }
    }

    private _pointerUpHandler(event : PIXI.InteractionEvent) {
        if (this._timeline.isDragging || event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this._timeline.pointerUpHandler(event);
        }
    }
}