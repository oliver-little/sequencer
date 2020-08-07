import * as PIXI from "pixi.js";
import { UIColors } from "../UIColors.js";
import { TrackList } from "./TrackList.js";
import { NoteEvent, BaseEvent } from "../../Model/Notation/SongEvents.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { SongTimeline } from "./SongTimeline.js";
import { UITrack, NoteUITrack } from "../UIObjects/UITrack.js";


export abstract class TrackTimelineEvent extends PIXI.Container {

    static borderWidth = 3;
    static borderHeight = 2;
    static paddingHeight = 4;
    static selectedBorderWidth = 4;

    public timeline: SongTimeline;
    public assignedWidth: number;
    public track: UITrack;

    public eventStartPosition: number;
    public eventDuration: number

    protected _selected: boolean = false;
    protected _contentGraphics: PIXI.Graphics;
    protected _selectedGraphics: PIXI.Graphics;

    protected _assignedHeight : number;

    protected _startXPosition: number;

    /**
     *Creates an instance of TrackTimelineEvent.
     * @param {SongTimeline} timeline The timeline object this TrackTimelineEvent is part of
     * @param {number} x The x position this even should start at (pixels)
     * @param {number} width The width of this event (pixels)
     * @param {UITrack} track The UITrack this TrackTimelineEvent represents an event of
     * @param {number} eventStartPosition The start position of this event (quarter notes)
     * @param {number} eventDuration The duration of this event (quarter notes)
     * @memberof TrackTimelineEvent
     */
    constructor(timeline: SongTimeline, x: number, width: number, track: UITrack, eventStartPosition: number, eventDuration : number) {
        super();
        this.timeline = timeline;
        this.track = track;
        this.eventStartPosition = eventStartPosition;
        this.eventDuration = eventDuration;

        this._contentGraphics = new PIXI.Graphics();
        this._selectedGraphics = new PIXI.Graphics();
        this._selectedGraphics.zIndex = 1;
        this.addChild(this._contentGraphics, this._selectedGraphics);

        this.x = x + TrackTimelineEvent.borderWidth;
        this.assignedWidth = width - TrackTimelineEvent.borderWidth;
        this.y = track.startY + TrackList.trackStartOffset + TrackTimelineEvent.borderHeight;
    }

