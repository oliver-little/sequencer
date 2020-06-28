import * as PIXI from "pixi.js";
import { PointHelper } from "../../HelperModules/PointHelper.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import SongMetadata from "../../Model/SongManagement/SongMetadata.js";

export class BarTimeline extends PIXI.Container {

    public startX : number;
    public endX : number;
    public endY : number;

    public metadata : SongMetadata;

    private _objectPool : ObjectPool<Bar>;
    private _bars : Bar[];

    private barScale = 1;

    private _startPointerPosition : PIXI.Point;
    private _startXPosition : number;
    private _isDragging : boolean;

    /**
     * Creates an instance of BarTimeline.
     * @param {number} x The x coordinate in the parent where this timeline should start (pixels)
     * @param {number} viewWidth The width of the view (pixels)
     * @param {number} viewHeight The height of the view (pixels)
     * @memberof BarTimeline
     */
    constructor(x : number, viewWidth : number, viewHeight : number, metadata : SongMetadata) {
        super();
        this.startX = x;
        this.endX = viewWidth;
        this.endY = viewHeight;
        this.metadata = metadata;

        this._objectPool = new ObjectPool(Bar);
        this._bars = [];

        let currentXPosition = this.startX;
        let barNumber = 0;
        while (currentXPosition < this.endX) {
            let bar = this._initialiseBar(currentXPosition, barNumber);
            this._bars.push(bar);
            currentXPosition = bar.rightBound;
            barNumber++;
        }
    }

    get isDragging() {
        return this._isDragging;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._startXPosition = this.x;
        this._isDragging = true;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        if (this._isDragging) {
            let moveDelta = event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x;
            this.x = this._startXPosition + moveDelta;
            
            // This solution is used because the container's x is reset to 0 after each scroll event,
            // but while scrolling occurs the container's position rather than the child objects' positions is changed.
            // Therefore, we have to find out if bar 0 is past where the timeline should start.
            // If it is, calculate the offset required to position bar 0 at the start of the timeline.
            if (this._bars[0].barNumber === 0 && this.x + this._bars[0].leftBound > this.startX) {
                this.x = -this._bars[0].leftBound + this.startX;
            }

            // While loops are used in this section because extremely quick, large scrolls can cause bars to be missing

            // Check right side for adding or removing bars offscreen
            let rightSideOffset = this.x + this._bars[this._bars.length - 1].rightBound - this.endX;
            while (rightSideOffset < 100) { // If the right side is too close, need to add a new bar.
                let bar = this._initialiseBar(this._bars[this._bars.length - 1].rightBound, this._bars[this._bars.length - 1].barNumber+1);
                this._bars.push(bar); // Add it to the list of bars, and recalculate where the right side is.
                rightSideOffset = this.x + this._bars[this._bars.length - 1].rightBound - this.endX;
            }
            while (rightSideOffset > 800) {
                let bar = this._bars.pop();
                this._returnBar(bar);

                rightSideOffset = this.x + this._bars[this._bars.length - 1].rightBound - this.endX;
            }

            // Check left side for adding or removing bars offscreen
            let leftSideOffset = this.startX - this.x - this._bars[0].leftBound;
            while (leftSideOffset < 100 && this._bars[0].barNumber != 0) {
                let bar = this._initialiseBar(this._bars[0].leftBound, this._bars[0].barNumber-1, false);
                this._bars.splice(0, 0, bar);
                leftSideOffset = this.startX - this.x - this._bars[0].leftBound;
            }
            while (leftSideOffset > 800) {
                let bar = this._bars.splice(0, 1)[0];
                this._returnBar(bar);
                leftSideOffset = this.startX - this.x - this._bars[0].leftBound;
            } 
        }
    }

    public pointerUpHandler(event: PIXI.InteractionEvent) {
        this._startXPosition = undefined;
        this._startPointerPosition = undefined;
        this._isDragging = false;
        for(let i = 0; i < this._bars.length; i++) {
            this._bars[i].x += this.x;
        }
        this.x = 0;
    }

