import * as PIXI from "pixi.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import SongMetadata from "../../Model/SongManagement/SongMetadata.js";
import { UITrack, NoteUITrack, SoundFileUITrack } from "../UIObjects/UITrack.js";
import { Bar } from "./Bar.js";
import { TrackTimelineEvent, NoteGroupTimelineEvent, OneShotTimelineEvent } from "./TrackTimelineEvent.js";
import { PointHelper } from "../../HelperModules/PointHelper.js";
import { UIColors } from "../UIColors.js";
import { BaseEvent } from "../../Model/Notation/SongEvents.js";

enum ClickState {
    None,
    Dragging,
    ChildDragging
}

export enum EventDragType {
    Beat,
    HalfBeat,
    QuarterBeat,
    EighthBeat,
    None
}

export enum SongTimelineMode {
    Playback,
    Edit
}

export enum SongTimelineEditMode {
    Add,
    Remove
}

interface INewEventData {
    track : UITrack,
    startPosition : number
}

/**
 * Generates a timeline containing bars and note events.
 *
 * @export
 * @class SongTimeline
 * @extends {PIXI.Container}
 */
export class SongTimeline extends PIXI.Container {

    // Stores the width of 1 beat in pixels.
    static beatWidth = 50;

    public startX: number;
    public endX: number;
    public endY: number;

    public metadata: SongMetadata;
    public tracks: UITrack[];

    public timelineMode: SongTimelineMode = SongTimelineMode.Edit;
    public timelineEditMode: SongTimelineEditMode = SongTimelineEditMode.Remove;

    /**
     * Represents how dragging of child objects should be snapped (to the beat, to the half beat, etc)
     *
     * @type {EventDragType}
     * @memberof SongTimeline
     */
    public dragType: EventDragType = EventDragType.QuarterBeat;

    // Separate bars and events for z indexing
    private _barContainer: PIXI.Container;
    private _eventContainer: PIXI.Container;

    private _objectPool: ObjectPool<Bar>;
    private _bars: Bar[];

    // Beat position variables
    private _zoomScale = 1;

    // Scrolling variables
    private _clickState = ClickState.None;
    private _startPointerPosition: PIXI.Point;
    private _startXPosition: number;
    private _interactivityRect: PIXI.Graphics;

    // Event creation variables
    private _newEventGraphics: PIXI.Graphics;
    private _newEventData : INewEventData;

    // Event variables
    private _pressed: TrackTimelineEvent;
    private _selected: TrackTimelineEvent[] = [];
    private _hovered: TrackTimelineEvent;

    /**
     *Creates an instance of SongTimeline.
     * @param {number} startX The x coordinate in the parent where this timeline should start (pixels)
     * @param {number} viewWidth The width of the view (pixels)
     * @param {number} viewHeight The height of the view (pixels)
     * @param {SongMetadata} metadata The metadata this SongTimeline is a part of
     * @param {UITrack[]} tracks The tracks this timeline should display
     * @memberof SongTimeline
     */
    constructor(startX: number, viewWidth: number, viewHeight: number, metadata: SongMetadata, tracks: UITrack[]) {
        super();
        this.startX = startX;
        this.endX = viewWidth;
        this.endY = viewHeight;
        this.metadata = metadata;
        this.tracks = tracks;

        this._objectPool = new ObjectPool(Bar);
        this._bars = [];

        this._barContainer = new PIXI.Container();
        this._eventContainer = new PIXI.Container();
        this.addChild(this._barContainer, this._eventContainer);

        this._interactivityRect = new PIXI.Graphics();
        this.interactive = true;
        this.resizeInteractiveArea();
        this.addChild(this._interactivityRect);

        this._newEventGraphics = new PIXI.Graphics();
        this.addChild(this._newEventGraphics);

        this._regenerateTimeline(0);

        this.on("pointerdown", this.pointerDownHandler.bind(this));
        this.on("pointermove", this.pointerMoveHandler.bind(this));
        this.on("pointerup", this.pointerUpHandler.bind(this));
        this.on("pointerupoutside", this.pointerUpHandler.bind(this));
    }

    get beatWidth() {
        return SongTimeline.beatWidth * this._zoomScale;
    }