    /**
     * Reinitialises this TrackTimelineEvent in a new position
     *
     * @param {number} x The new x position (pixels)
     * @param {number} width The new width (pixels)
     * @memberof TrackTimelineEvent
     */
    public reinitialise(x : number, width : number) {
        this.x = x + TrackTimelineEvent.borderWidth;
        this.assignedWidth = width - TrackTimelineEvent.borderWidth;
        this.redraw();
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

    set selected(value: boolean) {
        this._selected = value;
        this.redraw(this._selected);
    }

    /**
     * Redraws the current TrackTimelineEvent 
     * (should be called when any variables relating to how this object should be drawn are changed)
     *
     * @memberof TrackTimelineEvent
     */
    public redraw(selected: boolean = this._selected) {
        this._assignedHeight = this.track.height - TrackTimelineEvent.borderHeight;

        this._contentGraphics.clear();
        this._selectedGraphics.clear();
        if (selected) {
            this._contentGraphics.beginFill(UIColors.trackEventColor)
                .drawRect(TrackTimelineEvent.paddingHeight, TrackTimelineEvent.paddingHeight, this.assignedWidth - TrackTimelineEvent.paddingHeight * 2, this._assignedHeight - TrackTimelineEvent.paddingHeight * 2)
                .endFill();
            this._selectedGraphics.beginFill(UIColors.trackEventSelectedColor)
                .drawRect(0, 0, this.assignedWidth, this._assignedHeight)
                .endFill()
                .beginHole()
                .drawRect(TrackTimelineEvent.selectedBorderWidth, TrackTimelineEvent.selectedBorderWidth, this.assignedWidth - TrackTimelineEvent.selectedBorderWidth * 2, this._assignedHeight - TrackTimelineEvent.selectedBorderWidth * 2)
                .endHole();
        }
        else {
            this._contentGraphics.beginFill(UIColors.trackEventColor)
                .drawRect(0, 0, this.assignedWidth, this._assignedHeight)
                .endFill();
        }
    }

    /**
     * Handler for pointer down events
     *
     * @public
     * @memberof TrackTimelineEvent
     */
    public pointerDownHandler() {
        this._startXPosition = this.x;
    }

    /**
     * Handler for pointer move events
     *
     * @public
     * @param {number} moveDelta Difference in x between start mouse position and current mouse position
     * @memberof TrackTimelineEvent
     */
    public pointerMoveHandler(moveDelta: number) {
        // Check if snapped moveDelta would put the event start before 0, if so correct for it
        let newEventStart = this.timeline.metadata.positionQuarterNoteToBeats(this.eventStartPosition) + (moveDelta / this.timeline.beatWidth);
        if (newEventStart < 0) {
            moveDelta -= newEventStart * this.timeline.beatWidth;
        }
        // Update the x position
        this.x = this._startXPosition + moveDelta;
    }

    /**
     * Handler for pointer up events
     *
     * @public
     * @param {number} moveDelta Difference in x position between start mouse position and current mouse position
     * @memberof TrackTimelineEvent
     */
    public pointerUpHandler(moveDelta: number) {
        let newEventStart = this.timeline.metadata.positionQuarterNoteToBeats(this.eventStartPosition) + (moveDelta / this.timeline.beatWidth);
        if (newEventStart < 0) {
            moveDelta -= newEventStart * this.timeline.beatWidth;
        }
        this.dragHandler(moveDelta);

        this._startXPosition = undefined;
    }


    /**
     * Handler for pointer up events where it was calculated that this event was a click
     *
     * @memberof TrackTimelineEvent
     */
    public pointerUpClickHandler() {
        // Reset x position
        this.x = this._startXPosition;
        this.clickHandler();
        this._startXPosition = undefined;
    }

    /**
     * Called once a drag event finishes, should be implemented by subclasses to update the model based on what the drag event changed.
     *
     * @protected
     * @abstract
     * @param {number} dragDistance
     * @memberof TrackTimelineEvent
     */
    protected abstract dragHandler(dragDistance: number);

    /**
     * Called once a drag event finishes, and the distance is small enough that it is considered a click.
     * Should be implemented by subclasses depending on the required functionality.
     *
     * @protected
     * @abstract
     * @memberof TrackTimelineEvent
     */
    protected abstract clickHandler();
}

/**
 * TimelineEvent representing a group of notes.
 *
 * @export
 * @class NoteGroupTimelineEvent
 * @extends {TrackTimelineEvent}
 */
export class NoteGroupTimelineEvent extends TrackTimelineEvent {

    public track: NoteUITrack;

    private _noteGroup: number;
    private _notes: NoteEvent[];

    /**
     * Creates an instance of NoteGroupTimelineEvent.
     * @param {SongTimeline} timeline The timeline object this event is part of
     * @param {number} x The x position of this object (pixels)
     * @param {number} width The width of this object (pixels)
     * @param {NoteUITrack} track The UITrack this event represents one of the note groups of
     * @param {number[]} noteGroup Index of the note group in track.noteGroups this object represents
     * @memberof NoteGroupTimelineEvent
     */
    constructor(timeline: SongTimeline, x: number, width: number, track: NoteUITrack, noteGroup: number) {
        super(timeline, x, width, track, track.noteGroups[noteGroup][0], track.noteGroups[noteGroup][1] - track.noteGroups[noteGroup][0]);
        this._noteGroup = noteGroup;
        this.redraw();
    }

    get noteGroup() {
        return this.track.noteGroups[this.noteGroup];
    }

    public redraw(selected: boolean = this._selected) {
        super.redraw(selected);
        let noteGroup = this.track.noteGroups[this._noteGroup];
        this._notes = this.track.track.timeline.getEventsBetweenTimes(noteGroup[0], noteGroup[1]) as NoteEvent[];
        this.setNotes(this._notes, this.track.track.highestPitch, this.track.track.lowestPitch, noteGroup);
    }

