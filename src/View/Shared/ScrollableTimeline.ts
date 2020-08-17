import * as PIXI from "pixi.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import { PointHelper } from "../../HelperModules/PointHelper.js";

export interface ScrollableBar extends PIXI.Container {
    barNumber: number;
    numberOfBeats: number;
    leftBound : number;
    rightBound : number;
}

export abstract class ScrollableTimeline extends PIXI.Container {

    // Stores the width of 1 beat in pixels.
    static beatWidth = 50;

    public startX: number;
    public startY: number;
    public endX: number;
    public endY: number;

    protected _zoomScale = 1;

    protected _scrollObjects: ScrollableBar[];
    protected _scrollObjectContainer : PIXI.Container;
    protected _objectPool: ObjectPool<ScrollableBar>;

    protected _startPointerPosition: PIXI.Point;
    protected _startXPosition: number;
    protected _interactivityRect: PIXI.Graphics;

    constructor (startX : number, endX : number, startY : number, endY : number) {
        super();
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;

        this._interactivityRect = new PIXI.Graphics();
        this.interactive = true;
        this.resizeInteractiveArea();
        this.addChild(this._interactivityRect);

        this._scrollObjectContainer = new PIXI.Container();
        this.addChild(this._scrollObjectContainer);

        this.on("pointerdown", this.pointerDownHandler.bind(this));
        this.on("pointermove", this.pointerMoveHandler.bind(this));
        this.on("pointerup", this.pointerUpHandler.bind(this));
        this.on("pointerupoutside", this.pointerUpHandler.bind(this));
    }

    get beatWidth() {
        return ScrollableTimeline.beatWidth * this._zoomScale;
    }

    public resizeInteractiveArea() {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(this.startX, 0, this.endX, this.endY);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._startXPosition = this.x;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        let moveDelta = event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x;
            this.x = this._startXPosition + moveDelta;

            // This solution is used because the container's x is reset to 0 after each scroll event,
            // but while scrolling occurs the container's position rather than the child objects' positions is changed.
            // Therefore, we have to find out if bar 0 is past where the timeline should start.
            // If it is, calculate the offset required to position bar 0 at the start of the timeline.
            if (this._scrollObjects[0].barNumber === 0 && this.x + this._scrollObjects[0].leftBound > this.startX) {
                this.x = -this._scrollObjects[0].leftBound + this.startX;
            }

            // While loops are used in this section because extremely quick, large scrolls can cause bars to be missing
            // Check right side for adding or removing bars offscreen
            let rightSideOffset = this.x + this._scrollObjects[this._scrollObjects.length - 1].rightBound - this.endX;
            while (rightSideOffset < 100) { // If the right side is too close, need to add a new bar.
                let lastBar = this._scrollObjects[this._scrollObjects.length - 1];
                let bar = this._initialiseScrollableBar(lastBar.rightBound, lastBar.barNumber + 1, true);
                this._scrollObjects.push(bar);

                // Recalculate where the right side is.
                rightSideOffset = this.x + this._scrollObjects[this._scrollObjects.length - 1].rightBound - this.endX;
            }
            while (rightSideOffset > 800) {
                let bar = this._scrollObjects.pop();
                this._returnScrollableBar(bar);

                rightSideOffset = this.x + this._scrollObjects[this._scrollObjects.length - 1].rightBound - this.endX;
            }


            // Check left side for adding or removing bars offscreen
            let leftSideOffset = this.startX - this.x - this._scrollObjects[0].leftBound;
            while (leftSideOffset < 100 && this._scrollObjects[0].barNumber != 0) {
                let firstBar = this._scrollObjects[0];
                let bar = this._initialiseScrollableBar(firstBar.leftBound, firstBar.barNumber - 1, false);
                this._scrollObjects.splice(0, 0, bar);

                leftSideOffset = this.startX - this.x - this._scrollObjects[0].leftBound;
            }
            while (leftSideOffset > 800) {
                let bar = this._scrollObjects.splice(0, 1)[0];
                this._returnScrollableBar(bar);
                leftSideOffset = this.startX - this.x - this._scrollObjects[0].leftBound;
            }
    }

    public pointerUpHandler(event: PIXI.InteractionEvent) {
        // Check if event was a click
        if (PointHelper.distanceSquared(event.data.getLocalPosition(this.parent), this._startPointerPosition) < 10) {
            this.pointerUpClickHandler(event);
        }
        else {
            this.pointerUpDragHandler(event);
        }        

        this._startXPosition = undefined;
        this._startPointerPosition = undefined;
    }

    public pointerUpClickHandler(event: PIXI.InteractionEvent) {
        // TODO: add timeline marker to this object and move timeline marker on click
    }

    public pointerUpDragHandler(event: PIXI.InteractionEvent) {
        // Normal drag
        this._offsetChildren(-this.x);
        this.x = 0;
    }

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        let stageX = event.clientX - canvasX;
        let stageY = event.clientY - canvasY;
        if (stageX < this.startX || stageX > this.endX || stageY < 0 || stageY > this.endY) {
            return;
        }

