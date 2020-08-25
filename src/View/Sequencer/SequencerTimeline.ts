import * as PIXI from "pixi.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { TimelineMode, MouseClickType, ClickState } from "../Shared/Enums.js";
import { NoteUITrack } from "../UIObjects/UITrack.js";
import { TrackTimelineEvent } from "../Shared/TrackTimelineEvent.js";

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
        this.addChild(this._newEventGraphics);

        this._regenerateTimeline(0);
    }

    get contentHeight() {
        return this._contentHeight;
    }

    protected _initialiseTrackTimelineEvents() {
        // Placeholder
    }
}