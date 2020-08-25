import * as PIXI from "pixi.js";
import { UITrack, NoteUITrack, SoundFileUITrack } from "../UIObjects/UITrack.js";
import { TrackTimelineEvent, NoteGroupTimelineEvent, OneShotTimelineEvent } from "../Shared/TrackTimelineEvent.js";
import { UIColors } from "../Shared/UITheme.js";
import { BaseEvent } from "../../Model/Notation/SongEvents.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { TimelineMarker } from "./TimelineMarker.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { EventSnapType, TimelineMode, MouseClickType, ClickState } from "../Shared/Enums.js";

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

    public tracks: UITrack[];

    // Scrolling variables
    private _timelineMarker: TimelineMarker;

    // Event creation variables
    private _newEventGraphics: PIXI.Graphics;
    private _newEventData: INewEventData;

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

        this._newEventGraphics = new PIXI.Graphics();
        this.addChild(this._newEventGraphics);

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

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        this._newEventGraphics.visible = false;
        super.pointerMoveHandler(event);
        if (this._mouseClickType == MouseClickType.None) {
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
        super.pointerUpClickHandler(event);
        // Check that the click was a left click, and the click was on the timeline, and the timeline is in edit mode, and there is some valid event data to use to create the object.
        if (this._mouseClickType == MouseClickType.LeftClick && this._clickState == ClickState.Dragging && this.timelineMode == TimelineMode.Edit && this._newEventData != undefined) {
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

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        this._newEventGraphics.visible = false;
        super.mouseWheelHandler(event, canvasX, canvasY);
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

        this._repositionTimelineMarker(this.songManager.quarterNotePosition);
    }

    protected _initialiseTrackTimelineEvents() {
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
}
