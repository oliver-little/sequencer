import * as PIXI from "pixi.js";

export class BarTimeline extends PIXI.Container {

    private _renderer : PIXI.Renderer;

    constructor(renderer : PIXI.Renderer) {
        super();
        this._renderer = renderer;
        let bar = new Bar();
        bar.initialise(this._renderer, 5);
        this.addChild(bar);
    }
}

class Bar extends PIXI.Container {

    public static barWidth = 50;

    private _graphics : PIXI.Graphics;

    constructor() {
        super();
        this._graphics = new PIXI.Graphics();
        this.addChild(this._graphics);
    }

    public initialise(renderer : PIXI.Renderer, startX : number) {
        this._graphics.beginFill(0xFFFFFF);
        for (let i = 0; i < 4; i++) {
            this._graphics.drawRect(startX + (Bar.barWidth * i), 0, 2, renderer.height);
        }
        this._graphics.endFill();
    }
}