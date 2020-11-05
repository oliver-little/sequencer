import * as PIXI from "pixi.js";
import { UIColors, UIPositioning } from "./UITheme.js";
import { NoteEvent, BaseEvent } from "../../Model/Notation/SongEvents.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { UITrack, NoteUITrack, SoundFileUITrack } from "../UIObjects/UITrack.js";
import { ScrollableTimeline } from "./ScrollableTimeline.js";
import { MouseTypeContainer } from "./InteractiveContainer.js";
import { MouseClickType, TimelineMode } from "./Enums.js";
import { SequencerTimeline } from "../Sequencer/SequencerTimeline.js";


export abstract class TrackTimelineEvent extends MouseTypeContainer {

    public timeline: ScrollableTimeline;
    public assignedWidth: number;
    public assignedHeight: number;
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
    protected _startYPosition: number;

    // Stores a snapped version of the start pointer position, which is used to calculate where the event should be positioned
    // if snapping is enabled in the parent ScrollableTimeline
    protected _snappedStartPointerPosition : PIXI.Point;

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
    constructor(timeline: ScrollableTimeline, track: UITrack, x: number, width: number, y: number, height: number) {
        super();
        this.timeline = timeline;
        this.track = track;

        this._contentGraphics = new PIXI.Graphics();
        this._selectedGraphics = new PIXI.Graphics();
        this._selectedGraphics.zIndex = 1;
        this.addChild(this._contentGraphics, this._selectedGraphics);

        this.x = x + this.borderLeft;
        this.assignedWidth = Math.max(width - this.borderRight, 5);
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
    public reinitialise(y?: number, height?: number) {
        let [x, width] = this.timeline.getTimelineEventXWidth(this.eventStartPosition, this.eventStartPosition + this.eventDuration);
        this.x = x + this.borderLeft;
        this.assignedWidth = Math.max(width - this.borderRight, 5);

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

    set hoveredColor(value: number) {
        if (value == null) {
            value = UIColors.trackEventHoveredColor;
        }
        this._hoveredColor = value;
        this.redrawSelected();
    }

    get opacity() {
        return this._opacity;
    }

    set opacity(value: number) {
        if (value < 0 || value > 1) {
            throw new RangeError("Opacity must be between 0 and 1.");
        }
        this._opacity = value;
        this.redraw();
    }

    public destroy() {
        super.destroy({children: true});
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
     * @param {PIXI.InteractionEvent} event
     * @memberof TrackTimelineEvent
     */
    public pointerDownHandler(event: PIXI.InteractionEvent) {
        super.pointerDownHandler(event);

        if (this._mouseClickType == MouseClickType.None || !(this.timeline.timelineMode == TimelineMode.Edit)) {
            return;
        }
        event.stopPropagation();

        this._startXPosition = this.x;
        this._startYPosition = this.y;
        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._snappedStartPointerPosition = this._startPointerPosition.clone();
        this._snappedStartPointerPosition.x = this.timeline.snapCoordinateToDragType(this._snappedStartPointerPosition.x);
    }

    /**
     * Handler for pointer move events
     *
     * @public
     * @param {PIXI.InteractionEvent} event
     * @memberof TrackTimelineEvent
     */
    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick && this.timeline.timelineMode == TimelineMode.Edit) {
            event.stopPropagation();

            let moveDelta = this.timeline.snapCoordinateToDragType(event.data.getLocalPosition(this.parent).x) - this._snappedStartPointerPosition.x;

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
     * @param {number} moveDelta Difference in x position between start mouse position and current mouse position
     * @memberof TrackTimelineEvent
     */
    public pointerUpHandler(event: PIXI.InteractionEvent) {
        super.pointerUpHandler(event);
        this._startXPosition = undefined;
        this._startYPosition = undefined;
        this._startPointerPosition = undefined;
        this._snappedStartPointerPosition = undefined;
    }


    /**
     * Handler for pointer up events where it was calculated that this event was a click
     *
     * @memberof TrackTimelineEvent
     */
    public pointerUpClickHandler(event: PIXI.InteractionEvent) {
        if (this.timeline.timelineMode == TimelineMode.Edit) {
            event.stopPropagation();
            if (this._mouseClickType == MouseClickType.LeftClick) {
                // Reset x position
                this.x = this._startXPosition;
                this.clickHandler();
            }
            else if (this._mouseClickType == MouseClickType.RightClick) {
                this.deleteEvent();
            }
        }
    }

    /**
     * Handler for pointer up events where it was calculated that this event was a drag
     *
     * @param {PIXI.InteractionEvent} event
     * @memberof TrackTimelineEvent
     */
    public pointerUpDragHandler(event: PIXI.InteractionEvent) {
        if (this.timeline.timelineMode == TimelineMode.Edit) {
            event.stopPropagation();
            if (this._mouseClickType == MouseClickType.LeftClick) {
                let point = event.data.getLocalPosition(this.parent);
                let moveX = this.timeline.snapCoordinateToDragType(point.x) - this._snappedStartPointerPosition.x;
                let moveY = point.y - this._snappedStartPointerPosition.y;


                let newEventStart = this.timeline.metadata.positionQuarterNoteToBeats(this.eventStartPosition) + (moveX / this.timeline.beatWidth);
                if (newEventStart < 0) {
                    moveX -= newEventStart * this.timeline.beatWidth;
                }

                let dragDistance = new PIXI.Point(moveX, moveY);
                this.dragHandler(dragDistance);
            }
        }
    }

    /**
     * Handles deletion of this event
     *
     * @memberof TrackTimelineEvent
     */
    public deleteEvent() {
        this.destroy();
    }

    /**
     * Called once a drag event finishes, should be implemented by subclasses to update the model based on what the drag event changed.
     *
     * @protected
     * @abstract
     * @param {PIXI.Point} dragDistance The x and y move distance (x is snapped to the timeline's drag type)
     * @memberof TrackTimelineEvent
     */
    protected abstract dragHandler(dragDistance: PIXI.Point);

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

    private _clickCallback : Function;

    /**
     * Creates an instance of NoteGroupTimelineEvent.
     * @param {SongTimeline} timeline The timeline object this event is part of
     * @param {number} x The x position of this object (pixels)
     * @param {number} width The width of this object (pixels)
     * @param {NoteUITrack} track The UITrack this event represents one of the note groups of
     * @param {number[]} noteGroup The NoteGroup this event represents
     * @memberof NoteGroupTimelineEvent
     */
    constructor(timeline: ScrollableTimeline, track: NoteUITrack, noteGroup: number[], clickCallback?: Function) {
        let [x, width] = timeline.getTimelineEventXWidth(noteGroup[0], noteGroup[1]);
        let y = track.startY;
        let height = track.height;
        super(timeline, track, x, width, y, height);
        this._noteGroup = noteGroup;
        this._clickCallback = clickCallback;
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

    protected dragHandler(dragDistance: PIXI.Point) {

        let metadata = this.timeline.metadata;

        // Get a deep copy of the current noteGroup, then update the set of notegroups
        let noteGroup = Object.assign([], this._noteGroup);

        let beatChange = dragDistance.x / this.timeline.beatWidth;

        noteGroup[0] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(noteGroup[0]) + beatChange);
        noteGroup[1] = metadata.positionBeatsToQuarterNote(metadata.positionQuarterNoteToBeats(noteGroup[1]) + beatChange);

        // Check if new position is clear
        let groups = this.track.getNoteGroupsWithinTime(noteGroup[0], noteGroup[1]);
        let timePeriodClear = true;

        // Check if any groups were found that aren't this noteGroup (as we're currently using a copy)
        for (let i = 0; i < groups.length; i++) {
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
        this._clickCallback(this.track);
    }
}

/**
 * Represents a OneShot event in SongTimeline
 *
 * @export
 * @class OneShotTimelineEvent
 * @extends {TrackTimelineEvent}
 */
export class OneShotTimelineEvent extends TrackTimelineEvent {

    public track: SoundFileUITrack;
    public event: BaseEvent;

    constructor(timeline: ScrollableTimeline, track: SoundFileUITrack, event: BaseEvent) {
        let [x, width] = timeline.getTimelineEventXWidth(event.startPosition, event.endPosition);
        if (!track.displayActualWidth) {
            width = 0;
        }

        super(timeline, track, x, width, track.startY, track.height);

        this.event = event;
        this._modelEventRemoved = this._modelEventRemoved.bind(this);
        this.event.removed.addListener(this._modelEventRemoved);
        this.redraw();
    }

    get eventStartPosition() {
        return this.event.startPosition;
    }

    get eventDuration() {
        if (this.track.displayActualWidth) {
            return this.event.duration;
        }
        else {
            return 0;
        }
    }

    public destroy() {
        this.event.removed.removeListener(this._modelEventRemoved);
        super.destroy();
    }

    public deleteEvent() {
        this.track.track.timeline.removeEvent(this.event);
        super.deleteEvent();
    }

    protected _modelEventRemoved() {
        this.event.removed.removeListener(this._modelEventRemoved);
        super.deleteEvent();
    }

    protected dragHandler(dragDistance: PIXI.Point) {
        let beatChange = dragDistance.x / this.timeline.beatWidth;
        let newStartPosition = this.timeline.metadata.positionQuarterNoteToBeats(this.event.startPosition) + beatChange;
        let eventsInPeriod = this.track.track.timeline.getEventsBetweenTimes(newStartPosition, newStartPosition + this.event.duration);

        let timePeriodClear = true;
        for (let i = 0; i < eventsInPeriod.length; i++) {
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

/**
 * Represents a NoteEvent in SequencerTimeline
 *
 * @export
 * @class NoteTimelineEvent
 * @extends {TrackTimelineEvent}
 */
export class NoteTimelineEvent extends TrackTimelineEvent {

    public timeline: SequencerTimeline;
    public track: NoteUITrack;
    public event: NoteEvent;

    private _lastNoteNumber: number;

    constructor(timeline: SequencerTimeline, track: NoteUITrack, event: NoteEvent, y: number, height: number,) {
        let [x, width] = timeline.getTimelineEventXWidth(event.startPosition, event.endPosition);
        super(timeline, track, x, width, y, height);

        this.event = event;
        this._modelEventRemoved = this._modelEventRemoved.bind(this);
        this.event.removed.addListener(this._modelEventRemoved);
        this.redraw();
    }

    get eventStartPosition() {
        return this.event.startPosition;
    }

    get eventDuration() {
        return this.event.duration;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        super.pointerDownHandler(event);
        this._snappedStartPointerPosition.y = this._snappedStartPointerPosition.y - (this._snappedStartPointerPosition.y % SequencerTimeline.noteHeight) + SequencerTimeline.noteHeight;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        super.pointerMoveHandler(event);
        if (this._mouseClickType == MouseClickType.LeftClick) {
            let moveDelta = event.data.getLocalPosition(this.parent).y - this._snappedStartPointerPosition.y;
            let oldNoteNumber = NoteHelper.noteStringToNoteNumber(this.event.pitchString);
            let noteYPosition = Math.min(this.timeline.offsetContentHeight - UIPositioning.timelineHeaderHeight, Math.max(0, oldNoteNumber * SequencerTimeline.noteHeight - moveDelta));
            this._lastNoteNumber = Math.floor(noteYPosition / SequencerTimeline.noteHeight);
            this.y =  this._startYPosition - (this._lastNoteNumber - oldNoteNumber) * SequencerTimeline.noteHeight;
        }
    }

    public destroy() {
        this.event.removed.removeListener(this._modelEventRemoved);
        super.destroy();
    }

    public deleteEvent() {
        this.track.removeEvent(this.event);
        super.deleteEvent();
    }

    protected _modelEventRemoved() {
        this.event.removed.removeListener(this._modelEventRemoved);
        super.deleteEvent();
    }

    protected dragHandler(dragDistance: PIXI.Point) {
        let beatChange = dragDistance.x / this.timeline.beatWidth;
        // Add the note change to the new note string, floor it, make sure it isn't less than 0, and convert it back to a string.
        let newNotePitch = NoteHelper.noteNumberToNoteString(this._lastNoteNumber);
        let newStartPosition = this.timeline.metadata.positionQuarterNoteToBeats(this.event.startPosition) + beatChange;
        let eventsInPeriod = this.track.track.timeline.getEventsBetweenTimes(newStartPosition, newStartPosition + this.event.duration) as NoteEvent[];

        let timePeriodClear = true;
        for (let i = 0; i < eventsInPeriod.length; i++) {
            if (eventsInPeriod[i] != this.event && eventsInPeriod[i].pitchString == newNotePitch) {
                timePeriodClear = false;
                break;
            }
        }

        if (!timePeriodClear) {
            this.x = this._startXPosition;
            this.y = this._startYPosition;
        }
        else {
            this.track.editEvent(this.event, newStartPosition, newNotePitch);
        }
    }

    protected clickHandler() {
        console.log("Clicked NoteTimelineEvent");
    }
}