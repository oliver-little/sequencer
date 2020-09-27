import * as PIXI from "pixi.js";
import { MouseTypeContainer } from "../Shared/InteractiveContainer.js";
import { MouseClickType } from "../Shared/Enums.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { UIColors, UIPositioning } from "../Shared/UITheme.js";

export class NoteGroupMarker extends PIXI.Container {

    static triangleSize = 10;
    static lineHeight = 4;

    public noteGroup : number[];
    public timeline : ScrollableTimeline;

    private _leftHandle : NoteGroupHandle;
    private _rightHandle : NoteGroupHandle;
    private _graphics : PIXI.Graphics;

    constructor(timeline : ScrollableTimeline) {
        super();
        this.timeline = timeline;
        this.y = UIPositioning.timelineHeaderHeight - NoteGroupMarker.triangleSize;

        this._leftHandle = new NoteGroupHandle();
        this._rightHandle = new NoteGroupHandle();
        this._graphics = new PIXI.Graphics();

        this.addChild(this._graphics, this._leftHandle, this._rightHandle);
    }

    public reinitialise(noteGroup : number[], y? : number) {
        this.noteGroup = noteGroup;
        if (y != undefined) {
            this.y = y;
        }

        let [x, width] = this.timeline.getTimelineEventXWidth(this.noteGroup[0], this.noteGroup[1]);
        this.x = x + 1;
        this.redraw(width);
    }

    public redraw(width : number) {
        let triangleSize = NoteGroupMarker.triangleSize;
        this._graphics.clear()
            .beginFill(UIColors.trackEventColor)
            .drawRect(0, triangleSize - NoteGroupMarker.lineHeight, width, NoteGroupMarker.lineHeight)
            .moveTo(0, 0).lineTo(0, triangleSize).lineTo(triangleSize, triangleSize).lineTo(0, 0)
            .moveTo(width, 0).lineTo(width, triangleSize).lineTo(width - triangleSize, triangleSize).lineTo(width, 0)
            .endFill();
    }
}

class NoteGroupHandle extends MouseTypeContainer {
    constructor() {
        super();
    }
}