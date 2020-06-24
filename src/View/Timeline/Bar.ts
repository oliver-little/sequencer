import * as PIXI from "pixi.js";

export class BarTimeline extends PIXI.Container {
    constructor() {
        super();
        let bar = new Bar();
        bar.initialise();
        this.addChild(bar);
    }
}

class Bar extends PIXI.Container  {

    constructor() {
        super();
    }

    public initialise() {
        
    }
}