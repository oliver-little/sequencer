import * as PIXI from "pixi.js";
import { UIColors } from "./UITheme.js";
import { NoteEvent, BaseEvent } from "../../Model/Notation/SongEvents.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { UITrack, NoteUITrack } from "../UIObjects/UITrack.js";
import { ScrollableTimeline } from "./ScrollableTimeline.js";


export abstract class TrackTimelineEvent extends PIXI.Container {

    public timeline: ScrollableTimeline;
    public assignedWidth: number;
    public assignedHeight : number;
    public track: UITrack;

    public abstract readonly eventStartPosition: number;
    public abstract readonly eventDuration: number;

    public borderLeft = 1;
    public borderRight = 2;
    public borderHeight = 2;
    public paddingHeight = 6;
    public selectedBorderWidth = 4;

    protected _selected: boolean = false;
    protected _hovered: boolean = false;
    protected _opacity: number = 1;
    protected _contentGraphics: PIXI.Graphics;
    protected _selectedGraphics: PIXI.Graphics;
    protected _hoveredColor: number = UIColors.trackEventHoveredColor;

    protected _startXPosition: number;

    /**
     *Creates an instance of TrackTimelineEvent.
     * @param {ScrollableTimeline} timeline The timeline object this TrackTimelineEvent is part of
     * @param {number} x The x position this event should start at (pixels)
     * @param {number} width The width of this event (pixels)
     * @param {number} y The y coordinate this event should start at (pixels)
     * @param {number} height The height of this event (pixels)
     * @param {UITrack} track The UITrack this TrackTimelineEvent represents an event of
     * @param {number} eventStartPosition The start position of this event (quarter notes)
     * @param {number} eventDuration The duration of this event (quarter notes)
     * @memberof TrackTimelineEvent
     */
    constructor(timeline: ScrollableTimeline, x: number, width: number, y : number, height : number, track: UITrack) {
        super();
        this.timeline = timeline;
        this.track = track;

        this._contentGraphics = new PIXI.Graphics();
        this._selectedGraphics = new PIXI.Graphics();
        this._selectedGraphics.zIndex = 1;
        this.addChild(this._contentGraphics, this._selectedGraphics);

        this.x = x + this.borderLeft;
        this.assignedWidth = Math.max(width - this.borderRight, 3);
        this.assignedHeight = height - this.borderHeight;
        this.y = y + this.borderHeight;
    }

    /**
     * Reinitialises this TrackTimelineEvent in a new position
     *
     * @param {number} x The new x position (pixels)
     * @param {number} width The new width (pixels)
     * @memberof TrackTimelineEvent
     */
    public reinitialise(x : number, width : number, y? : number, height? : number) {
        this.x = x + this.borderLeft;
        this.assignedWidth = Math.max(width - this.borderRight, 3);

        if (y != undefined) {
            this.y = y;
        }
        if (height != undefined) {
            this.assignedHeight = height;
        }
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
        this.redrawSelected();
    }

    get hovered() {
        return this._hovered;
    }

    set hovered(value: boolean) {
        this._hovered = value;
        this.redrawSelected();
    }

    get hoveredColor() {
        return this._hoveredColor;
    }

    set hoveredColor(value : number) {
        if (value == null) {
            value = UIColors.trackEventHoveredColor;
        }
        this._hoveredColor = value;
        this.redrawSelected();
    }

    get opacity() {
        return this._opacity;
    }

    set opacity(value : number) {
        if (value < 0 || value > 1) {
            throw new RangeError("Opacity must be between 0 and 1.");
        }
        this._opacity = value;
        this.redraw();
    }

    /**
     * Redraws the current TrackTimelineEvent 
     * (should be called when any variables relating to how this object should be drawn are changed)
     *
     * @memberof TrackTimelineEvent
     */
    public redraw() {
        this._contentGraphics.clear();
        this._contentGraphics.beginFill(UIColors.trackEventColor, this._opacity)
            .drawRect(0, 0, this.assignedWidth, this.assignedHeight)
            .endFill();
        this.redrawSelected();
    }

