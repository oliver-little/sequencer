import * as PIXI from "pixi.js";
import { UIFonts, UIColors } from "./UITheme.js";
import { ScrollableTimeline } from "./ScrollableTimeline.js";

/**
 * Adds a permanent header to ScrollableBar
 *
 * @export
 * @class Bar
 * @extends {ScrollableBar}
 */
export class BarHeader extends PIXI.Container {
    private _headerText: PIXI.Text;
    private _headerGraphics: PIXI.Graphics;

    constructor() {
        super();
        this._headerText = new PIXI.Text("", UIFonts.trackFont);
        this._headerText.x = 12;
        this._headerText.y = 10;
        this._headerGraphics = new PIXI.Graphics();
        this.addChild(this._headerGraphics, this._headerText);
    }

    public initialise(x : number, width : number, barNumber : number) : BarHeader {
        this.x = x;
        this._headerGraphics.clear();
        this._headerGraphics.beginFill(UIColors.bgColor)
                            .drawRect(1, 0, width, 38)
                            .endFill()
                            .beginFill(UIColors.fgColor)
                            .drawRect(1, 0, 2, 40)
                            .drawRect(1, 38, width, 2)
                            .endFill();
                            

        // Add 1 to bar number display text because indexing and calculations start from 0.
        this._headerText.text = (barNumber+1).toString();
        return this;
    }
}