import * as PIXI from "pixi.js";
import { UIColors } from "../UIColors";

export class TimelineMarker extends PIXI.Graphics {
    constructor() {
        super();
    }

    public redraw(x : number, y : number, width : number, height : number) {
        this.clear();
        this.beginFill(UIColors.timelineMarkerColor)
            .drawRect(x, y, width, height)
            .endFill();
    }
}