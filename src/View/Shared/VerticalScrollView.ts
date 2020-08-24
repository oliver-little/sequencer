import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "./ScrollableTimeline";

export abstract class VerticalScrollView extends PIXI.Container {
    public timeline : ScrollableTimeline;
    public scrollingEnabled : boolean = true;

    protected _interactivityRect : PIXI.Graphics;
    
    protected _sidebarPosition = 100;

    // Scrolling variables
    private _startPointerPosition : PIXI.Point;
    private _verticalScrollPosition : number;

    constructor(width : number, height : number) {
        super();
        this._verticalScrollPosition = 0;

        this._interactivityRect = new PIXI.Graphics();
        this.addChild(this._interactivityRect);
        this.interactive = true;
        this.resizeInteractiveArea(width, height);

        this.on("pointerdown", this.pointerDownHandler.bind(this));
        this.on("pointermove", this.pointerMoveHandler.bind(this));
        this.on("pointerup", this.pointerUpHandler.bind(this));
        this.on("pointerupoutside", this.pointerUpHandler.bind(this));
    
    }

    public resizeInteractiveArea(width: number, height: number) {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(0, 0, width, height);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }

    public pointerDownHandler(event : PIXI.InteractionEvent) {
        if (this.scrollingEnabled) {
            this._startPointerPosition = event.data.getLocalPosition(this);
        }

        if (this._startPointerPosition.x > this._sidebarPosition) {
            this.timeline.pointerDownHandler(event);
        }
    }

    public pointerMoveHandler(event : PIXI.InteractionEvent) {
        if (this.scrollingEnabled && this._startPointerPosition != undefined) {
            let newVerticalScroll = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._verticalScrollPosition;
            this.updateVerticalScroll(newVerticalScroll);
        }
        if (event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this.timeline.pointerMoveHandler(event);
        }
    }

    public pointerUpHandler(event : PIXI.InteractionEvent) {
        if (this.scrollingEnabled) {
            this._verticalScrollPosition = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._verticalScrollPosition;
            this.updateVerticalScroll(this._verticalScrollPosition);
        }
        if (event.data.getLocalPosition(this).x > this._sidebarPosition) {
            this.timeline.pointerUpHandler(event);
        }

        this._startPointerPosition = undefined;
    }

    protected abstract updateVerticalScroll(value : number);
}