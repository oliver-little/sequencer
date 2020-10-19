import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "./ScrollableTimeline";
import { InteractiveContainer, MouseTypeContainer } from "./InteractiveContainer";
import { MouseClickType } from "./Enums";
import { UIPositioning } from "./UITheme";

interface pointerEventObject {
    pointerDownHandler(event : PIXI.InteractionEvent);
    pointerMoveHandler(event : PIXI.InteractionEvent);
    pointerUpHandler(event : PIXI.InteractionEvent);
}

export abstract class VerticalScrollView extends MouseTypeContainer {
    public timeline : ScrollableTimeline;
    public scrollingEnabled : boolean = true;

    public endX : number;
    public endY : number;

    protected _interactivityRect : PIXI.Graphics;
    protected _sendPointerEventsTo : pointerEventObject;
    
    protected _sidebarPosition = UIPositioning.sequencerSidebarWidth;
    protected abstract readonly contentHeight: number;

    // Scrolling variables
    protected _verticalScrollPosition : number;
    protected _startVerticalScrollPosition : number;

    constructor(width : number, height : number) {
        super();
        this.endX = width;
        this.endY = height;
        this._verticalScrollPosition = 0;

        this._interactivityRect = new PIXI.Graphics();
        this.addChild(this._interactivityRect);
        this.resizeInteractiveArea(width, height);
    }


    get verticalScrollPosition() : number {
        return this._verticalScrollPosition;
    }

    set verticalScrollPosition(value : number) {
        // Include a small offset so content at the very bottom is still visible
        this._verticalScrollPosition = Math.min(0, Math.max(-this.contentHeight + this.endY - 2, value));
    }

    public resizeInteractiveArea(width: number, height: number) {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(0, 0, width, height);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }

    public pointerDownHandler(event : PIXI.InteractionEvent) {
        super.pointerDownHandler(event);

        if (this._mouseClickType == MouseClickType.None) {
            return;
        }

        this._startPointerPosition = event.data.getLocalPosition(this);
        this._startVerticalScrollPosition = this._verticalScrollPosition;
    }

    public pointerMoveHandler(event : PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick && this.scrollingEnabled) {
            this.verticalScrollPosition = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._startVerticalScrollPosition;
            this.updateVerticalScroll(this.verticalScrollPosition);
        }
    }

    public pointerUpHandler(event : PIXI.InteractionEvent) {
        super.pointerUpHandler(event);
        this._startPointerPosition = undefined;
        this._startVerticalScrollPosition = undefined;
    }

    public pointerUpDragHandler(event : PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick && this.scrollingEnabled) {
            this.verticalScrollPosition = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._startVerticalScrollPosition;
            this.updateVerticalScroll(this.verticalScrollPosition);
        }
    }

    public destroy() {
        super.destroy({children : true});
    }

    protected abstract updateVerticalScroll(value : number);
}