    get clickState() {
        return this._clickState;
    }

    public resizeInteractiveArea() {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(this.startX, 0, this.endX, this.endY);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        this._pressed = this._getTimelineEventHit(event);

        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._startXPosition = this.x;

        if (this._pressed != null && this._selected.length > 0 && this._pressed == this._selected[0]) {
            this._clickState = ClickState.ChildDragging;

            this._selected.forEach(selectedObj => {
                selectedObj.pointerDownHandler();

            });
        }
        else {
            this._clickState = ClickState.Dragging;
            // Remove selected objects
            this._selected.forEach(selectedObj => {
                selectedObj.pointerDownHandler();
            });
            this._selected = [];
        }
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        this._newEventGraphics.visible = false;
        if (this._clickState == ClickState.Dragging) {
            // Hide new event outline

            let moveDelta = event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x;
            this.x = this._startXPosition + moveDelta;

            // This solution is used because the container's x is reset to 0 after each scroll event,
            // but while scrolling occurs the container's position rather than the child objects' positions is changed.
            // Therefore, we have to find out if bar 0 is past where the timeline should start.
            // If it is, calculate the offset required to position bar 0 at the start of the timeline.
            if (this._bars[0].barNumber === 0 && this.x + this._bars[0].leftBound > this.startX) {
                this.x = -this._bars[0].leftBound + this.startX;
            }

            // While loops are used in this section because extremely quick, large scrolls can cause bars to be missing
            // Check right side for adding or removing bars offscreen
            let rightSideOffset = this.x + this._bars[this._bars.length - 1].rightBound - this.endX;
            while (rightSideOffset < 100) { // If the right side is too close, need to add a new bar.
                let bar = this._initialiseBar(this._bars[this._bars.length - 1].rightBound, this._bars[this._bars.length - 1].barNumber + 1);
                this._bars.push(bar);

                // Recalculate where the right side is.
                rightSideOffset = this.x + this._bars[this._bars.length - 1].rightBound - this.endX;
            }
            while (rightSideOffset > 800) {
                let bar = this._bars.pop();
                this._returnBar(bar);

                rightSideOffset = this.x + this._bars[this._bars.length - 1].rightBound - this.endX;
            }


            // Check left side for adding or removing bars offscreen
            let leftSideOffset = this.startX - this.x - this._bars[0].leftBound;
            while (leftSideOffset < 100 && this._bars[0].barNumber != 0) {
                let bar = this._initialiseBar(this._bars[0].leftBound, this._bars[0].barNumber - 1, false);
                this._bars.splice(0, 0, bar);

                leftSideOffset = this.startX - this.x - this._bars[0].leftBound;
            }
            while (leftSideOffset > 800) {
                let bar = this._bars.splice(0, 1)[0];
                this._returnBar(bar);
                leftSideOffset = this.startX - this.x - this._bars[0].leftBound;
            }
        }
        else if (this.timelineMode == SongTimelineMode.Edit) {
            if (this._clickState == ClickState.ChildDragging) {
                // Calculate snapped moveDelta
                let moveDelta = this.snapToDragType(event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x);

                // Pass it to selected children
                this._selected.forEach(selectedObj => {
                    selectedObj.pointerMoveHandler(moveDelta);
                });
            }
            else if (this.timelineEditMode == SongTimelineEditMode.Add) {
                this._newEventData = undefined;
                // Display new event outline (set width for note events, same length as soundfile for soundfile)
                let mousePos = event.data.getLocalPosition(this.parent);
                for(let i = 0; i < this.tracks.length; i++) {
                    if (this.tracks[i].startY < mousePos.y && this.tracks[i].startY + this.tracks[i].height > mousePos.y) {
                        let track = this.tracks[i];

                        if (mousePos.x < this.startX || mousePos.x > this.endX) {
                            return;
                        }

                        // Get mouse position as bar position
                        let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(mousePos.x);
                        // Snap beat position
                        switch (this.dragType) {
                            case EventDragType.None:
                                break;
                            case EventDragType.Beat:
                                beatPosition = beatPosition - (beatPosition % 1)
                                break;
                            case EventDragType.HalfBeat:
                                beatPosition *= 2;
                                beatPosition = (beatPosition - (beatPosition % 1)) / 2;
                                break;
                            case EventDragType.QuarterBeat:
                                beatPosition *= 4;
                                beatPosition = (beatPosition - (beatPosition % 1)) / 4;
                                break;
                            case EventDragType.EighthBeat:
                                beatPosition *= 8;
                                beatPosition = (beatPosition - (beatPosition % 1)) / 8;
                                break;
                        }
                        // Add snapped beat position as percentage to barPosition
                        barPosition += beatPosition / numBeats;

                        let startPosition = this.metadata.positionBarsToQuarterNote(barPosition);
                        let x = this._getStageCoordinatesFromBar(barPosition);
                        let y = track.startY;
                        let width = 0;
                        let height = track.height;
                        if (track instanceof NoteUITrack) {
                            let endPosition = startPosition + 4;
                            if (track.getNoteGroupsWithinTime(startPosition, endPosition).length > 0) {
                                return;
                            }
                            width = (this.metadata.positionQuarterNoteToBeats(endPosition) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;
                        }
                        else if (track instanceof SoundFileUITrack) {
                            let endPosition = startPosition + track.eventDuration;
                            if (track.getOneShotsBetweenTime(startPosition, endPosition).length > 0) {
                                return;
                            }
                            width = this.metadata.positionQuarterNoteToBeats(track.eventDuration) * this.beatWidth;
                        }

                        this._newEventGraphics.clear();
                        this._newEventGraphics.beginFill(UIColors.trackEventColor)
                                                .drawRect(x, y, width, height)
                                                .endFill()
                                                .beginHole()
                                                .drawRect(x+2, y+2, width-4, height-4)
                                                .endHole();
                        this._newEventGraphics.visible = true;
                        this._newEventData = {track : track, startPosition : startPosition};
                        break;
                    }
                }
            }
            else if (this.timelineEditMode == SongTimelineEditMode.Remove) {
                this._hoverHandler(this._getTimelineEventHit(event));
            }
        }
    }

    public pointerUpHandler(event: PIXI.InteractionEvent) {
        // Check if event was a click
        if (PointHelper.distanceSquared(event.data.getLocalPosition(this.parent), this._startPointerPosition) < 10) {
            if (this._clickState == ClickState.Dragging) {
                this.x = this._startXPosition;
                if (this._pressed != null) {
                    // Select pressed object
                    this._selected = [this._pressed];
                    this._hoverHandler(this._pressed);
                    this._pressed.selected = true;
                    this._pressed = null;
                }
                else if (this.timelineMode == SongTimelineMode.Edit) {
                    if (this.timelineEditMode == SongTimelineEditMode.Add && this._newEventData != undefined) {
                        let track = this._newEventData.track;
                        let startPosition = this._newEventData.startPosition;
                        console.log("adding at: " + startPosition);
                        if (track instanceof NoteUITrack) {
                            track.addNoteGroup(startPosition, startPosition + 4);
                            this._initialiseNoteGroup([startPosition, startPosition + 4], track);
                        }
                        else if (track instanceof SoundFileUITrack) {
                            let event = track.track.addOneShot(startPosition);
                            this._initialiseTimelineEvent(event, track);
                        }
                    }
                }
            }
            else if (this._clickState == ClickState.ChildDragging) {
                // This was a click on a child, activate click on the pressed object and unselect all other objects.
                for (let i = 0; i < this._selected.length; i++) {
                    if (this._selected[i] == this._pressed) {
                        if (this.timelineEditMode == SongTimelineEditMode.Remove) {
                            this._pressed.deleteEvent();
                            this._pressed, this._hovered = null;
                            this._selected.splice(i, 1);
                        }
                        else {
                            this._pressed.pointerUpClickHandler();
                        }
                        return;
                    }
                    else {
                        this._selected[i].selected = false;
                    }
                }
                this._selected = [this._pressed];
            }
        }
        // Otherwise, the event was a drag
        else {
            if (this._clickState == ClickState.Dragging) {
                // Normal drag
                this._offsetChildren(-this.x);
                this.x = 0;
            }
            else if (this._clickState == ClickState.ChildDragging && this.timelineMode == SongTimelineMode.Edit) {
                // Dragging a child, calculate distance and pass it down
                let moveDelta = this.snapToDragType(event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x);
                this._selected.forEach(selectedObj => {
                    selectedObj.pointerUpHandler(moveDelta);
                });
            }
        }

        this._clickState = ClickState.None;
        this._startXPosition = undefined;
        this._startPointerPosition = undefined;
    }


    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        this._newEventGraphics.visible = false;

        let stageX = event.clientX - canvasX;
        let stageY = event.clientY - canvasY;
        if (stageX < this.startX || stageX > this.endX || stageY < 0 || stageY > this.endY) {
            return;
        }
        else if (this._clickState == ClickState.None) {

            // Get the mouse's position in bars (based on the screen)
            let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(stageX);
            barPosition += beatPosition / numBeats
            // Change the scaling
            this._zoomScale = Math.max(0.5, Math.min(5.0, this._zoomScale - event.deltaY / 1000));
            // Regenerate the bars (at least until the bar we need)
            this._regenerateTimeline(this._bars[0].barNumber, Math.floor(barPosition));
            // Get the offset required to put the original position under the mouse
            let offset = this._getStageCoordinatesFromBar(barPosition) - stageX;
            // If the first bar is bar 0, check the offset won't cause it to go past the left side of the timeline view.
            if (this._bars[0].barNumber === 0 && this._bars[0].leftBound - offset > this.startX) {
                // If it will, instead set the offset at most to the offset needed to put bar 0 at the start of the timeline view.
                offset = this.startX - this._bars[0].leftBound;
            }
            this._offsetChildren(offset);
        }
    }

