import * as PIXI from "pixi.js";
import { UIFonts, UIColors, UIPositioning } from "../Settings/UITheme.js";
import { ScrollableTimeline } from "./ScrollableTimeline.js";
import { MetadataTimelineEvent } from "./MetadataTimelineEvent.js";

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
    private _metadataTimelineEvent : MetadataTimelineEvent;

    constructor(timeline : ScrollableTimeline) {
        super();
        this._headerText = new PIXI.Text("", UIFonts.trackFont);
        this._headerText.x = 12;
        this._headerText.y = 10;
        this._headerGraphics = new PIXI.Graphics();
        this._metadataTimelineEvent = new MetadataTimelineEvent(timeline);
        this.addChild(this._headerGraphics, this._headerText, this._metadataTimelineEvent);
    }

    public initialise(x : number, width : number, barNumber : number, metadataEventPosition : number, metadataEventActive : boolean) : BarHeader {
        this.setX(x);
        this._headerGraphics.clear();
        this._headerGraphics.beginFill(UIColors.bgColor)
                            .drawRect(1, 0, width, UIPositioning.timelineHeaderHeight)
                            .endFill()
                            .beginFill(UIColors.fgColor)
                            .drawRect(1, 0, 2, 40)
                            .drawRect(1, UIPositioning.timelineHeaderHeight, width, 2)
                            .endFill();
                            
        // Add 1 to bar number display text because indexing and calculations start from 0.
        this._headerText.text = (barNumber+1).toString();
        this._metadataTimelineEvent.initialise(metadataEventPosition, metadataEventActive);
        return this;
    }

    public setX(value : number) {
        this.x = value;
    }

    public setVisible(value : boolean) {
        this.visible = value;
        this._metadataTimelineEvent.setVisible(value);
    }
}