    /**
     * Just redraws the selected outline of the current TrackTimelineEvent
     *
     * @memberof TrackTimelineEvent
     */
    public redrawSelected() {
        this._selectedGraphics.clear();
        if (this.hovered || this.selected) {
        this._selectedGraphics.beginFill(this.hovered ? this._hoveredColor : UIColors.trackEventSelectedColor, this.opacity)
                .drawRect(0, 0, this.assignedWidth, this.assignedHeight)
                .endFill()
                .beginHole()
                .drawRect(this.selectedBorderWidth, this.selectedBorderWidth, this.assignedWidth - this.selectedBorderWidth * 2, this.assignedHeight - this.selectedBorderWidth * 2)
                .endHole();
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
     * Handles deletion of this event
     *
     * @memberof TrackTimelineEvent
     */
    public deleteEvent() {
        this.destroy({children:true});
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

    private _noteGroup: number[];
    private _notes: NoteEvent[];

    /**
     * Creates an instance of NoteGroupTimelineEvent.
     * @param {SongTimeline} timeline The timeline object this event is part of
     * @param {number} x The x position of this object (pixels)
     * @param {number} width The width of this object (pixels)
     * @param {NoteUITrack} track The UITrack this event represents one of the note groups of
     * @param {number[]} noteGroup The NoteGroup this event represents
     * @memberof NoteGroupTimelineEvent
     */
    constructor(timeline: ScrollableTimeline, x: number, width: number, track: NoteUITrack, noteGroup: number[]) {
        let y = track.startY;
        let height = track.height;
        super(timeline, x, width, y, height, track);
        this._noteGroup = noteGroup;
        this.redraw();
    }

    get noteGroup() {
        return this._noteGroup;
    }

    get eventStartPosition() {
        return this._noteGroup[0];
    }

    get eventDuration() {
        return this._noteGroup[1] - this._noteGroup[0];
    }

    public redraw() {
        super.redraw();
        this._notes = this.track.track.timeline.getEventsBetweenTimes(this._noteGroup[0], this._noteGroup[1]) as NoteEvent[];
        this.setNotes(this._notes, this.track.track.highestPitch, this.track.track.lowestPitch, this._noteGroup);
    }

    public setNotes(notes: NoteEvent[], highestNote: string, lowestNote: string, noteGroup: number[]) {
        let noteRange = NoteHelper.distanceBetweenNotes(highestNote, lowestNote) + 1;

        let start = noteGroup[0];
        let end = noteGroup[1];
        let noteHeight = (this.track.height - this.paddingHeight * 2) / noteRange;
        let positionMap = position => {
            return (position - start) / (end - start);
        }
        this._contentGraphics.beginFill(UIColors.trackEventHighlightColor, this._opacity);
        notes.forEach(note => {
            let startX = positionMap(note.startPosition) * this.assignedWidth;
            let endX = positionMap(note.startPosition + note.duration) * this.assignedWidth;
            this._contentGraphics.drawRect(startX,
                NoteHelper.distanceBetweenNotes(highestNote, note.pitchString) * noteHeight + this.paddingHeight,
                endX - startX - 2,
                noteHeight);
        });
        this._contentGraphics.endFill();
    }

    protected dragHandler(dragDistance: number) {
        let metadata = this.timeline.metadata;
        
        // Get a deep copy of the current noteGroup, then update the set of notegroups
        let noteGroup = Object.assign([], this._noteGroup);

        let beatChange = dragDistance / this.timeline.beatWidth;

        noteGroup[0] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(noteGroup[0]) + beatChange);
        noteGroup[1] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(noteGroup[1]) + beatChange);
        
        // Check if new position is clear
        let groups = this.track.getNoteGroupsWithinTime(noteGroup[0], noteGroup[1]);
        let timePeriodClear = true;

        // Check if any groups were found that aren't this noteGroup (as we're currently using a copy)
        for(let i = 0; i < groups.length; i++) {
            if (!(groups[i][0] == this._noteGroup[0] && groups[i][1] == this._noteGroup[1])) {
                timePeriodClear = false;
                break;
            }
        }

        // If not clear, reset to the starting position
        if (!timePeriodClear) {
            this.x = this._startXPosition;
        }
        else {
            // Update note position by converting to beats, adding the change, then converting back.
            this._notes.forEach(note => {
                this.track.track.timeline.removeEvent(note);
                note.startPosition = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(note.startPosition) + beatChange);
                this.track.track.timeline.addEvent(note);
            });

            // Remove and readd the noteGroup to make sure it is in the right position in the list of groups
            this.track.removeNoteGroup(this._noteGroup[0]);
            this.track.addNoteGroup(noteGroup[0], noteGroup[1]);
            this._noteGroup = noteGroup;
        }
    }