    private _hoverHandler(newHover : TrackTimelineEvent) {
        if (this._hovered != null && this._hovered != newHover) {
            this._hovered.hoveredColor = null;
            this._hovered.hovered = false;
        }
        this._hovered = newHover;
        if (this._hovered == null) {
            return;
        }
        this._hovered.hovered = true;

        if (this.timelineMode == SongTimelineMode.Edit && this.timelineEditMode == SongTimelineEditMode.Remove) {
            if (this._hovered != null && this._selected.includes(this._hovered)) {
                this._hovered.hoveredColor = 0xFF0000;
            }
        }
    }

    /**
     * Returns if a timelineEvent is under a given PIXI InteractionEvent
     *
     * @private
     * @param {PIXI.InteractionEvent} event
     * @returns {TrackTimelineEvent} The child that was hit (null if none was hit)
     * @memberof SongTimeline
     */
    private _getTimelineEventHit(event : PIXI.InteractionEvent) : TrackTimelineEvent {
        for (let i = 0; i < this._eventContainer.children.length; i++) {
            let child = this._eventContainer.children[i] as TrackTimelineEvent;
            let pos = event.data.getLocalPosition(child);
            if (pos.x > 0 && pos.x < child.width && pos.y > 0 && pos.y < child.height) {
                return child;
            }
        }
        return null;
    }


