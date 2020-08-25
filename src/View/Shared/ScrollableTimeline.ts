import * as PIXI from "pixi.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import { PointHelper } from "../../HelperModules/PointHelper.js";
import { ScrollableBar } from "./ScrollableBar.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { MouseClickType, ClickState, TimelineMode, EventSnapType } from "./Enums.js";
import { TrackTimelineEvent } from "./TrackTimelineEvent.js";
import { TimelineMarker } from "../Timeline/TimelineMarker.js";
import { UIPositioning } from "./UITheme.js";

/**
 * Provides a basic implementation of a timeline, including pooled bar objects using ScrollableBar
 * as well as customisable TrackTimelineEvents
 *
 * @export
 * @abstract
 * @class ScrollableTimeline
 * @extends {PIXI.Container}
 */
export abstract class ScrollableTimeline extends PIXI.Container {

    // Stores the width of 1 beat in pixels.
    static beatWidth = 50;

    // View boundaries
    public startX: number;
    public startY: number;
    public endX: number;
    public endY: number;

    public songManager: SongManager;

    /**
     * Represents the mode this timeline is in (editing or playback)
     *
     * @type {TimelineMode}
     * @memberof ScrollableTimeline
     */
    public timelineMode: TimelineMode = TimelineMode.Edit;

    /**
     * Represents how dragging of child objects should be snapped (to the beat, to the half beat, etc)
     *
     * @type {EventSnapType}
     * @memberof SongTimeline
     */
    public dragType: EventSnapType = EventSnapType.QuarterBeat;

    protected _zoomScale = 1;

    protected _scrollObjects: ScrollableBar[];
    protected _barPool: ObjectPool<ScrollableBar>;

    protected _headerContainer: PIXI.Container;
    protected _eventContainer: PIXI.Container;
    protected _barContainer: PIXI.Container;

    // FIXME: content height is duplicated between verticalscrollview and this object, possibly not necessary?
    protected abstract readonly contentHeight: number;

    protected _startPointerPosition: PIXI.Point;
    protected _startXPosition: number;
    protected _verticalScrollPosition: number = 0;
    protected _clickState = ClickState.None;
    protected _mouseClickType: MouseClickType = MouseClickType.None;

    protected _interactivityRect: PIXI.Graphics;

    protected _selected: TrackTimelineEvent[] = [];

    // Timeline marker variables
    protected _timelineMarker: TimelineMarker;
    protected _boundTimelineAnim: (time: number) => any;

    constructor(startX: number, endX: number, startY: number, endY: number, songManager: SongManager) {
        super();
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.songManager = songManager;

        this._scrollObjects = [];
        this._barPool = new ObjectPool();

        this._barContainer = new PIXI.Container();
        this._headerContainer = new PIXI.Container();
        this._eventContainer = new PIXI.Container();
        this.addChild(this._barContainer, this._eventContainer, this._headerContainer);

        this._timelineMarker = new TimelineMarker();
        this.addChild(this._timelineMarker);

        this._boundTimelineAnim = this._timelineMarkerAnim.bind(this);
        this.songManager.playingChangedEvent.addListener(value => { this._playingStateChanged(value[0]) });
    }

    get metadata() {
        return this.songManager.metadata;
    }

    get beatWidth() {
        return ScrollableTimeline.beatWidth * this._zoomScale;
    }

