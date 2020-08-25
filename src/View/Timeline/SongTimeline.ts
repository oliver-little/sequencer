import * as PIXI from "pixi.js";
import { UITrack, NoteUITrack, SoundFileUITrack } from "../UIObjects/UITrack.js";
import { TrackTimelineEvent, NoteGroupTimelineEvent, OneShotTimelineEvent } from "./TrackTimelineEvent.js";
import { UIColors } from "../Shared/UITheme.js";
import { BaseEvent } from "../../Model/Notation/SongEvents.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { TimelineMarker } from "./TimelineMarker.js";
import { ScrollableTimeline, ClickState } from "../Shared/ScrollableTimeline.js";
import { EventSnapType, TimelineMode, MouseClickType } from "../Shared/Enums.js";

interface INewEventData {
    track: UITrack,
    startPosition: number
}

/**
 * Generates a timeline containing bars and note events.
 *
 * @export
 * @class SongTimeline
 * @extends {PIXI.Container}
 */
export class SongTimeline extends ScrollableTimeline {

    public songManager: SongManager;
    public tracks: UITrack[];

    public timelineMode: TimelineMode = TimelineMode.Edit;

    /**
     * Represents how dragging of child objects should be snapped (to the beat, to the half beat, etc)
     *
     * @type {EventSnapType}
     * @memberof SongTimeline
     */
    public dragType: EventSnapType = EventSnapType.QuarterBeat;

    // Separate bars and events for z indexing
    private _eventContainer: PIXI.Container;

    // Scrolling variables
    private _timelineMarker: TimelineMarker;

    // Event creation variables
    private _newEventGraphics: PIXI.Graphics;
    private _newEventData: INewEventData;

    // Event variables
    private _selected: TrackTimelineEvent[] = [];

    private _boundTimelineAnim: (time: number) => any;

    /**
     *Creates an instance of SongTimeline.
     * @param {number} startX The x coordinate in the parent where this timeline should start (pixels)
     * @param {number} endX The width of the view (pixels)
     * @param {number} endY The height of the view (pixels)
     * @param {SongMetadata} metadata The metadata this SongTimeline is a part of
     * @param {UITrack[]} tracks The tracks this timeline should display
     * @memberof SongTimeline
     */
    constructor(startX: number, endX: number, endY: number, songManager: SongManager, tracks: UITrack[]) {
        super(startX, endX, 0, endY, songManager);
        this.songManager = songManager;
        this.tracks = tracks;


        this._eventContainer = new PIXI.Container();

        this._newEventGraphics = new PIXI.Graphics();
        this.addChild(this._eventContainer, this._newEventGraphics);

        this._regenerateTimeline(0);

        this._timelineMarker = new TimelineMarker();
        this.addChild(this._timelineMarker);
        this._redrawTimelineMarker();

        this._boundTimelineAnim = this._timelineMarkerAnim.bind(this);
        this.songManager.playingChangedEvent.addListener(value => { this._playingStateChanged(value[0]) });
    }

