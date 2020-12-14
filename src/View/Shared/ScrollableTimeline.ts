import * as PIXI from "pixi.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import { ScrollableBar } from "./ScrollableBar.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { MouseClickType, TimelineMode, EventSnapType } from "../Settings/Enums.js";
import { TrackTimelineEvent } from "./TrackTimelineEvent.js";
import { TimelineMarker } from "./TimelineMarker.js";
import { UIPositioning } from "../Settings/UITheme.js";
import { MouseTypeContainer } from "./InteractiveContainer.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import { editType } from "../Settings/EditType.js";

/**
 * Provides a basic implementation of a timeline, including pooled bar objects using ScrollableBar
 * as well as customisable TrackTimelineEvents
 *
 * @export
 * @abstract
 * @class ScrollableTimeline
 * @extends {PIXI.Container}
 */
export abstract class ScrollableTimeline extends MouseTypeContainer {

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
    public get dragType() : EventSnapType {
        return editType.snapType;
    }

    /**
     * Event called when the timeline's position is changed in any way (pan, zoom)
     *
     * @type {SimpleEvent}
     * @memberof ScrollableTimeline
     */
    public timelineViewChange : SimpleEvent;

    protected _zoomScale = 1;

    protected _scrollObjects: ScrollableBar[];
    protected _barPool: ObjectPool<ScrollableBar>;

    protected _headerContainer: PIXI.Container;
    protected _metadataEventContainer : PIXI.Container;
    protected _eventContainer: PIXI.Container;
    protected _barContainer: PIXI.Container;

    protected abstract readonly contentHeight: number;

    protected _startXPosition: number;
    protected _verticalScrollPosition: number = 0;

    protected _mouseClickType: MouseClickType = MouseClickType.None;

    protected _interactivityRect: PIXI.Graphics;

    protected _selected: TrackTimelineEvent[] = [];

    // Timeline marker variables
    protected _timelineMarker: TimelineMarker;

    private _onScreen : boolean;

    constructor(startX: number, endX: number, startY: number, endY: number, songManager: SongManager) {
        super();
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.songManager = songManager;
        this._onScreen = true;
        this.timelineViewChange = new SimpleEvent();

        this._scrollObjects = [];
        this._barPool = new ObjectPool();

        this._interactivityRect = new PIXI.Graphics();
        this.addChild(this._interactivityRect);
        this.resizeInteractiveArea(endX, endY);

        this._barContainer = new PIXI.Container();
        this._headerContainer = new PIXI.Container();
        this._metadataEventContainer = new PIXI.Container();
        this._eventContainer = new PIXI.Container();
        this.addChild(this._barContainer, this._eventContainer, this._headerContainer, this._metadataEventContainer);

        this._timelineMarker = new TimelineMarker();
        this.addChild(this._timelineMarker);

        this._timelineMarkerAnim = this._timelineMarkerAnim.bind(this);
        this._playingStateChanged = this._playingStateChanged.bind(this);
        this._repositionTimelineMarker = this._repositionTimelineMarker.bind(this);
        this.songManager.playingChangedEvent.addListener(this._playingStateChanged);
    }

    get metadata() {
        return this.songManager.metadata;
    }

    get beatWidth() {
        return ScrollableTimeline.beatWidth * this._zoomScale;
    }

    public resize(width : number, height : number) {
        this.resizeInteractiveArea(width, height);
        this.endX = width;
        this.endY = height;

        let barHeight = Math.max(this.contentHeight, this.endY);
        for(let i = 0; i < this._barContainer.children.length; i++) {
            let bar = this._barContainer.children[i] as ScrollableBar;
            bar.resize(barHeight);
        }

        // Only need to do calculations on the right side because the left side doesn't move
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
    }