    get clickState() {
        return this._clickState;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        switch (event.data.button) {
            case 0:
                this._mouseClickType = MouseClickType.LeftClick;
                break;
            case 2:
                this._mouseClickType = MouseClickType.RightClick;
                break;
            default:
                this._mouseClickType = MouseClickType.None;
        }

        if (this._mouseClickType == MouseClickType.LeftClick) {
            this._clickState = ClickState.Dragging;
        }
        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._startXPosition = this.x;

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
        if (this._mouseClickType == MouseClickType.RightClick && this.timelineMode == TimelineMode.Edit) {
            // TODO: Add hover effect for TrackTimelineEvents
        }
        else if (this._mouseClickType == MouseClickType.LeftClick) {
            if (this._clickState == ClickState.Dragging) {
                let moveDelta = event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x;
                this.x = this._startXPosition + moveDelta;

                // This solution is used because the container's x is reset to 0 after each scroll event,
                // but while scrolling occurs the container's position rather than the child objects' positions is changed.
                // Therefore, we have to find out if bar 0 is past where the timeline should start.
                // If it is, calculate the offset required to position bar 0 at the start of the timeline.
                if (this._scrollObjects[0].barNumber === 0 && this.x + this._scrollObjects[0].leftBound > this.startX) {
                    this.x = -this._scrollObjects[0].leftBound + this.startX;
                }

                // While loops are used in this section because extremely quick, large scrolls can cause bars to be missing
                // Check right side for adding or removing bars offscreen
                let rightSideOffset = this.x + this._scrollObjects[this._scrollObjects.length - 1].rightBound - this.endX;
                while (rightSideOffset < 100) { // If the right side is too close, need to add a new bar.
                    let lastBar = this._scrollObjects[this._scrollObjects.length - 1];
                    let bar = this._initialiseScrollableBar(lastBar.rightBound, lastBar.barNumber + 1, true);
                    this._scrollObjects.push(bar);

                    // Recalculate where the right side is.
                    rightSideOffset = this.x + this._scrollObjects[this._scrollObjects.length - 1].rightBound - this.endX;
                }
                while (rightSideOffset > 800) {
                    let bar = this._scrollObjects.pop();
                    this._returnScrollableBar(bar);

                    rightSideOffset = this.x + this._scrollObjects[this._scrollObjects.length - 1].rightBound - this.endX;
                }


                // Check left side for adding or removing bars offscreen
                let leftSideOffset = this.startX - this.x - this._scrollObjects[0].leftBound;
                while (leftSideOffset < 100 && this._scrollObjects[0].barNumber != 0) {
                    let firstBar = this._scrollObjects[0];
                    let bar = this._initialiseScrollableBar(firstBar.leftBound, firstBar.barNumber - 1, false);
                    this._scrollObjects.splice(0, 0, bar);

                    leftSideOffset = this.startX - this.x - this._scrollObjects[0].leftBound;
                }
                while (leftSideOffset > 800) {
                    let bar = this._scrollObjects.splice(0, 1)[0];
                    this._returnScrollableBar(bar);
                    leftSideOffset = this.startX - this.x - this._scrollObjects[0].leftBound;
                }
            }
            else if (this._clickState == ClickState.EventDragging && this.timelineMode == TimelineMode.Edit) {
                // Calculate snapped moveDelta
                let moveDelta = this.snapToDragType(event.data.getLocalPosition(this.parent).x - this._startPointerPosition.x);

                // Pass it to selected children
                this._selected.forEach(selectedObj => {
                    selectedObj.pointerMoveHandler(moveDelta);
                });
            }
        }
    }

