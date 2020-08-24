import * as PIXI from "pixi.js";
import { UIColors } from "../Shared/UITheme.js";
import { BarHeader } from "./ScrollableBarHeader.js";

export class ScrollableBar extends PIXI.Container {

    protected _header : BarHeader;
    protected _graphics: PIXI.Graphics;
    protected _barNumber : number;
    protected _numberOfBeats : number;

    protected _verticalScrollPosition : number;

    constructor(headerContainer : PIXI.Container) {
        super();
        this._graphics = new PIXI.Graphics();
        this.addChild(this._graphics);

        this._header = new BarHeader();
        headerContainer.addChild(this._header);
    }

    get x () {
        return super.x;
    }

    set x(value: number) {
        super.x = value;
        this._header.x = value;
    }

    get leftBound() {
        return this.x;
    }

    get rightBound() {
        return this.x + this.width;
    }

    // THIS IS ONE LESS THAN THE BAR NUMBER THAT IS DISPLAYED TO THE USER
    get barNumber() {
        return this._barNumber;
    }

    get numberOfBeats() {
        return this._numberOfBeats;
    }

    /**
     * Stores the vertical scroll position of this bar (not the same as y coordinate)
     * This keeps the header of the object stationary while moving only the content vertically.
     *
     * @type {number}
     * @memberof ScrollableBar
     */
    get verticalScrollPosition() : number {
        return this._verticalScrollPosition;
    }

    set verticalScrollPosition(value : number) {
        this._verticalScrollPosition = value;
        this._graphics.y = this._verticalScrollPosition;
    }

    public initialise(x : number, height : number, barNumber : number, numberOfBeats : number, beatWidth : number, leftSide : boolean = true) : ScrollableBar {
        if (leftSide) {
            this.x = x;
        }
        else {
            this.x = x - beatWidth * numberOfBeats;
        }

        this._graphics.clear();
        this._graphics.beginFill(UIColors.fgColor);

        // Drawing the first line 1 pixel in fixes the bar draw drift.
        this._graphics.drawRect(1, 0, 2, height);
        for (let i = 1; i < numberOfBeats + 1; i++) {
            this._graphics.drawRect(beatWidth * i, 0, 1, height);
        }
        this._graphics.endFill();

        this._barNumber = barNumber;
        this._numberOfBeats = numberOfBeats;

        this._header.initialise(this.x, numberOfBeats * beatWidth, this.barNumber);

        return this;
    }

    public setVisible(value : boolean) {
        this.visible = value;
        this._header.visible = value;
    }
}