    get contentHeight() {
        return this.tracks[this.tracks.length - 1].startY + this.tracks[this.tracks.length - 1].height;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        super.pointerDownHandler(event);

        let pressed = this._getTimelineEventHit(event);

        if (pressed != null) {
            this._clickState = ClickState.EventDragging;

            this._selected.forEach(timelineEvent => {
                if (timelineEvent != pressed) {
                    timelineEvent.selected = false;
                }
            });
            this._selected = [];

            // Select pressed object
            this._selected.push(pressed);
            pressed.selected = true;

            if (this._mouseClickType == MouseClickType.LeftClick) {
                this._selected.forEach(timelineEvent => {
                    timelineEvent.pointerDownHandler();
                });
            }
        }
        else {
            this._clickState = ClickState.Dragging;
            // Remove selected objects
            this._selected.forEach(selectedObj => {
                selectedObj.selected = false;
            });
            this._selected = [];
        }
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        this._newEventGraphics.visible = false;
        // Right Click
        if (this._mouseClickType == MouseClickType.RightClick && this.timelineMode == TimelineMode.Edit) {
            // Add hover here
        }
        // Left click
        else if (this._mouseClickType == MouseClickType.LeftClick) {
            if (this._clickState == ClickState.Dragging) {
                super.pointerMoveHandler(event);
            }
            else if (this.timelineMode == TimelineMode.Edit) {
                if (this._clickState == ClickState.EventDragging) {
                    // Calculate snapped moveDelta
                    let moveDelta = this.snapToDragType(event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x);

                    // Pass it to selected children
                    this._selected.forEach(selectedObj => {
                        selectedObj.pointerMoveHandler(moveDelta);
                    });
                }
            }
        }
        else if (this._mouseClickType == MouseClickType.None) {
            this._newEventData = undefined;
            // Display new event outline (set width for note events, same length as soundfile for soundfile)
            let mousePos = event.data.getLocalPosition(this.parent);
            for (let i = 0; i < this.tracks.length; i++) {
                if (this.tracks[i].startY + this._verticalScrollPosition < mousePos.y && this.tracks[i].startY + this.tracks[i].height + this._verticalScrollPosition > mousePos.y) {
                    let track = this.tracks[i];

                    if (mousePos.x < this.startX || mousePos.x > this.endX) {
                        return;
                    }

                    // Get mouse position as bar position
                    let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(mousePos.x);
                    // Snap beat position
                    switch (this.dragType) {
                        case EventSnapType.None:
                            break;
                        case EventSnapType.Beat:
                            beatPosition = beatPosition - (beatPosition % 1)
                            break;
                        case EventSnapType.HalfBeat:
                            beatPosition *= 2;
                            beatPosition = (beatPosition - (beatPosition % 1)) / 2;
                            break;
                        case EventSnapType.QuarterBeat:
                            beatPosition *= 4;
                            beatPosition = (beatPosition - (beatPosition % 1)) / 4;
                            break;
                        case EventSnapType.EighthBeat:
                            beatPosition *= 8;
                            beatPosition = (beatPosition - (beatPosition % 1)) / 8;
                            break;
                    }
                    // Add snapped beat position as percentage to barPosition
                    barPosition += beatPosition / numBeats;

                    let startPosition = this.metadata.positionBarsToQuarterNote(barPosition);
                    let x = this._getStageCoordinatesFromBar(barPosition);
                    let y = track.startY + this._verticalScrollPosition;
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

                    // Fixes a bug where very small events won't display properly.
                    width = Math.max(width, 3);

                    this._newEventGraphics.clear();
                    this._newEventGraphics.beginFill(UIColors.trackEventColor)
                        .drawRect(x, y, width, height)
                        .endFill()
                        .beginHole()
                        .drawRect(x + 2, y + 2, width - 4, height - 4)
                        .endHole();
                    this._newEventGraphics.visible = true;
                    this._newEventData = { track: track, startPosition: startPosition };
                    break;
                }
            }
        }
    }