    public mouseWheelHandler(event : WheelEvent) {
        // Need to:
        // Calculate which bar is at the mouse position, and the position within that bar.
        // Change the scaling, and regenerate all bars on the screen with the new scaling (multiply default bar width by the scaling value)
        // Scroll the new bars to be at the same position (under the mouse) as before.
        this.barScale = Math.max(0.5, Math.min(5.0, this.barScale - event.deltaY/1000));
        console.log(this.barScale);
        this._regenerateBars(this._bars[0].barNumber, this._bars[this._bars.length - 1].barNumber);
    }


    /**
     * Clears the screen and regenerates all bars between two numbers - places the first bar at startX.
     *
     * @private
     * @param {number} fromBar The bar to start generating from
     * @param {number} toBar The bar to finish generating at
     * @memberof BarTimeline
     */
    private _regenerateBars(fromBar : number, toBar : number) {
        while(this._bars.length > 0) {
            this._returnBar(this._bars[0]);
            this._bars.splice(0, 1);
        }

        let currentXPosition = this.startX;
        for (let i = fromBar; i < toBar+1; i++) {
            let bar = this._initialiseBar(currentXPosition, i)
            this._bars.push(bar);
            currentXPosition = bar.rightBound;
        }
    }

    /**
     * Gets a pooled Bar object
     *
     * @private
     * @returns {Bar}
     * @memberof BarTimeline
     */
    private _getBar() : Bar {
        if (this._objectPool.objectCount > 0) {
            let bar = this._objectPool.getObject();
            bar.visible = true;
            return bar;
        }
        else {
            let bar = new Bar();
            this.addChild(bar);
            return bar;
        }
    }

    /**
     * Returns a bar object to the pool
     *
     * @private
     * @param {Bar} instance
     * @memberof BarTimeline
     */
    private _returnBar(instance : Bar) {
        instance.visible = false;
        this._objectPool.returnObject(instance);
    }

    /**
     * Initialises a new bar with the given values, using the metadata to get the number of beats in the bar.
     *
     * @private
     * @param {number} xPosition The x coordinate to initialise the new bar at
     * @param {number} barNumber The number for this bar
     * @param {boolean} [leftSide=true] Whether the x coordinate represents the left bound of that bar (use false if the bar should be placed to the left of the x coordinate)
     * @returns {Bar}
     * @memberof BarTimeline
     */
    private _initialiseBar(xPosition : number, barNumber : number, leftSide = true) : Bar {
        let bar = this._getBar();
        let quarterNotePosition = this.metadata.positionBarsToQuarterNote(barNumber);
        let numberOfBeats = this.metadata.getTimeSignature(quarterNotePosition)[0];
        bar.initialise(xPosition, this.endY, barNumber, numberOfBeats, this.barScale, leftSide);
        return bar;
    }
}

class Bar extends PIXI.Container {

    public static barWidth = 50;
    public static barColor = 0x5F5F5F;

    private _graphics: PIXI.Graphics;
    private _barText: PIXI.Text;
    private _barNumber : number;

    constructor() {
        super();
        this._graphics = new PIXI.Graphics();
        this._barText = new PIXI.Text("", { fontFamily: "Arial", fontSize: 15, fill: 0xFFFFFF, align: "left" });
        this.addChild(this._graphics);
        this.addChild(this._barText);
    }

    get leftBound() {
        return this.x;
    }

    get rightBound() {
        return this.x + this.width;
    }

    get barNumber() {
        return this._barNumber;
    }

    public initialise(x : number, height : number, barNumber : number, numberOfBeats : number, widthScale = 1, leftSide = true) : Bar {
        let newBarWidth = Bar.barWidth * widthScale;
        if (leftSide) {
            this.x = x;
        }
        else {
            this.x = x - newBarWidth * numberOfBeats;
        }

        this._graphics.clear();
        this._graphics.beginFill(Bar.barColor);
        this._graphics.drawRect(0, 0, 2, height);
        for (let i = 1; i < numberOfBeats + 1; i++) {
            this._graphics.drawRect(newBarWidth * i, 0, 1, height);
        }
        this._graphics.endFill();

        this._barNumber = barNumber;
        // Add 1 to bar number display text because indexing and calculations start from 0.
        this._barText.text = (barNumber+1).toString();
        this._barText.x = 12;
        this._barText.y = 10;

        return this;
    }
}