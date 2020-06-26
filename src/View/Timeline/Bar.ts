import * as PIXI from "pixi.js";
import { PointHelper } from "../../HelperModules/PointHelper.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";

export class BarTimeline extends PIXI.Container {

    public viewWidth : number;
    public viewHeight : number;

    private _objectPool : ObjectPool<Bar>;
    private _bars : Bar[];

    private _startX : number;

    private _startPointerPosition : PIXI.Point;
    private _startXPosition : number;
    private _isDragging : boolean;

    constructor(x : number, y : number, viewWidth : number, viewHeight : number) {
        super();
        this.x = x;
        this._startX = x;
        this.y = y;
        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;

        this._objectPool = new ObjectPool(Bar);
        this._bars = [];

        let currentXPosition = 0
        let barNumber = 0
        // TODO: don't base off renderer width, take a width and height value
        while (currentXPosition < this.viewWidth) {
            let bar = new Bar();
            bar.initialise(currentXPosition, this.viewHeight, barNumber);
            this.addChild(bar);
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
            
            if (this.x > this._startX) {
                this.x = this._startX;
            }

            let rightSideOffset = this.x + this._bars[this._bars.length - 1].rightBound - this.viewWidth;
            if (rightSideOffset < 100) {
                let bar = this._getBar();
                bar.initialise(this._bars[this._bars.length - 1].rightBound, this.viewHeight, this._bars[this._bars.length - 1].barNumber+1);
                this._bars.push(bar);
                console.log("added to right: " + bar.barNumber);
            }
            else if (rightSideOffset > 800) {
                let bar = this._bars.pop();
                this._returnBar(bar);
                console.log("removed from right: " + bar.barNumber);
            }
            else {
                let leftSideOffset = this._startX - this.x - this._bars[0].leftBound;
                if (leftSideOffset < 100 && this._bars[0].barNumber != 0) {
                    let bar = this._getBar();
                    bar.initialise(this._bars[0].leftBound, this.viewHeight, this._bars[0].barNumber-1, false);
                    this._bars.splice(0, 0, bar);
                    console.log("added to left: " + bar.barNumber);
                }
                else if (leftSideOffset > 800) {
                    let bar = this._bars.splice(0, 1)[0];
                    this._returnBar(bar);
                    console.log("removed from left: " + bar.barNumber);
                }
            }
        }
    }

    public pointerUpHandler(event: PIXI.InteractionEvent) {
        this._startXPosition = undefined;
        this._startPointerPosition = undefined;
        this._isDragging = false;
        /*let xOffset = this._startX - this.x;
        for(let i = 0; i < this._bars.length; i++) {
            this._bars[i].x -= xOffset;
        }
        this.x = this._startX;*/
    }

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

    private _returnBar(instance : Bar) {
        instance.visible = false;
        this._objectPool.returnObject(instance);
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

    public initialise(x : number, height : number, barNumber = 0, leftSide = true) : Bar {
        if (leftSide) {
            this.x = x;
        }
        else {
            this.x = x - Bar.barWidth * 4;
        }

        this._graphics.beginFill(Bar.barColor);
        this._graphics.drawRect(0, 0, 2, height);
        for (let i = 1; i < 5; i++) {
            this._graphics.drawRect(0 + (Bar.barWidth * i), 0, 1, height);
        }
        this._graphics.endFill();

        this._barNumber = barNumber;
        this._barText.text = barNumber.toString();
        this._barText.x = 12;
        this._barText.y = 10;

        return this;
    }
}