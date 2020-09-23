import * as PIXI from "pixi.js"
import { MouseClickType } from "./Enums";
import { PointHelper } from "../../HelperModules/PointHelper";

/**
 * Helper class to track whether the mouse is currently over this displayobject, and therefore whether it should receive or ignore mouse events.
 *
 * @class InteractiveContainer
 * @extends {PIXI.Container}
 */
export abstract class InteractiveContainer extends PIXI.Container {
    public mouseIsOver : boolean = false;

    constructor() {
        super();

        this.interactive = true;
        this.on("pointerdown", this.pointerDownHandler.bind(this));
        this.on("pointermove", this.pointerMoveHandler.bind(this));
        this.on("pointerup", this.pointerUpHandler.bind(this));
        this.on("pointerupoutside", this.pointerUpHandler.bind(this));
        this.on("pointerover", this.pointerOverHandler.bind(this));
        this.on("pointerout", this.pointerOutHandler.bind(this));
    }

    public pointerOverHandler(event : PIXI.InteractionEvent) {
        this.mouseIsOver = true;
    }

    public pointerOutHandler(event : PIXI.InteractionEvent) {
        this.mouseIsOver = false;
    }

    public abstract pointerDownHandler(event : PIXI.InteractionEvent);
    public abstract pointerMoveHandler(event : PIXI.InteractionEvent);
    public abstract pointerUpHandler(event : PIXI.InteractionEvent);
}

/**
 * Extends InteractiveContainer to add support for testing the type of click
 *
 * @export
 * @abstract
 * @class MouseTypeContainer
 * @extends {InteractiveContainer}
 */
export abstract class MouseTypeContainer extends InteractiveContainer {
    protected _mouseClickType : MouseClickType;
    protected _startPointerPosition : PIXI.Point;

    /**
     * This should always be called at the START of any subclass reimplementing this function
     * Afterwards, return immediately MouseClickType is None
     *
     * @param {PIXI.InteractionEvent} event
     * @returns
     * @memberof MouseTypeContainer
     */
    public pointerDownHandler(event: PIXI.InteractionEvent) {
        if (!this.mouseIsOver) {
            return;
        }

        switch (event.data.button) {
            case 0:
                this._mouseClickType = MouseClickType.LeftClick;
                break;
            case 1:
                this._mouseClickType = MouseClickType.MiddleClick;
                break;
            case 2:
                this._mouseClickType = MouseClickType.RightClick;
                break;
            default:
                this._mouseClickType = MouseClickType.None;
                return;
        }
        this._startPointerPosition = event.data.getLocalPosition(this.parent);
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        return;
    }

    /**
     * This should always be called at the START of any subclass reimplementing this function.
     * 
     * Only reimplement this function to clear any variables set in pointerDown
     *
     * @param {PIXI.InteractionEvent} event
     * @memberof MouseTypeContainer
     */
    public pointerUpHandler(event : PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.None || this._mouseClickType == undefined) {
            return;
        }
        else {
            if (PointHelper.distanceSquared(event.data.getLocalPosition(this.parent), this._startPointerPosition) < 100) {
                this.pointerUpClickHandler(event);
            }
            else {
                this.pointerUpDragHandler(event);
            }
        }

        this._mouseClickType = MouseClickType.None;
        this._startPointerPosition = undefined;
    }

    /**
     * Subclasses should reimplement this function to complete any logic when the object is clicked.
     *
     * @param {PIXI.InteractionEvent} event
     * @memberof MouseTypeContainer
     */
    public pointerUpClickHandler(event : PIXI.InteractionEvent) {
        return;
    }

    /**
     * Subclasses should reimplement this function to complete any logic when this object is dragged (after the mouse is released).
     * 
     * @param {PIXI.InteractionEvent} event
     * @memberof MouseTypeContainer
     */
    public pointerUpDragHandler(event : PIXI.InteractionEvent) {
        return;
    }
}