        // Get the mouse's position in bars (based on the screen)
        let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(stageX);
        barPosition += beatPosition / numBeats
        // Change the scaling
        this._zoomScale = Math.max(0.5, Math.min(5.0, this._zoomScale - event.deltaY / 1000));
        // Regenerate the bars (at least until the bar we need)
        this._regenerateTimeline(this._scrollObjects[0].barNumber, Math.floor(barPosition));
        // Get the offset required to put the original position under the mouse
        let offset = this._getStageCoordinatesFromBar(barPosition) - stageX;
        // If the first bar is bar 0, check the offset won't cause it to go past the left side of the timeline view.
        if (this._scrollObjects[0].barNumber === 0 && this._scrollObjects[0].leftBound - offset > this.startX) {
            // If it will, instead set the offset at most to the offset needed to put bar 0 at the start of the timeline view.
            offset = this.startX - this._scrollObjects[0].leftBound;
        }
        this._offsetChildren(offset);
    }

    /**
     * Gets a bar position from a given coordinate relative to the stage.
     *
     * @private
     * @param {number} stageX The stage x coordinate (pixels)
     * @returns {number[]} An array of the form [bar number, number of beats through bar, number of beats in bar]
     * @memberof SongTimeline
     */
    protected _getBarFromStageCoordinates(stageX: number) : number[] {
        for (let i = 0; i < this._scrollObjects.length; i++) {
            if (this._scrollObjects[i].leftBound <= stageX && this._scrollObjects[i].rightBound > stageX) {
                // Calculate the bar number + the percentage through the bar that the mouse position
                return [this._scrollObjects[i].barNumber,  ((stageX - this._scrollObjects[i].leftBound) / this.beatWidth), this._scrollObjects[i].numberOfBeats];
            }
        }
    }


    protected _getStageCoordinatesFromBar(barNumber: number) {
        for (let i = 0; i < this._scrollObjects.length; i++) {
            if (this._scrollObjects[i].barNumber === Math.floor(barNumber)) {
                // Get the left bound of the current bar and add 
                return this._scrollObjects[i].leftBound + (barNumber % 1) * this._scrollObjects[i].numberOfBeats * this.beatWidth;
            }
        }
        return -1;
    }

    /**
     * Should be implemented by subclasses to offset all children correctly.
     * Applies a given pixel offset to the x coordinate all children of this object.
     * 
     *
     * @protected
     * @param {number} pixelOffset The number of pixels to offset by
     * @memberof ScrollableTimeline
     */
    protected _offsetChildren(pixelOffset: number) {
        this._scrollObjectContainer.children.forEach(child => {
            child.x -= pixelOffset;
            
            // After offsetting, ensure the screen is still filled with bars
            this._checkBarsFillScreen();
        });
    }

    /**
     * Clears the screen and regenerates the timeline from a given bar number - places the first bar at startX.
     *
     * @private
     * @param {number} fromBar The bar to start generating from
     * @param {number} toBar The bar to which generation should at least run to
     * @memberof ScrollableTimeline
     */
    protected _regenerateTimeline(fromBar: number, toBar?: number) {
        let currentBar = fromBar;
        // Clear existing timeline
        while (this._scrollObjects.length > 0) {
            this._returnScrollableBar(this._scrollObjects[0]);
            this._scrollObjects.splice(0, 1);
        }

        // Generate new timeline
        let currentXPosition = this.startX;
        while (currentXPosition < this.endX) {
            let bar = this._initialiseScrollableBar(currentXPosition, currentBar, true);
            this._scrollObjects.push(bar);
            currentBar++;
            currentXPosition = bar.rightBound;
        }

        if (toBar != undefined) {
            while (currentBar <= toBar) {
                let bar = this._initialiseScrollableBar(currentXPosition, currentBar, true);
                this._scrollObjects.push(bar);
                currentBar++;
                currentXPosition = bar.rightBound;
            }
        }
    }

    /**
     * Ensures the the screen is filled with scrollable objects (both to the left and right of the existing bars)
     *
     * @private
     * @memberof ScrollableTimeline
     */
    protected _checkBarsFillScreen() {
        // Fill left (to 0)
        while (this._scrollObjects[0].leftBound > this.startX && this._scrollObjects[0].barNumber != 0) {
            let bar = this._initialiseScrollableBar(this._scrollObjects[0].leftBound, this._scrollObjects[0].barNumber - 1, false);
            this._scrollObjects.splice(0, 0, bar);
        }
        // Fill right
        while (this._scrollObjects[this._scrollObjects.length - 1].rightBound < this.endX) {
            let bar = this._initialiseScrollableBar(this._scrollObjects[this._scrollObjects.length - 1].rightBound, this._scrollObjects[this._scrollObjects.length - 1].barNumber + 1, true);
            this._scrollObjects.push(bar);
        }
    }

    /**
     * Initialises a new scrollable object with the given values, and generates any events that exist at this bar.
     *
     * @protected
     * @param {number} xPosition The x coordinate to initialise the new bar at
     * @param {number} barNumber The number for this bar
     * @param {boolean} [leftSide=true] Whether the x coordinate represents the left bound of that bar (use false if the bar should be placed to the left of the x coordinate)
     * @returns {ScrollableBar}
     * @memberof ScrollableTimeline
     */
    protected abstract _initialiseScrollableBar(xPosition: number, barNumber: number, leftSide : boolean);
    
    /**
     * Returns a bar object to the pool
     *
     * @protected
     * @param {ScrollableBar} instance
     * @memberof ScrollableTimeline
     */
    protected _returnScrollableBar(instance : ScrollableBar) {
        instance.visible = false;
        this._objectPool.returnObject(instance);
    }
}