    public resizeInteractiveArea(width: number, height: number) {
        this._interactivityRect.clear();
        this._interactivityRect.beginFill(0x000000, 1.0);
        this._interactivityRect.drawRect(0, 0, width, height);
        this._interactivityRect.endFill();
        this._interactivityRect.alpha = 0.0;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        super.pointerDownHandler(event);

        if (this._mouseClickType == MouseClickType.None) {
            return;
        }
        else if (this._mouseClickType == MouseClickType.LeftClick) {
            this.timelineViewChange.emit();
        }

        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._startXPosition = this.x;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.RightClick && this.timelineMode == TimelineMode.Edit) {
            // TODO: Add hover effect for TrackTimelineEvents
        }
        else if (this._mouseClickType == MouseClickType.LeftClick) {
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
    }

    public pointerUpHandler(event: PIXI.InteractionEvent) {
        super.pointerUpHandler(event);
        this._startXPosition = undefined;
        this._startPointerPosition = undefined;  
    }

    public pointerUpClickHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick) {
            this.x = this._startXPosition;

            if ((this.timelineMode == TimelineMode.Playback || this._startPointerPosition.y < UIPositioning.timelineHeaderHeight) && this._startPointerPosition.x > this.startX) {
                let [barPosition, beatPosition, numberOfBeats] = this._getBarFromStageCoordinates(this._startPointerPosition.x);
                barPosition += beatPosition/numberOfBeats;
                this.songManager.quarterNotePosition = this.metadata.positionBarsToQuarterNote(barPosition);
            }
        }
    }

    public pointerUpDragHandler(event: PIXI.InteractionEvent) {
        if (this._mouseClickType == MouseClickType.LeftClick) {
            // Normal drag
            this._offsetChildren(-this.x);
            this.x = 0;

            if (editType.markerCentered) {
                editType.markerCentered = false;
            }
        }
    }

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        let stageX = event.clientX - canvasX;
        let stageY = event.clientY - canvasY;
        if (stageX < this.startX || stageX > this.endX || stageY < 0 || stageY > this.endY) {
            return;
        }

        this.timelineViewChange.emit();

        // Get the mouse's position in bars (based on the screen)
        let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(stageX);
        barPosition += beatPosition / numBeats;
        // Change the scaling
        this._zoomScale = Math.max(0.5, Math.min(5.0, this._zoomScale - event.deltaY / 1000));

        this._regenerateTimeline(this._scrollObjects[0].barNumber, Math.floor(barPosition));
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

        this._eventContainer.y = value;

        this._verticalScrollPosition = value;
    }


    /**
     * Regenerates the timeline, keeping a given bar position at the same position on the screen
     *
     * @param {number} barPosition
     * @memberof ScrollableTimeline
     */
    public regenerateAroundPosition(barPosition: number) {
        let startBarPosition = this._getStageCoordinatesFromBar(barPosition);
        // Regenerate the bars (at least until the bar we need)
        this._regenerateTimeline(this._scrollObjects[0].barNumber, Math.floor(barPosition));
        // Get the offset required to put the original position under the mouse
        let offset = this._getStageCoordinatesFromBar(barPosition) - startBarPosition;

        // If the first bar is bar 0, check the offset won't cause it to go past the left side of the timeline view.
        if (this._scrollObjects[0].barNumber === 0 && this._scrollObjects[0].leftBound - offset > this.startX) {
            // If it will, instead set the offset at most to the offset needed to put bar 0 at the start of the timeline view.
            offset = this.startX - this._scrollObjects[0].leftBound;
        }
        this._offsetChildren(offset);
    }

    public addedHandler() {
        this._onScreen = true;
        this._playingStateChanged(this.songManager.playing);
        this.regenerateAroundPosition(0);
    }

    public removedHandler() {
        this._onScreen = false;
        this._playingStateChanged(false);
        this._mouseClickType = MouseClickType.None;
    }

    public destroy() {
        this.songManager.playingChangedEvent.removeListener(this._playingStateChanged);
        super.destroy({children : true});
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
                return this._scrollObjects[i].leftBound + ((barNumber % 1) * this._scrollObjects[i].numberOfBeats * this.beatWidth);
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
            child.setX(child.x - pixelOffset);
        });

        for (let i = 0; i < this._eventContainer.children.length; i++) {
            this._eventContainer.children[i].x -= pixelOffset;
        }

        for (let i = 0; i < this._metadataEventContainer.children.length; i++) {
            this._metadataEventContainer.children[i].x -= pixelOffset;
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

        // This wipes all events and regenerates them, there could be an efficiency improvement here by only destroying the ones necessary to destroy.
        if (this._eventContainer.children.length == 0) {
            this._initialiseTrackTimelineEvents();
        }
        else {
            for (let i = 0; i < this._eventContainer.children.length; i++) {
                let event = this._eventContainer.children[i] as TrackTimelineEvent;
                event.reinitialise();
            }
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
            bar = new ScrollableBar(this._headerContainer, this);
            this._barContainer.addChild(bar);
        }

        // Positions the bar object
        let quarterNotePosition = this.metadata.positionBarsToQuarterNote(barNumber);
        let numberOfBeats = this.metadata.getTimeSignature(quarterNotePosition)[0];
        let metadataEventActive = !(this.metadata.events.binarySearch(quarterNotePosition) == -1);
        bar.initialise(xPosition, Math.max(this.contentHeight, this.endY), barNumber, numberOfBeats, this.beatWidth, quarterNotePosition, metadataEventActive, leftSide);
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
     * Snaps a coordinate to the drag type of this timeline
     *
     * @public
     * @param {number} value The coordinate (pixels)
     * @returns
     * @memberof ScrollableTimeline
     */
    public snapCoordinateToDragType(value: number) {
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

    protected snapBeatToDragType(value: number) {
        switch (this.dragType) {
            case EventSnapType.None:
                break;
            case EventSnapType.Beat:
                value = value - (value % 1)
                break;
            case EventSnapType.HalfBeat:
                value *= 2;
                value = (value - (value % 1)) / 2;
                break;
            case EventSnapType.QuarterBeat:
                value *= 4;
                value = (value - (value % 1)) / 4;
                break;
            case EventSnapType.EighthBeat:
                value *= 8;
                value = (value - (value % 1)) / 8;
                break;
        }
        return value;
    }

    /**
     * Gets the x coordinate and the width of a quarter note position
     *
     * @public
     * @param {number} startPosition (quarter notes)
     * @param {number} endPosition (quarter notes)
     * @returns {number[]} [x, width]
     * @memberof SongTimeline
     */
    public getTimelineEventXWidth(startPosition: number, endPosition: number): number[] {
        let x = this.getTimelineEventX(startPosition);
        let width = (this.metadata.positionQuarterNoteToBeats(endPosition) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;
        return [x, width]
    }

    public getTimelineEventX(position: number): number {
        return (this.metadata.positionQuarterNoteToBeats(position) - this.metadata.positionQuarterNoteToBeats(this.metadata.positionBarsToQuarterNote(this._scrollObjects[0].barNumber))) * this.beatWidth + this._scrollObjects[0].leftBound;
    }

    protected _playingStateChanged(value: boolean) {
        if (value == true && this._onScreen) {
            this.timelineMode = TimelineMode.Playback;
            editType.markerCentered = true;
            requestAnimationFrame(this._timelineMarkerAnim);

        }
        else {
            this.timelineMode = TimelineMode.Edit;
            editType.markerCentered = null;
            if (!this.songManager.quarterNotePositionChangedEvent.hasListener(this._repositionTimelineMarker)) {
                this.songManager.quarterNotePositionChangedEvent.addListener(this._repositionTimelineMarker);
            }
        }
    }

    protected _timelineMarkerAnim() {
        this._repositionTimelineMarker(this.songManager.quarterNotePosition);

        if (this.songManager.playing == true) {
            if (editType.markerCentered && (this._timelineMarker.x > this.endX || this._timelineMarker.x < this.startX)) {
                let barPosition = this.metadata.positionQuarterNoteToBars(this.songManager.quarterNotePosition);
                this._scrollToPosition(barPosition);
            }
            requestAnimationFrame(this._timelineMarkerAnim);
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
            this.endY
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
        if (this._onScreen) {
            this._timelineMarker.x = this.getTimelineEventX(position);
        }
    }
}