    public deleteEvent() {
        this._notes.forEach(note => {
            this.track.track.timeline.removeEvent(note);
        });
        delete this._notes;
        this.track.removeNoteGroup(this.noteGroup[0]);
        super.deleteEvent();
    }

    protected clickHandler() {
        console.log("Clicked NoteTrackTimelineEvent");
    }
}

/**
 * TimelineEvent representing a base event object
 *
 * @export
 * @class BaseEventTimelineEvent
 * @extends {TrackTimelineEvent}
 */
export class BaseEventTimelineEvent extends TrackTimelineEvent {

    public event : BaseEvent;

    /**
     * Creates an instance of OneShotTimelineEvent.
     * @param {SongTimeline} timeline The timeline object this event is part of.
     * @param {number} x The x position this object should start at (pixels)
     * @param {number} width The width of this object (pixels)
     * @param {number} y The y coordinate this object should start at (pixels)
     * @param {number} height The height of this object (pixels)
     * @param {UITrack} track The UITrack this event is part of
     * @param {BaseEvent} event
     * @memberof BaseEventTimelineEvent
     */
    constructor(timeline: ScrollableTimeline, x: number, width: number, y : number, height : number, track: UITrack, event : BaseEvent) {
        super(timeline, x, width, y, height, track);

        this.event = event;
        this.redraw();
    }

    get eventStartPosition() {
        return this.event.startPosition;
    }

    get eventDuration() {
        return this.event.duration;
    }

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

    public deleteEvent() {
        this.track.track.timeline.removeEvent(this.event);
        super.deleteEvent();
    }

    protected clickHandler() {
        console.log("Clicked BaseEventTimelineEvent");
    }
}

/**
 * Represents a OneShot event
 * The difference between this object and BaseEventTimelineEvent is 
 * that the y coordinate of this object is fixed to track.startY
 * and the height is fixed to track.height
 *
 * @export
 * @class OneShotTimelineEvent
 * @extends {BaseEventTimelineEvent}
 */
export class OneShotTimelineEvent extends BaseEventTimelineEvent {
    constructor(timeline: ScrollableTimeline, x: number, width: number, track: UITrack, event : BaseEvent) {
        let y = track.startY;
        let height = track.height;
        super(timeline, x, width, y, height, track, event);
    }
}

/**
 * Extends BaseEventTimelineEvent to modify how events are tested for collisions
 *
 * @export
 * @class NoteTimelineEvent
 * @extends {BaseEventTimelineEvent}
 */
export class NoteTimelineEvent extends BaseEventTimelineEvent {

    public track : NoteUITrack;
    public event : NoteEvent;

    constructor(timeline: ScrollableTimeline, x: number, width: number, y : number, height : number, track: NoteUITrack, event : NoteEvent) {
        super(timeline, x, width, y, height, track, event);
    }

    protected dragHandler(dragDistance : number) {
        // Get the events that occur within 
        let beatChange = dragDistance / this.timeline.beatWidth;
        let newStartPosition = this.timeline.metadata.positionQuarterNoteToBeats(this.event.startPosition) + beatChange;
        let eventsInPeriod = this.track.track.timeline.getEventsBetweenTimes(newStartPosition, newStartPosition + this.event.duration) as NoteEvent[];

        // FIXME: Possibly test for collisions in BaseEvent/NoteEvent to remove the need for this basic class extension
        let timePeriodClear = true;
        for(let i = 0; i < eventsInPeriod.length; i++) {
            if (eventsInPeriod[i] != this.event && eventsInPeriod[i].pitch == this.event.pitch) {
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
}