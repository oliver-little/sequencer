import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "./ScrollableTimeline";
import { InteractiveContainer, MouseTypeContainer } from "./InteractiveContainer";
import { MouseClickType } from "../Settings/Enums";
import { UIPositioning } from "../Settings/UITheme";
import { IFullScreenView } from "../Interfaces/IFullScreenView";

interface pointerEventObject {
    pointerDownHandler(event: PIXI.InteractionEvent);
    pointerMoveHandler(event: PIXI.InteractionEvent);
    pointerUpHandler(event: PIXI.InteractionEvent);
}

export abstract class VerticalScrollView extends MouseTypeContainer implements IFullScreenView {
    public timeline: ScrollableTimeline;
    public scrollingEnabled: boolean = true;

    public endX: number;
    public endY: number;

    protected _interactivityRect: PIXI.Graphics;
    protected _sendPointerEventsTo: pointerEventObject;

    protected _sidebarPosition = UIPositioning.sequencerSidebarWidth;
    protected abstract readonly contentHeight: number;

    // Scrolling variables
    protected _verticalScrollPosition: number;
    protected _startVerticalScrollPosition: number;

    constructor(width: number, height: number) {
        super();
        this._verticalScrollPosition = 0;

        this._interactivityRect = new PIXI.Graphics();
        this.addChild(this._interactivityRect);

        this.endX = width;
        this.endY = height;
        this.resizeInteractiveArea(width, height);

        this.on("added", this.addedHandler);
        this.on("removed", this.removedHandler);
    }

    public resize(width: number, height: number) {
        this.endX = width;
        this.endY = height;
        this.resizeInteractiveArea(width, height);
        this.timeline.resize(width, height);
    }


    get verticalScrollPosition(): number {
        return this._verticalScrollPosition;
    }

    set verticalScrollPosition(value: number) {
        // Include a small offset so content at the very bottom is still visible
        let oldVSP = this._verticalScrollPosition;
        this._verticalScrollPosition = Math.min(0, Math.max(-this.contentHeight + this.endY - 2, value));
        if (oldVSP != this._verticalScrollPosition) {
            this.updateVerticalScroll(this._verticalScrollPosition);
        }
    }

    public resizeInteractiveArea(width: number, height: number) {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(0, 0, width, height);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        super.pointerDownHandler(event);

        if (this._mouseClickType == MouseClickType.None) {
            return;
        }

        this._startPointerPosition = event.data.getLocalPosition(this);
        this._startVerticalScrollPosition = this._verticalScrollPosition;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick && this.scrollingEnabled) {
            this.verticalScrollPosition = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._startVerticalScrollPosition;
        }
    }

    public pointerUpHandler(event: PIXI.InteractionEvent) {
        super.pointerUpHandler(event);
        this._startPointerPosition = undefined;
        this._startVerticalScrollPosition = undefined;
    }

    public pointerUpDragHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick && this.scrollingEnabled) {
            this.verticalScrollPosition = event.data.getLocalPosition(this).y - this._startPointerPosition.y + this._startVerticalScrollPosition;
        }
    }

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        this.timeline.mouseWheelHandler(event, canvasX, canvasY);
    }

    public addedHandler() {
        this.timeline.addedHandler();
    }

    public removedHandler() {
        this.timeline.removedHandler();
    }

    public destroy() {
        super.destroy({ children: true });
    }

    protected abstract updateVerticalScroll(value: number);
}