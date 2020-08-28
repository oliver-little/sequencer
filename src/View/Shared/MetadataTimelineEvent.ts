import * as PIXI from "pixi.js";
import { MouseTypeContainer } from "./InteractiveContainer";
import { MetadataEvent } from "../../Model/Notation/SongEvents";
import { MouseClickType } from "./Enums";
import { UIColors } from "./UITheme";
import { ScrollableTimeline } from "./ScrollableTimeline";


export class MetadataTimelineEvent extends MouseTypeContainer {
    
    static diamondSize = 10;

    public event : MetadataEvent;
    public timeline : ScrollableTimeline;

    private _graphics : PIXI.Graphics;

    constructor(timeline : ScrollableTimeline, event : MetadataEvent, y : number) {
        super();
        this.timeline = timeline;
        this.event = event;


        this._graphics = new PIXI.Graphics();
        let diamondSize = MetadataTimelineEvent.diamondSize;
        this._graphics.beginFill(UIColors.metadataEventColor)
            .moveTo(0, 0).lineTo(diamondSize/2, diamondSize/2).lineTo(0, diamondSize).lineTo(-diamondSize/2, diamondSize/2).lineTo(0, 0)
            .endFill();
        this.addChild(this._graphics);

        this.reinitialise(y);
    }

    public reinitialise(y? : number) {
        if (y != undefined) {
            this.y = y;
        }
        this.x = this.timeline.getTimelineEventX(this.event.startPosition) + 2;
    }

    public pointerUpClickHandler(event : PIXI.InteractionEvent) {
        console.log("clicked metaevent");
        if (this._mouseClickType == MouseClickType.LeftClick) {
            let editDiv = document.createElement("div");
            let testText = document.createElement("p");
            testText.innerHTML = "This is a test";
            editDiv.appendChild(testText)
            editDiv.style.position = "absolute";
            editDiv.style.top = this.y.toString();
            editDiv.style.left = this.x.toString();
            document.getElementById("applicationContainer").appendChild(editDiv);
        }
    }
}