    /**
     * Gets a bar position from a given coordinate relative to the stage.
     *
     * @private
     * @param {number} stageX The stage x coordinate (pixels)
     * @returns {number[]} An array of the form [bar number, number of beats through bar, number of beats in bar]
     * @memberof SongTimeline
     */
    private _getBarFromStageCoordinates(stageX: number) : number[] {
        for (let i = 0; i < this._bars.length; i++) {
            if (this._bars[i].leftBound <= stageX && this._bars[i].rightBound > stageX) {
                // Calculate the bar number + the percentage through the bar that the mouse position
                return [this._bars[i].barNumber,  ((stageX - this._bars[i].leftBound) / this.beatWidth), this._bars[i].numberOfBeats];
            }
        }
    }


    private _getStageCoordinatesFromBar(barNumber: number) {
        for (let i = 0; i < this._bars.length; i++) {
            if (this._bars[i].barNumber === Math.floor(barNumber)) {
                // Get the left bound of the current bar and add 
                return this._bars[i].leftBound + (barNumber % 1) * this._bars[i].numberOfBeats * this.beatWidth;
            }
        }
        return -1;
    }

    /**
     * Adds a given pixel offset to the x coordinate all children of this object.
     *
     * @private
     * @param {number} pixelOffset The number of pixels to offset by
     * @memberof BarTimeline
     */
    private _offsetChildren(pixelOffset: number) {
        for (let i = 0; i < this._barContainer.children.length; i++) {
            this._barContainer.children[i].x -= pixelOffset;
        }
        for (let i = 0; i < this._eventContainer.children.length; i++) {
            this._eventContainer.children[i].x -= pixelOffset;
        }
        

        // After offsetting, ensure the screen is still filled with bars
        this._checkBarsFillScreen();
    }

