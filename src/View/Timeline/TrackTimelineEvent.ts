import * as PIXI from "pixi.js";
import { UIColors } from "../UIColors.js";
import { TrackList } from "./TrackList.js";
import { NoteEvent } from "../../Model/Notation/SongEvents.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { SongTimeline } from "./SongTimeline.js";
import { UITrack, NoteUITrack } from "../UIObjects/UITrack.js";

export enum EventDragType {
    Beat,
    HalfBeat,
    QuarterBeat,
    EighthBeat,
    None
}

export abstract class TrackTimelineEvent extends PIXI.Container {

    static borderWidth = 5;

    static dragType : EventDragType = EventDragType.Beat;

    public timeline : SongTimeline;
    public assignedWidth : number;
    public track : UITrack;

    public isDragging = false;
    public eventStartPosition : number;

    protected _selected : boolean = false;
    protected _contentGraphics : PIXI.Graphics;
    protected _selectedGraphics : PIXI.Graphics;

    private _startPointerPosition : PIXI.Point;
    private _startXPosition : number;

    constructor(timeline : SongTimeline, x : number, width : number, track : UITrack, eventStartPosition : number) {
        super();
        this.x = x;
        this.y = track.startY + TrackList.trackStartOffset;
        this.timeline = timeline;
        this.assignedWidth = width;
        this.track = track;
        this.eventStartPosition = eventStartPosition;

        this._contentGraphics = new PIXI.Graphics();
        this._selectedGraphics = new PIXI.Graphics();
        this._selectedGraphics.zIndex = 1;
        this.addChild(this._contentGraphics, this._selectedGraphics);
    }

    get leftBound() {
        return this.x;
    }

    get rightBound() {
        return this.x + this.width;
    }

    get selected() {
        return this._selected;
    }

    set selected(value : boolean) {
        console.log("Selected: " + value);
        this._selected = value;
        this.redraw(this._selected);
    }

    /**
     * Redraws the current TrackTimelineEvent
     *
     * @memberof TrackTimelineEvent
     */
    public redraw(selected : boolean = this._selected) {
        this._contentGraphics.clear();
        this._selectedGraphics.clear();
        if (selected) {
            let border = TrackTimelineEvent.borderWidth;
            this._contentGraphics.beginFill(UIColors.trackEventColor)
                .drawRect(border, border, this.assignedWidth - border * 2, this.track.height - border * 2)
                .endFill();
            this._selectedGraphics.beginFill(UIColors.trackEventSelectedColor)
                .drawRect(0, 0, this.assignedWidth, this.track.height)
                .endFill()
                .beginHole()
                .drawRect(border, border, this.assignedWidth - border * 2, this.track.height - border * 2)
                .endHole();
        }
        else {
            this._contentGraphics.beginFill(UIColors.trackEventColor)
                .drawRect(0, 0, this.assignedWidth, this.track.height)
                .endFill();
        }
    }

    /**
     * Handler for pointer down events
     *
     * @public
     * @param {PIXI.InteractionEvent} event
     * @memberof TrackTimelineEvent
     */
    public pointerDownHandler(event : PIXI.InteractionEvent) {
        this.isDragging = true;
        
        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._startXPosition = this.x;
    }

    /**
     * Handler for pointer move events
     *
     * @public
     * @param {PIXI.InteractionEvent} event
     * @memberof TrackTimelineEvent
     */
    public pointerMoveHandler(event : PIXI.InteractionEvent) {
        if (this.isDragging) {
            event.stopPropagation();
            // Calculate snapped moveDelta
            let moveDelta = this.snapToDragType(event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x);

            // Check if snapped moveDelta would put the event start before 0, if so correct for it
            let newEventStart = this.timeline.metadata.positionQuarterNoteToBeats(this.eventStartPosition) + (moveDelta / this.timeline.beatWidth);
            if (newEventStart < 0) {
                moveDelta -= newEventStart * this.timeline.beatWidth;
            } 
            // Update the x position
            this.x = this._startXPosition + moveDelta;
        }
    }

