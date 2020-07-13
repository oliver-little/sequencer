import * as PIXI from "pixi.js";
import { UIColors } from "../UIColors.js";
import { SongTimeline } from "./SongTimeline";

export class Bar extends PIXI.Container {

    private _graphics: PIXI.Graphics;
    private _barText: PIXI.Text;
    private _barNumber : number;
    private _numberOfBeats : number;

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

    // THIS IS ONE LESS THAN THE BAR NUMBER THAT IS DISPLAYED TO THE USER
    get barNumber() {
        return this._barNumber;
    }

    get numberOfBeats() {
        return this._numberOfBeats;
    }

    public initialise(x : number, height : number, barNumber : number, numberOfBeats : number, widthScale = 1, leftSide = true) : Bar {
        let scaledBeatWidth = SongTimeline.beatWidth * widthScale;
        if (leftSide) {
            this.x = x;
        }
        else {
            this.x = x - scaledBeatWidth * numberOfBeats;
        }

        this._graphics.clear();
        this._graphics.beginFill(UIColors.fgColor);
        this._graphics.drawRect(0, 0, 2, height);
        for (let i = 1; i < numberOfBeats + 1; i++) {
            this._graphics.drawRect(scaledBeatWidth * i, 0, 1, height);
        }
        this._graphics.endFill();

        this._barNumber = barNumber;
        this._numberOfBeats = numberOfBeats;
        // Add 1 to bar number display text because indexing and calculations start from 0.
        this._barText.text = (barNumber+1).toString();
        this._barText.x = 12;
        this._barText.y = 10;

        return this;
    }
}