import * as PIXI from "pixi.js";
import { ObjectPool } from "../../HelperModules/ObjectPool.js";
import SongMetadata from "../../Model/SongManagement/SongMetadata.js";
import { UITrack, NoteUITrack } from "../UIObjects/UITrack.js";
import { Bar } from "./Bar.js";
import { TrackTimelineEvent, NoteGroupTimelineEvent } from "./TrackTimelineEvent.js";
import { NoteEvent } from "../../Model/Notation/SongEvents.js";

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

    private _barContainer : PIXI.Container;
    private _eventContainer : PIXI.Container;

    private _objectPool: ObjectPool<Bar>;
    private _bars: Bar[];
    private _trackEvents: Map<string, TrackTimelineEvent>;

    // Beat position variables
    private _zoomScale = 1;

    // Scrolling variables
    private _startPointerPosition: PIXI.Point;
    private _startXPosition: number;
    private _isDragging: boolean;

    /**
     * Creates an instance of SongTimeline.
     * @param {number} startX The x coordinate in the parent where this timeline should start (pixels)
     * @param {number} viewWidth The width of the view (pixels)
     * @param {number} viewHeight The height of the view (pixels)
     * @memberof BarTimeline
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
        this._trackEvents = new Map<string, TrackTimelineEvent>();

        this._barContainer = new PIXI.Container();
        this._eventContainer = new PIXI.Container();
        this.addChild(this._barContainer, this._eventContainer);

        this._regenerateTimeline(0);
    }

    get isDragging() {
        return this._isDragging;
    }

    public pointerDownHandler(event: PIXI.InteractionEvent) {
        this._startPointerPosition = event.data.getLocalPosition(this.parent);
        this._startXPosition = this.x;
        this._isDragging = true;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        if (this._isDragging) {
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
    }


    public pointerUpHandler(event: PIXI.InteractionEvent) {
        this._startXPosition = undefined;
        this._startPointerPosition = undefined;
        this._isDragging = false;

        this._offsetChildren(-this.x);
        this.x = 0;

    }


    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        let stageX = event.clientX - canvasX;
        let stageY = event.clientY - canvasY;
        if (stageX < this.startX || stageX > this.endX || stageY < 0 || stageY > this.endY) {
            return;
        }
        else if (!this._isDragging) {
            // TODO: this functions correctly, but it needs some work.
            // Right now, the regenerate function generates a lot of extra bars to the before the bar to scroll to
            // Which is quite wasteful
            // TODO: fix track events when zooming occurs (probably just need to regenerate them if that's not too expensive).

            // Get the mouse's position in bars (based on the screen)
            let mouseBarPosition = this.getBarFromStageCoordinates(stageX);
            // Change the scaling
            this._zoomScale = Math.max(0.5, Math.min(5.0, this._zoomScale - event.deltaY / 1000));
            // Regenerate the bars (at least until the bar we need)
            this._regenerateTimeline(this._bars[0].barNumber, Math.floor(mouseBarPosition));
            // Get the offset required to put the original position under the mouse
            let offset = this.getStageCoordinatesFromBar(mouseBarPosition) - stageX;
            // If the first bar is bar 0, check the offset won't cause it to go past the left side of the timeline view.
            if (this._bars[0].barNumber === 0 && this._bars[0].leftBound - offset > this.startX) {
                // If it will, instead set the offset at most to the offset needed to put bar 0 at the start of the timeline view.
                offset = this.startX - this._bars[0].leftBound;
            }
            this._offsetChildren(offset);
        }
    }


    private getBarFromStageCoordinates(stageX: number) {
        for (let i = 0; i < this._bars.length; i++) {
            if (this._bars[i].leftBound < stageX && this._bars[i].rightBound > stageX) {
                // Calculate the bar number + the percentage through the bar that the mouse position
                return this._bars[i].barNumber + ((stageX - this._bars[i].leftBound) / (SongTimeline.beatWidth * this._zoomScale) / this._bars[i].numberOfBeats);
            }
        }
    }


    private getStageCoordinatesFromBar(barNumber: number) {
        for (let i = 0; i < this._bars.length; i++) {
            if (this._bars[i].barNumber === Math.floor(barNumber)) {
                // Get the left bound of the current bar and add 
                return this._bars[i].leftBound + (barNumber % 1) * this._bars[i].numberOfBeats * SongTimeline.beatWidth * this._zoomScale;
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
     * Scrolls the view so that a given quarter note is at the start of the view.
     *
     * @private
     * @param {number} quarterNote The quarter note to start at
     * @memberof BarTimeline
     */
    private _scrollToPosition(quarterNote: number) {
        // Get the quarter note position as a bar + percentage
        let barPosition = this.metadata.positionQuarterNoteToBars(quarterNote);
        // Regenerate the bars starting at the bar given by the metadata.
        let barNumber = Math.floor(barPosition);
        this._regenerateTimeline(barNumber);

        // Calculate the number of pixels to scroll by using the time signature (to get the number of beats)
        let scrollAmount = this.metadata.getTimeSignature(quarterNote)[0] * (barPosition % 1) * SongTimeline.beatWidth * this._zoomScale;
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

        for (let event of this._trackEvents.values()) {
            this.removeChild(event);
            event.destroy();
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

        for(let i = 0; i < this.tracks.length; i++) {
            let track = this.tracks[i];
            if (track instanceof NoteUITrack) {
                // Get all note groups that should be generated in the current bar range
                track.noteGroups.forEach(group => {
                    let event = this._initialiseNoteGroup(group, track as NoteUITrack, this._bars[0].leftBound, fromBar)
                    this._trackEvents.set(track.track.id + group[0].toString(), event);
                });
            }
        };
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
     * @param {number} barNumber The bar number this track will be initialised at.
     * @param {number} xPosition The x position the bar starts at.
     * @memberof SongTimeline
     */
    private _initialiseNoteGroup(noteGroup : number[], track : NoteUITrack, xPosition : number,  barNumber : number) : TrackTimelineEvent {
        let event = new NoteGroupTimelineEvent(
            this.metadata.positionQuarterNoteToBeats(noteGroup[0] - this.metadata.positionBarsToQuarterNote(barNumber)) * SongTimeline.beatWidth + xPosition,
            track.startY, 
            this.metadata.positionQuarterNoteToBeats(noteGroup[1]) * SongTimeline.beatWidth * this._zoomScale, 
            track.height, 
            track.track.timeline.getEventsBetweenTimes(noteGroup[0], noteGroup[1]) as NoteEvent[],
            track.track.highestPitch,
            track.track.lowestPitch,
            noteGroup);
        this._eventContainer.addChild(event);
        return event;
    }
}
