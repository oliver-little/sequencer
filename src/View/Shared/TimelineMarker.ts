import * as PIXI from "pixi.js";
import { UIColors } from "../Settings/UITheme.js";

export class TimelineMarker extends PIXI.Graphics {
    constructor() {
        super();
    }

    public redraw(x : number, y : number, width : number, height : number) {
        this.clear();
        this.beginFill(UIColors.timelineMarkerColor)
            .drawPolygon([new PIXI.Point(x, y), new PIXI.Point(x-4, y-4), new PIXI.Point(x+width+5, y-4), new PIXI.Point(x+width, y)])
            .drawRect(x, y, width, height)
            .endFill();
    }
}