    /**
     * Scrolls the view so that a given bar position is at the start of the view.
     *
     * @private
     * @param {number} barPosition The bar position to start at
     * @memberof BarTimeline
     */
    private _scrollToPosition(barPosition : number) {
        // Regenerate the bars starting at the bar given by the metadata.
        let barNumber = Math.floor(barPosition);
        this._regenerateTimeline(barNumber);

        // Calculate the number of pixels to scroll by using the time signature (to get the number of beats)
        let scrollAmount = this.metadata.getTimeSignature(barPosition)[0] * (barPosition % 1) * this.beatWidth;
        this._offsetChildren(scrollAmount);
    }


    /**
     * Clears the screen and regenerates the timeline from a given bar number - places the first bar at startX.
     *
     * @private
     * @param {number} fromBar The bar to start generating from
     * @param {number} toBar The bar to which generation should at least run to
     * @memberof BarTimeline
     */
    private _regenerateTimeline(fromBar: number, toBar?: number) {
        let currentBar = fromBar;
        // Clear existing timeline
        while (this._bars.length > 0) {
            this._returnBar(this._bars[0]);
            this._bars.splice(0, 1);
        }

        // Generate new timeline
        let currentXPosition = this.startX;
        while (currentXPosition < this.endX) {
            let bar = this._initialiseBar(currentXPosition, currentBar);
            this._bars.push(bar);
            currentBar++;
            currentXPosition = bar.rightBound;
        }

        if (toBar != undefined) {
            while (currentBar <= toBar) {
                let bar = this._initialiseBar(currentXPosition, currentBar);
                this._bars.push(bar);
                currentBar++;
                currentXPosition = bar.rightBound;
            }
        }

        // If no events have been generated, create all the UITracks
        if (this._eventContainer.children.length == 0) {
            for (let i = 0; i < this.tracks.length; i++) {
                let track = this.tracks[i];
                if (track instanceof NoteUITrack) {
                    // Get all note groups that should be generated in the current bar range
                    track.noteGroups.forEach(group => {
                        this._initialiseNoteGroup(group, track as NoteUITrack);
                    });
                }
                else if (track instanceof SoundFileUITrack) {
                    track.track.timeline.events.forEach(event => {
                        this._initialiseTimelineEvent(event, track);
                    });
                }
            };
        } 
        // Otherwise, reposition them to the correct location.
        else {
            this._eventContainer.children.forEach(event => {
                if (event instanceof TrackTimelineEvent) {
                    let [x, width] = this._getTimelineEventXWidth(event.eventStartPosition, event.eventStartPosition + event.eventDuration);
                    event.reinitialise(x, width);
                }
            });
        }
    }

    /**
     * Ensures the the screen is filled with bars (both to the left and right of the existing bars)
     *
     * @private
     * @memberof BarTimeline
     */
    private _checkBarsFillScreen() {
        // Fill left (to 0)
        while (this._bars[0].leftBound > this.startX && this._bars[0].barNumber != 0) {
            let bar = this._initialiseBar(this._bars[0].leftBound, this._bars[0].barNumber - 1, false);
            this._bars.splice(0, 0, bar);
        }
        // Fill right
        while (this._bars[this._bars.length - 1].rightBound < this.endX) {
            let bar = this._initialiseBar(this._bars[this._bars.length - 1].rightBound, this._bars[this._bars.length - 1].barNumber + 1);
            this._bars.push(bar);
        }
    }

