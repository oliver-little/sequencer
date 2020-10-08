import * as PIXI from "pixi.js";
import { UITrack, NoteUITrack, SoundFileUITrack } from "../UIObjects/UITrack.js";
import { TrackTimelineEvent, NoteGroupTimelineEvent, OneShotTimelineEvent } from "../Shared/TrackTimelineEvent.js";
import { UIColors, UIPositioning } from "../Shared/UITheme.js";
import { BaseEvent } from "../../Model/Notation/SongEvents.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { TimelineMode, MouseClickType } from "../Shared/Enums.js";

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

    // Event creation variables
    private _newEventGraphics: PIXI.Graphics;
    private _newEventData: INewEventData;

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
    }

    get contentHeight() {
        return UIPositioning.timelineHeaderHeight + this.tracks[this.tracks.length - 1].startY + this.tracks[this.tracks.length - 1].height;
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        this._newEventGraphics.visible = false;
        super.pointerMoveHandler(event);
        if (this._mouseClickType == MouseClickType.None) {
            this._newEventData = undefined;
            // Display new event outline (set width for note events, same length as soundfile for soundfile)
            let mousePos = event.data.getLocalPosition(this.parent);
            mousePos.y -= this._newEventGraphics.y;
            for (let i = 0; i < this.tracks.length; i++) {
                if (this.tracks[i].startY + this._verticalScrollPosition < mousePos.y && this.tracks[i].startY + this.tracks[i].height + this._verticalScrollPosition > mousePos.y) {
                    let track = this.tracks[i];

                    if (mousePos.x < this.startX || mousePos.x > this.endX) {
                        return;
                    }

                    // Get mouse position as bar position
                    let [barPosition, beatPosition, numBeats] = this._getBarFromStageCoordinates(mousePos.x);
                    // Snap beat position
                    beatPosition = this.snapBeatToDragType(beatPosition);
                    // Add snapped beat position as percentage to barPosition
                    barPosition += beatPosition / numBeats;

                    let startPosition = this.metadata.positionBarsToQuarterNote(barPosition);
                    let endPosition = startPosition;
                    let x = this._getStageCoordinatesFromBar(barPosition);
                    let y = track.startY + this._verticalScrollPosition;
                    let width = 0;
                    let height = track.height;
                    if (track instanceof NoteUITrack) {
                        endPosition = startPosition + 4;
                        if (track.getNoteGroupsWithinTime(startPosition, endPosition).length > 0) {
                            return;
                        }
                    }
                    else if (track instanceof SoundFileUITrack) {
                        endPosition = startPosition + track.eventDuration;
                        if (track.getOneShotsBetweenTime(startPosition, endPosition).length > 0) {
                            return;
                        }
                    }

                    width = (this.metadata.positionQuarterNoteToBeats(endPosition) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;
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
        if (this._mouseClickType == MouseClickType.LeftClick && this.timelineMode == TimelineMode.Edit && this._newEventData != undefined) {
            let track = this._newEventData.track;
            let startPosition = this._newEventData.startPosition;
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
        let event = new NoteGroupTimelineEvent(this, track, noteGroup);
        this._eventContainer.addChild(event);
        return event;
    }

    private _initialiseTimelineEvent(event: BaseEvent, track: UITrack): TrackTimelineEvent {
        let timelineEvent = new OneShotTimelineEvent(this, track, event);
        this._eventContainer.addChild(timelineEvent);
        return timelineEvent;
    }
}