    /**
     * Handler for pointer up events
     *
     * @public
     * @param {PIXI.InteractionEvent} event
     * @memberof TrackTimelineEvent
     */
    public pointerUpHandler(event : PIXI.InteractionEvent) {
        if (this.isDragging) {
            event.stopPropagation();
            this.isDragging = false;

            let dragDistance = this.snapToDragType(event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x);
            let newEventStart = this.timeline.metadata.positionQuarterNoteToBeats(this.eventStartPosition) + (dragDistance / this.timeline.beatWidth);
            if (newEventStart < 0) {
                dragDistance -= newEventStart * this.timeline.beatWidth;
            } 
            this.dragHandler(dragDistance);
        }
    }

    /**
     * Called once a drag event finishes, should be implemented by subclasses to update the model based on what the drag event changed.
     *
     * @protected
     * @abstract
     * @param {number} dragDistance
     * @memberof TrackTimelineEvent
     */
    protected abstract dragHandler(dragDistance : number);

    private snapToDragType(value : number) {
        switch (TrackTimelineEvent.dragType) {
            case EventDragType.Beat:
                return value - (value % this.timeline.beatWidth);
            case EventDragType.HalfBeat:
                return value - (value % (this.timeline.beatWidth / 2));
            case EventDragType.QuarterBeat:
                return value - (value % (this.timeline.beatWidth / 4));
            case EventDragType.EighthBeat:
                return value - (value % (this.timeline.beatWidth / 8));
            case EventDragType.None:
                return value;
        }
    }
}

export class NoteGroupTimelineEvent extends TrackTimelineEvent {

    public track : NoteUITrack;

    private _noteGroup : number;
    private _notes : NoteEvent[];

    /**
     * Creates an instance of NoteGroupTimelineEvent.
     * @param {SongTimeline} timeline The timeline object this event is part of
     * @param {number} x The x position of this object (pixels)
     * @param {number} width The width of this object (pixels)
     * @param {NoteUITrack} track The UITrack this event represents one of the note groups of
     * @param {number[]} noteGroup Index of the note group in track.noteGroups this object represents
     * @memberof NoteGroupTimelineEvent
     */
    constructor(timeline : SongTimeline, x : number, width : number, track : NoteUITrack, noteGroup : number) {
        super(timeline, x, width, track, track.noteGroups[noteGroup][0]);
        this._noteGroup = noteGroup;
        this.redraw();
    }

    public redraw(selected : boolean = this._selected) {
        super.redraw(selected);
        let noteGroup = this.track.noteGroups[this._noteGroup];
        this._notes = this.track.track.timeline.getEventsBetweenTimes(noteGroup[0], noteGroup[1]) as NoteEvent[];
        this.setNotes(this._notes, this.track.track.highestPitch, this.track.track.lowestPitch, noteGroup);
    
    }

    public setNotes(notes : NoteEvent[], highestNote : string, lowestNote : string, noteGroup : number[]) {
        // TODO: border around all content
        // Borders around all notes, currently notes merge together
        let noteRange = NoteHelper.distanceBetweenNotes(highestNote, lowestNote) + 1;

        let start = noteGroup[0];
        let end = noteGroup[1];
        let noteHeight = (this.track.height - TrackTimelineEvent.borderWidth * 2) / noteRange;
        let positionMap = position => {
            return (position - start)/(end - start);
        }
        this._contentGraphics.beginFill(UIColors.trackEventHighlightColor);
        notes.forEach(note => {
            let startX = positionMap(note.startPosition) * this.assignedWidth;
            let endX = positionMap(note.startPosition + note.duration) * this.assignedWidth;
            this._contentGraphics.drawRect(startX, 
                          NoteHelper.distanceBetweenNotes(highestNote, note.pitchString) * noteHeight + TrackTimelineEvent.borderWidth, 
                          endX - startX - 2, 
                          noteHeight);
        });
        this._contentGraphics.endFill();
    }

    protected dragHandler(dragDistance : number) {
        let beatChange = dragDistance / this.timeline.beatWidth;
        let metadata = this.timeline.metadata;
        // Update note position by converting to beats, adding the change, then converting back.
        this._notes.forEach(note => {
            note.startPosition = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(note.startPosition) + beatChange);
        });
        this.track.noteGroups[this._noteGroup][0] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(this.track.noteGroups[this._noteGroup][0]) + beatChange);
        this.track.noteGroups[this._noteGroup][1] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(this.track.noteGroups[this._noteGroup][1]) + beatChange);
        this.eventStartPosition = this.track.noteGroups[this._noteGroup][0];
        this.redraw();
    }
}