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
    private _editDiv : HTMLDivElement;

    constructor(timeline : ScrollableTimeline, event : MetadataEvent, y : number) {
        super();
        this.timeline = timeline;
        this.timeline.dragStart.addListener(this._objectMoved.bind(this));
        this.event = event;

        this._editDiv = document.createElement("div");
        this._editDiv.style.top = this.y.toString();
        this._editDiv.style.display = "none";
        this._editDiv.style.position = "absolute";
        let testText = document.createElement("p");
        testText.innerHTML = "This is a test";
        this._editDiv.appendChild(testText);
        document.getElementById("applicationContainer").appendChild(this._editDiv);

        this._graphics = new PIXI.Graphics();
        let diamondSize = MetadataTimelineEvent.diamondSize;
        this._graphics.beginFill(UIColors.metadataEventColor)
            .moveTo(0, 0).lineTo(diamondSize/2, diamondSize/2).lineTo(0, diamondSize).lineTo(-diamondSize/2, diamondSize/2).lineTo(0, 0)
            .endFill();
        this.addChild(this._graphics);

        this.reinitialise(y);
    }

    set x (value : number) {
        super.x = value;
        this._objectMoved();
    }

    get x() : number {
        return super.x;
    }

    public reinitialise(y? : number) {
        if (y != undefined) {
            this.y = y;
        }
        this.x = this.timeline.getTimelineEventX(this.event.startPosition) + 2;
    }

    public pointerUpClickHandler(event : PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick) {
            this._editDiv.style.display = "block";
            this._editDiv.style.left = this.x.toString();
        }
    }

    private _objectMoved() {
        this._editDiv.style.display = "none";
    }
}