    public setNotes(notes: NoteEvent[], highestNote: string, lowestNote: string, noteGroup: number[]) {
        let noteRange = NoteHelper.distanceBetweenNotes(highestNote, lowestNote) + 1;

        let start = noteGroup[0];
        let end = noteGroup[1];
        let noteHeight = (this.track.height - TrackTimelineEvent.paddingHeight * 2) / noteRange;
        let positionMap = position => {
            return (position - start) / (end - start);
        }
        this._contentGraphics.beginFill(UIColors.trackEventHighlightColor);
        notes.forEach(note => {
            let startX = positionMap(note.startPosition) * this.assignedWidth;
            let endX = positionMap(note.startPosition + note.duration) * this.assignedWidth;
            this._contentGraphics.drawRect(startX,
                NoteHelper.distanceBetweenNotes(highestNote, note.pitchString) * noteHeight + TrackTimelineEvent.paddingHeight,
                endX - startX - 2,
                noteHeight);
        });
        this._contentGraphics.endFill();
    }

    protected dragHandler(dragDistance: number) {
        let metadata = this.timeline.metadata;
        
        // Get a deep copy of the current noteGroup, then update the set of notegroups
        let noteGroup = Object.assign([], this.track.noteGroups[this._noteGroup]);

        let beatChange = dragDistance / this.timeline.beatWidth;

        noteGroup[0] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(noteGroup[0]) + beatChange);
        noteGroup[1] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(noteGroup[1]) + beatChange);
        
        // Check if new position is clear
        let groups = this.track.getNoteGroupsWithinTime(noteGroup[0], noteGroup[1]);
        let timePeriodClear = true;

        // Check if any groups were found that aren't this noteGroup (as we're currently using a copy)
        for(let i = 0; i < groups.length; i++) {
            if (!(groups[i][0] == this.track.noteGroups[this._noteGroup][0] && groups[i][1] == this.track.noteGroups[this._noteGroup][1])) {
                timePeriodClear = false;
                break;
            }
        }

        // If not clear, reset to the starting position
        if (!timePeriodClear) {
            this.x = this._startXPosition;
        }
        else {
            // FIXME: test this with different time signatures.
            // Update note position by converting to beats, adding the change, then converting back.
            this._notes.forEach(note => {
                note.startPosition = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(note.startPosition) + beatChange);
            });
            this.eventStartPosition = noteGroup[0];
            this.eventDuration = noteGroup[1] - noteGroup[0];

            // Remove and readd the noteGroup to make sure it is in the right position in the list of groups
            this.track.noteGroups.splice(this._noteGroup, 1);
            this.track.addNoteGroup(noteGroup[0], noteGroup[1]);
        }
    }

    protected clickHandler() {
        console.log("Clicked NoteTrackTimelineEvent");
    }
}

/**
 * TimelineEvent representing one playback of a track which can only play one sound
 *
 * @export
 * @class OneShotTimelineEvent
 * @extends {TrackTimelineEvent}
 */
export class OneShotTimelineEvent extends TrackTimelineEvent {

    public event : BaseEvent;

    /**
     * Creates an instance of OneShotTimelineEvent.
     * @param {SongTimeline} timeline The timeline object this event is part of.
     * @param {number} x The x position this object should start at (pixels)
     * @param {number} width The width of this object (pixels)
     * @param {UITrack} track The UITrack this event is part of
     * @param {BaseEvent} event
     * @memberof OneShotTimelineEvent
     */
    constructor(timeline: SongTimeline, x: number, width: number, track: UITrack, event : BaseEvent) {
        super(timeline, x, width, track, event.startPosition, event.duration);

        this.event = event;
    }

    // FIXME: this needs testing
    protected dragHandler(dragDistance : number) {
        // Get the events that occur within 
        let beatChange = dragDistance / this.timeline.beatWidth;
        let newStartPosition = this.timeline.metadata.positionQuarterNoteToBeats(this.event.startPosition) + beatChange;
        let eventsInPeriod = this.track.track.timeline.getEventsBetweenTimes(newStartPosition, newStartPosition + this.event.duration);

        let timePeriodClear = true;
        for(let i = 0; i < eventsInPeriod.length; i++) {
            if (eventsInPeriod[i] != this.event) {
                timePeriodClear = false;
                break;
            }
        }

        if (!timePeriodClear) {
            this.x = this._startXPosition;
        }
        else {
            let eventIndex = this.track.track.timeline.getIndexOfEvent(this.event);
            this.track.track.timeline.editEvent(eventIndex, newStartPosition);
        }
    }

    protected clickHandler() {
        console.log("Clicked OneShotTimelineEvent");
    }
}