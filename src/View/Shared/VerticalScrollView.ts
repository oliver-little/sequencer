import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "./ScrollableTimeline";

interface pointerEventObject {
    pointerDownHandler(event : PIXI.InteractionEvent);
    pointerMoveHandler(event : PIXI.InteractionEvent);
    pointerUpHandler(event : PIXI.InteractionEvent);
}

export abstract class VerticalScrollView extends PIXI.Container {
    public timeline : ScrollableTimeline;
    public scrollingEnabled : boolean = true;

    public endX : number;
    public endY : number;

    protected _interactivityRect : PIXI.Graphics;
    protected _sendPointerEventsTo : pointerEventObject;
    
    protected _sidebarPosition = 100;
    protected abstract readonly contentHeight: number;

    // Scrolling variables
    private _startPointerPosition : PIXI.Point;
    protected _verticalScrollPosition : number;
    protected _startVerticalScrollPosition : number;

    constructor(width : number, height : number) {
        super();
        this.endX = width;
        this.endY = height;
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


    get verticalScrollPosition() : number {
        return this._verticalScrollPosition;
    }

    set verticalScrollPosition(value : number) {
        this._verticalScrollPosition = Math.min(0, Math.max(-this.contentHeight + this.endY, value));
    }

    public resizeInteractiveArea(width: number, height: number) {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(0, 0, width, height);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }

    public pointerDownHandler(event : PIXI.InteractionEvent) {
        this._startPointerPosition = event.data.getLocalPosition(this);
        this._startVerticalScrollPosition = this._verticalScrollPosition;

        if (this._startPointerPosition.x > this._sidebarPosition) {
            this._sendPointerEventsTo = this.timeline;
        }
        this._sendPointerEventsTo.pointerDownHandler(event);
    }

    public pointerMoveHandler(event : PIXI.InteractionEvent) {
        if (this.scrollingEnabled && this._startPointerPosition != undefined) {
            this.verticalScrollPosition = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._startVerticalScrollPosition;
            this.updateVerticalScroll(this.verticalScrollPosition);
        }
        if (this._sendPointerEventsTo != undefined) {
            this._sendPointerEventsTo.pointerMoveHandler(event);
        }
        else {
            if (event.data.getLocalPosition(this).x > this._sidebarPosition) {
                this.timeline.pointerMoveHandler(event);
            }
        }
    }

    public pointerUpHandler(event : PIXI.InteractionEvent) {
        if (this.scrollingEnabled && this._startPointerPosition != undefined) {
            this.verticalScrollPosition = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._startVerticalScrollPosition;
            this.updateVerticalScroll(this.verticalScrollPosition);
        }
        if (this._sendPointerEventsTo != undefined) {
            this._sendPointerEventsTo.pointerUpHandler(event);
        }
        this._sendPointerEventsTo = undefined;
        this._startPointerPosition = undefined;
    }

    protected abstract updateVerticalScroll(value : number);
}