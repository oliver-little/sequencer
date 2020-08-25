import * as PIXI from "pixi.js";
import { ScrollableTimeline, ClickState } from "../Shared/ScrollableTimeline.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { ScrollableBar } from "../Shared/ScrollableBar.js";
import { TimelineMode } from "../Shared/Enums.js";
import { NoteUITrack } from "../UIObjects/UITrack.js";

enum NoteLength {
    Bar,
    Half,
    Quarter,
    Eighth, 
    Sixteenth,
    ThirtySecond
}

export class SequencerTimeline extends ScrollableTimeline {

    static noteHeight = 20;

    public timelineMode: TimelineMode = TimelineMode.Edit;
    public noteLength: NoteLength = NoteLength.Quarter;

    public track : NoteUITrack;

    // Scrolling variables
    protected _startVerticalScrollPosition: number;

    protected _contentHeight : number;
    protected _newEventGraphics: PIXI.Graphics;

    constructor(startX : number, endX : number, endY : number, contentHeight : number, songManager: SongManager, track: NoteUITrack) {
        super(startX, endX, 0, endY, songManager);
        this.track = track;
        this._contentHeight = contentHeight;

        this._newEventGraphics = new PIXI.Graphics();

        this._regenerateTimeline(0);
    }

    get contentHeight() {
        return this._contentHeight;
    }

    /*public pointerMoveHandler(event : PIXI.InteractionEvent) {
        this._newEventGraphics.visible = false;
        if (this._clickState == ClickState.Dragging) {
            super.pointerMoveHandler(event);
        }
        else if (this.timelineMode == TimelineMode.Edit) {

        }
    }

    public pointerUpClickHandler(event : PIXI.InteractionEvent) {
        if (this.timelineMode == TimelineMode.Edit) {
            
        }
    }*/
}