    public pointerUpHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType != MouseClickType.LeftClick) {
            return;
        }
        // Check if event was a click
        if (PointHelper.distanceSquared(event.data.getLocalPosition(this.parent), this._startPointerPosition) < 10) {
            this.pointerUpClickHandler(event);
        }
        else {
            this.pointerUpDragHandler(event);
        }

        this._startXPosition = undefined;
        this._startPointerPosition = undefined;
        this._clickState = ClickState.None;
        this._mouseClickType = MouseClickType.None;
    }

    public pointerUpClickHandler(event: PIXI.InteractionEvent) {
        // TODO: move timeline marker on click in playback mode
        if (this._mouseClickType == MouseClickType.LeftClick) {
            if (this._clickState == ClickState.Dragging) {
                this.x = this._startXPosition;
            }
            else if (this._clickState == ClickState.EventDragging) {
                // This was a click on a child
                for (let i = 0; i < this._selected.length; i++) {
                    this._selected[i].pointerUpClickHandler();
                }
            }
        }
        else if (this._mouseClickType == MouseClickType.RightClick) {
            for (let i = 0; i < this._selected.length; i++) {
                this._selected[i].deleteEvent();
                this._selected.splice(i, 1);
                this._clickState = ClickState.None;
            }
        }
    }

    public pointerUpDragHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick) {
            if (this._clickState == ClickState.Dragging) {
                // Normal drag
                this._offsetChildren(-this.x);
                this.x = 0;
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
        let stageX = event.clientX - canvasX;
        let stageY = event.clientY - canvasY;
        if (stageX < this.startX || stageX > this.endX || stageY < 0 || stageY > this.endY) {
            return;
        }

        // Get the mouse's position in bars (based on the screen)
        let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(stageX);
        barPosition += beatPosition / numBeats
        // Change the scaling
        this._zoomScale = Math.max(0.5, Math.min(5.0, this._zoomScale - event.deltaY / 1000));
        // Regenerate the bars (at least until the bar we need)
        this._regenerateTimeline(this._scrollObjects[0].barNumber, Math.floor(barPosition));
        // Get the offset required to put the original position under the mouse
        let offset = this._getStageCoordinatesFromBar(barPosition) - stageX;
        // If the first bar is bar 0, check the offset won't cause it to go past the left side of the timeline view.
        if (this._scrollObjects[0].barNumber === 0 && this._scrollObjects[0].leftBound - offset > this.startX) {
            // If it will, instead set the offset at most to the offset needed to put bar 0 at the start of the timeline view.
            offset = this.startX - this._scrollObjects[0].leftBound;
        }
        this._offsetChildren(offset);
    }

    public updateVerticalScroll(value: number) {
        this._scrollObjects.forEach(bar => {
            bar.verticalScrollPosition = value;
        });
        this._verticalScrollPosition = value;

        // Also move the events
        this._eventContainer.children.forEach(function (event: TrackTimelineEvent) {
            event.verticalScrollPosition = value;
        });
    }

    /**
     * Gets a bar position from a given coordinate relative to the stage.
     *
     * @private
     * @param {number} stageX The stage x coordinate (pixels)
     * @returns {number[]} An array of the form [bar number, number of beats through bar, number of beats in bar]
     * @memberof SongTimeline
     */
    protected _getBarFromStageCoordinates(stageX: number): number[] {
        for (let i = 0; i < this._scrollObjects.length; i++) {
            if (this._scrollObjects[i].leftBound <= stageX && this._scrollObjects[i].rightBound > stageX) {
                // Calculate the bar number + the percentage through the bar that the mouse position
                return [this._scrollObjects[i].barNumber, ((stageX - this._scrollObjects[i].leftBound) / this.beatWidth), this._scrollObjects[i].numberOfBeats];
            }
        }
    }


    protected _getStageCoordinatesFromBar(barNumber: number) {
        for (let i = 0; i < this._scrollObjects.length; i++) {
            if (this._scrollObjects[i].barNumber === Math.floor(barNumber)) {
                // Get the left bound of the current bar and add 
                return this._scrollObjects[i].leftBound + (barNumber % 1) * this._scrollObjects[i].numberOfBeats * this.beatWidth;
            }
        }
        return -1;
    }

    /**
     * Should be reimplemented by subclasses to offset all children correctly.
     * Applies a given pixel offset to the x coordinate all known children of this object.
     * 
     *
     * @protected
     * @param {number} pixelOffset The number of pixels to offset by
     * @memberof ScrollableTimeline
     */
    protected _offsetChildren(pixelOffset: number) {
        this._scrollObjects.forEach(child => {
            child.x -= pixelOffset;
        });

        for (let i = 0; i < this._eventContainer.children.length; i++) {
            this._eventContainer.children[i].x -= pixelOffset;
        }

        // After offsetting, ensure the screen is still filled with bars
        this._checkBarsFillScreen();

        this._repositionTimelineMarker(this.songManager.quarterNotePosition);
    }

    /**
     * Clears the screen and regenerates the timeline from a given bar number - places the first bar at startX.
     *
     * @private
     * @param {number} fromBar The bar to start generating from
     * @param {number} toBar The bar to which generation should at least run to
     * @memberof ScrollableTimeline
     */
    protected _regenerateTimeline(fromBar: number, toBar?: number) {
        let currentBar = fromBar;
        // Clear existing timeline
        while (this._scrollObjects.length > 0) {
            this._returnScrollableBar(this._scrollObjects[0]);
            this._scrollObjects.splice(0, 1);
        }

        // Generate new timeline
        let currentXPosition = this.startX;
        while (currentXPosition < this.endX) {
            let bar = this._initialiseScrollableBar(currentXPosition, currentBar, true);
            this._scrollObjects.push(bar);
            currentBar++;
            currentXPosition = bar.rightBound;
        }

        if (toBar != undefined) {
            while (currentBar <= toBar) {
                let bar = this._initialiseScrollableBar(currentXPosition, currentBar, true);
                this._scrollObjects.push(bar);
                currentBar++;
                currentXPosition = bar.rightBound;
            }
        }

        if (this._eventContainer.children.length == 0) {
            this._initialiseTrackTimelineEvents();
        }
        else {
            this._eventContainer.children.forEach(event => {
                if (event instanceof TrackTimelineEvent) {
                    let [x, width] = this._getTimelineEventXWidth(event.eventStartPosition, event.eventStartPosition + event.eventDuration);
                    event.reinitialise(x, width);
                }
            });
        }
        
        this._redrawTimelineMarker();
    }

    /**
     * Initialises all TrackTimelineEvents (before instead moving them around in other timeline regenerations)
     *
     * @protected
     * @abstract
     * @memberof ScrollableTimeline
     */
    protected abstract _initialiseTrackTimelineEvents();

    /**
     * Ensures the the screen is filled with scrollable objects (both to the left and right of the existing bars)
     *
     * @private
     * @memberof ScrollableTimeline
     */
    protected _checkBarsFillScreen() {
        // Fill left (to 0)
        while (this._scrollObjects[0].leftBound > this.startX && this._scrollObjects[0].barNumber != 0) {
            let bar = this._initialiseScrollableBar(this._scrollObjects[0].leftBound, this._scrollObjects[0].barNumber - 1, false);
            this._scrollObjects.splice(0, 0, bar);
        }
        // Fill right
        while (this._scrollObjects[this._scrollObjects.length - 1].rightBound < this.endX) {
            let bar = this._initialiseScrollableBar(this._scrollObjects[this._scrollObjects.length - 1].rightBound, this._scrollObjects[this._scrollObjects.length - 1].barNumber + 1, true);
            this._scrollObjects.push(bar);
        }
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
     * Initialises a new scrollable object with the given values, and generates any events that exist at this bar.
     *
     * @protected
     * @param {number} xPosition The x coordinate to initialise the new bar at
     * @param {number} barNumber The number for this bar
     * @param {boolean} [leftSide=true] Whether the x coordinate represents the left bound of that bar (use false if the bar should be placed to the left of the x coordinate)
     * @returns {ScrollableBar}
     * @memberof ScrollableTimeline
     */
    protected _initialiseScrollableBar(xPosition: number, barNumber: number, leftSide: boolean): ScrollableBar {
        // Get a bar object
        let bar: ScrollableBar = null;
        if (this._barPool.objectCount > 0) {
            bar = this._barPool.getObject();
            bar.setVisible(true);
        }
        else {
            bar = new ScrollableBar(this._headerContainer);
            this._barContainer.addChild(bar);
        }

        // Positions the bar object
        let quarterNotePosition = this.metadata.positionBarsToQuarterNote(barNumber);
        let numberOfBeats = this.metadata.getTimeSignature(quarterNotePosition)[0];
        bar.initialise(xPosition, Math.max(this.contentHeight, this.endY), barNumber, numberOfBeats, this.beatWidth, leftSide);
        bar.verticalScrollPosition = this._verticalScrollPosition;
        return bar;
    }

    /**
     * Returns a bar object to the pool
     *
     * @protected
     * @param {ScrollableBar} instance
     * @memberof ScrollableTimeline
     */
    protected _returnScrollableBar(instance: ScrollableBar) {
        instance.setVisible(false);
        this._barPool.returnObject(instance);
    }

    /**
     * Returns if a timelineEvent is under a given PIXI InteractionEvent
     *
     * @private
     * @param {PIXI.InteractionEvent} event
     * @returns {TrackTimelineEvent} The child that was hit (null if none was hit)
     * @memberof SongTimeline
     */
    protected _getTimelineEventHit(event: PIXI.InteractionEvent): TrackTimelineEvent {
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
     * Snaps a coordinate to the drag type of this timeline
     *
     * @private
     * @param {number} value The coordinate (pixels)
     * @returns
     * @memberof ScrollableTimeline
     */
    protected snapToDragType(value: number) {
        return value - this.getPixelOffsetFromDragType(value);
    }

    protected getPixelOffsetFromDragType(value: number) {
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

    /**
     * Gets the x coordinate and the width of a timeline event
     *
     * @private
     * @param {number} startPosition (quarter notes)
     * @param {number} endPosition (quarter notes)
     * @returns {number[]} [x, width]
     * @memberof SongTimeline
     */
    protected _getTimelineEventXWidth(startPosition: number, endPosition: number): number[] {
        let x = this._getTimelineEventX(startPosition);
        let width = (this.metadata.positionQuarterNoteToBeats(endPosition) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;
        return [x, width]
    }

    protected _getTimelineEventX(position: number): number {
        return (this.metadata.positionQuarterNoteToBeats(position) - this.metadata.positionQuarterNoteToBeats(this.metadata.positionBarsToQuarterNote(this._scrollObjects[0].barNumber))) * this.beatWidth + this._scrollObjects[0].leftBound;
    }

    protected _playingStateChanged(value: boolean) {
        if (value == true) {
            this.timelineMode = TimelineMode.Playback;
            requestAnimationFrame(this._boundTimelineAnim);
        }
        else {
            this.timelineMode = TimelineMode.Edit;
        }
    }

    protected _timelineMarkerAnim(timestamp: number) {
        this._repositionTimelineMarker(this.songManager.quarterNotePosition);

        if (this.songManager.playing == true) {
            requestAnimationFrame(this._boundTimelineAnim);
        }
    }

    /**
     * Redraws the timeline marker
     *
     * @protected
     * @memberof ScrollableTimeline
     */
    protected _redrawTimelineMarker() {
        this._timelineMarker.redraw(
            0,
            UIPositioning.timelineHeaderHeight,
            5 * this._zoomScale,
            Math.max(this.contentHeight, this.endY)
        );
        this._repositionTimelineMarker(this.songManager.quarterNotePosition);
    }

    /**
     * Repositions the timeline marker over a given quarter note position
     *
     * @protected
     * @param {number} position
     * @memberof ScrollableTimeline
     */
    protected _repositionTimelineMarker(position: number) {
        this._timelineMarker.x = this._getTimelineEventX(position);
    }
}