    /**
     * Gets a pooled Bar object
     *
     * @private
     * @returns {Bar}
     * @memberof BarTimeline
     */
    private _getBar(): Bar {
        if (this._objectPool.objectCount > 0) {
            let bar = this._objectPool.getObject();
            bar.visible = true;
            return bar;
        }
        else {
            let bar = new Bar();
            this._barContainer.addChild(bar);
            return bar;
        }
    }

    /**
     * Returns a bar object to the pool
     *
     * @private
     * @param {Bar} instance
     * @memberof BarTimeline
     */
    private _returnBar(instance: Bar) {
        instance.visible = false;
        this._objectPool.returnObject(instance);
    }

    /**
     * Initialises a new bar with the given values, and generates any events that exist at this bar.
     *
     * @private
     * @param {number} xPosition The x coordinate to initialise the new bar at
     * @param {number} barNumber The number for this bar
     * @param {boolean} [leftSide=true] Whether the x coordinate represents the left bound of that bar (use false if the bar should be placed to the left of the x coordinate)
     * @returns {Bar}
     * @memberof BarTimeline
     */
    private _initialiseBar(xPosition: number, barNumber: number, leftSide = true): Bar {
        let bar = this._getBar();
        let quarterNotePosition = this.metadata.positionBarsToQuarterNote(barNumber);
        let numberOfBeats = this.metadata.getTimeSignature(quarterNotePosition)[0];
        bar.initialise(xPosition, this.endY, barNumber, numberOfBeats, this._zoomScale, leftSide);
        return bar;
    }

    /**
     * Initialises a new note group
     *
     * @private
     * @param {number[]} noteGroup The note group to initialise
     * @param {NoteUITrack} track The track to initialise the note group in
     * @memberof SongTimeline
     */
    private _initialiseNoteGroup(noteGroup: number[], track: NoteUITrack): TrackTimelineEvent {
        // starting x position is calculated as follows:
        // (Position of note group start in beats - the position of the first DISPLAYED bar in beats) * beat width * zoom + the start position of the first DISPLAYED bar in pixels
        let [x, width] = this._getTimelineEventXWidth(noteGroup[0], noteGroup[1]);
        let event = new NoteGroupTimelineEvent(
            this,
            x,
            width,
            track,
            noteGroup);
        this._eventContainer.addChild(event);
        return event;
    }

    private _initialiseTimelineEvent(event : BaseEvent, track : UITrack) : TrackTimelineEvent {
        let [x, width] = this._getTimelineEventXWidth(event.startPosition, event.startPosition + event.duration);
        let timelineEvent = new OneShotTimelineEvent(this, x, width, track, event);
        this._eventContainer.addChild(timelineEvent);
        return timelineEvent;
    }

    /**
     * Gets the x coordinate and the width of a timeline event
     *
     * @private
     * @param {number} startPosition (quarter notes)
     * @param {number} endPosition (quarter notes)
     * @returns {number[]} [x, width]
     * @memberof SongTimeline
     */
    private _getTimelineEventXWidth(startPosition: number, endPosition : number) : number[] {
        let x = (this.metadata.positionQuarterNoteToBeats(startPosition) - this.metadata.positionQuarterNoteToBeats(this.metadata.positionBarsToQuarterNote(this._bars[0].barNumber))) * this.beatWidth + this._bars[0].leftBound;
        let width = (this.metadata.positionQuarterNoteToBeats(endPosition) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;
        return [x, width]
    }

    /**
     * Snaps a coordinate to the drag type of this timeline
     *
     * @private
     * @param {number} value
     * @returns
     * @memberof SongTimeline
     */
    private snapToDragType(value: number) {
        return value - this.getPixelOffsetFromDragType(value);
    }

    private getPixelOffsetFromDragType(value : number) {
        switch (this.dragType) {
            case EventDragType.Beat:
                return (value % this.beatWidth);
            case EventDragType.HalfBeat:
                return (value % (this.beatWidth / 2));
            case EventDragType.QuarterBeat:
                return (value % (this.beatWidth / 4));
            case EventDragType.EighthBeat:
                return (value % (this.beatWidth / 8));
            case EventDragType.None:
                return 0;
        }
    }
}