    public pointerUpClickHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.RightClick) {
            for (let i = 0; i < this._selected.length; i++) {
                this._selected[i].deleteEvent();
                this._selected.splice(i, 1);
                this._clickState = ClickState.None;
            }
        }
        else if (this._mouseClickType == MouseClickType.LeftClick) {
            if (this._clickState == ClickState.Dragging) {
                this.x = this._startXPosition;
                if (this.timelineMode == TimelineMode.Edit) {
                    if (this._newEventData != undefined) {
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
                        this._newEventData = undefined;
                    }
                }
            }
            else if (this._clickState == ClickState.EventDragging) {
                // This was a click on a child, activate click on the pressed object and unselect all other objects.
                for (let i = 0; i < this._selected.length; i++) {
                    this._selected[i].pointerUpClickHandler();
                }
            }
        }
    }

    public pointerUpDragHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick) {
            if (this._clickState == ClickState.Dragging) {
                super.pointerUpDragHandler(event);
            }
            else if (this._clickState == ClickState.EventDragging && this.timelineMode == TimelineMode.Edit) {
                // Dragging a child, calculate distance and pass it down
                let moveDelta = this.snapToDragType(event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x);
                this._selected.forEach(selectedObj => {
                    selectedObj.pointerUpHandler(moveDelta);
                });
            }
        }
    }

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        this._newEventGraphics.visible = false;
        super.mouseWheelHandler(event, canvasX, canvasY);
    }

    public updateVerticalScroll(value: number) {
        super.updateVerticalScroll(value);

        // Also move the events
        this._eventContainer.children.forEach(function (event: TrackTimelineEvent) {
            event.verticalScrollPosition = value;
        });
    }

    /**
     * Returns if a timelineEvent is under a given PIXI InteractionEvent
     *
     * @private
     * @param {PIXI.InteractionEvent} event
     * @returns {TrackTimelineEvent} The child that was hit (null if none was hit)
     * @memberof SongTimeline
     */
    private _getTimelineEventHit(event: PIXI.InteractionEvent): TrackTimelineEvent {
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
     * Adds a given pixel offset to the x coordinate all children of this object.
     *
     * @private
     * @param {number} pixelOffset The number of pixels to offset by
     * @memberof SongTimeline
     */
    protected _offsetChildren(pixelOffset: number) {
        super._offsetChildren(pixelOffset);

        for (let i = 0; i < this._eventContainer.children.length; i++) {
            this._eventContainer.children[i].x -= pixelOffset;
        }

        this._repositionTimelineMarker(this.songManager.quarterNotePosition);
    }

    /**
     * Scrolls the view so that a given bar position is at the start of the view.
     *
     * @private
     * @param {number} barPosition The bar position to start at
     * @memberof BarTimeline
     */
    private _scrollToPosition(barPosition: number) {
        // Regenerate the bars starting at the bar given by the metadata.
        let barNumber = Math.floor(barPosition);
        this._regenerateTimeline(barNumber);

        // Calculate the number of pixels to scroll by using the time signature (to get the number of beats)
        let scrollAmount = this.metadata.getTimeSignature(barPosition)[0] * (barPosition % 1) * this.beatWidth;
        this._offsetChildren(scrollAmount);
    }

    /**
     * Clears the screen and regenerates the timeline from a given bar number - places the first bar at startX.
     * Also repositions timeline events
     * 
     * @private
     * @param {number} fromBar The bar to start generating from
     * @param {number} toBar The bar to which generation should at least run to
     * @memberof ScrollableTimeline
     */
    protected _regenerateTimeline(fromBar: number, toBar?: number) {
        super._regenerateTimeline(fromBar, toBar);

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

    private _initialiseTimelineEvent(event: BaseEvent, track: UITrack): TrackTimelineEvent {
        let [x, width] = this._getTimelineEventXWidth(event.startPosition, event.startPosition + event.duration);
        let timelineEvent = new OneShotTimelineEvent(this, x, width, track, event);
        this._eventContainer.addChild(timelineEvent);
        return timelineEvent;
    }

    private _playingStateChanged(value: boolean) {
        if (value == true) {
            requestAnimationFrame(this._boundTimelineAnim);
        }
    }

    private _timelineMarkerAnim(timestamp: number) {
        this._repositionTimelineMarker(this.songManager.quarterNotePosition);

        if (this.songManager.playing == true) {
            requestAnimationFrame(this._boundTimelineAnim);
        }
    }

    /**
     * Redraws the timeline marker
     *
     * @private
     * @memberof SongTimeline
     */
    private _redrawTimelineMarker() {
        this._timelineMarker.redraw(
            0,
            this.tracks[0].startY,
            5 * this._zoomScale,
            Math.max(this.contentHeight, this.endY)
        );
        this._repositionTimelineMarker(this.songManager.quarterNotePosition);
    }

    /**
     * Repositions the timeline marker over a given quarter note position
     *
     * @private
     * @param {number} position
     * @memberof SongTimeline
     */
    private _repositionTimelineMarker(position: number) {
        this._timelineMarker.x = this._getTimelineEventX(position);
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
    private _getTimelineEventXWidth(startPosition: number, endPosition: number): number[] {
        let x = this._getTimelineEventX(startPosition);
        let width = (this.metadata.positionQuarterNoteToBeats(endPosition) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;
        return [x, width]
    }

    private _getTimelineEventX(position: number): number {
        return (this.metadata.positionQuarterNoteToBeats(position) - this.metadata.positionQuarterNoteToBeats(this.metadata.positionBarsToQuarterNote(this._scrollObjects[0].barNumber))) * this.beatWidth + this._scrollObjects[0].leftBound;
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

    private getPixelOffsetFromDragType(value: number) {
        switch (this.dragType) {
            case EventSnapType.Beat:
                return (value % this.beatWidth);
            case EventSnapType.HalfBeat:
                return (value % (this.beatWidth / 2));
            case EventSnapType.QuarterBeat:
                return (value % (this.beatWidth / 4));
            case EventSnapType.EighthBeat:
                return (value % (this.beatWidth / 8));
            case EventSnapType.None:
                return 0;
        }
    }
}
