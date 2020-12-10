import * as PIXI from "pixi.js";
import { UITrack, NoteUITrack, SoundFileUITrack } from "../Shared/UITrack.js";
import { NoteGroupTimelineEvent, OneShotTimelineEvent, TrackTimelineEvent } from "../Shared/TrackTimelineEvent.js";
import { UIColors } from "../Settings/UITheme.js";
import { SecondsBaseEvent } from "../../Model/Notation/SongEvents.js";
import { SongManager } from "../../Model/SongManagement/SongManager.js";
import { ScrollableTimeline } from "../Shared/ScrollableTimeline.js";
import { TimelineMode, MouseClickType } from "../Settings/Enums.js";
import { editType } from "../Settings/EditType.js";
import { UITrackStore } from "../ReactUI/UITrackStore.js";
import { ScrollableBar } from "../Shared/ScrollableBar.js";

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

    private _noteGroupTimelineEvents: NoteGroupTimelineEvent[];

    // Event creation variables
    private _newEventGraphics: PIXI.Graphics;
    private _newEventData: INewEventData;

    private _showSequencerCallback: Function;

    private _cleanupListener : Function;

    /**
     *Creates an instance of SongTimeline.
     * @param {number} startX The x coordinate in the parent where this timeline should start (pixels)
     * @param {number} endX The width of the view (pixels)
     * @param {number} endY The height of the view (pixels)
     * @param {SongMetadata} metadata The metadata this SongTimeline is a part of
     * @param {UITrack[]} tracks The tracks this timeline should display
     * @memberof SongTimeline
     */
    constructor(startX: number, endX: number, endY: number, songManager: SongManager, showSequencerCallback: Function) {
        super(startX, endX, 0, endY, songManager);
        this.songManager = songManager;
        this._noteGroupTimelineEvents = [];
        this._showSequencerCallback = showSequencerCallback;

        this._newEventGraphics = new PIXI.Graphics();
        this.addChild(this._newEventGraphics);

        this._regenerateTimeline(0);

        this._UITrackUpdateHandler = this._UITrackUpdateHandler.bind(this);

        this._cleanupListener = UITrackStore.subscribe(this._UITrackUpdateHandler);
    }

    get contentHeight() {
        let tracks = UITrackStore.getState().tracks;
        if (tracks.length == 0) {
            return 0;
        }
        else {
            return tracks[tracks.length - 1].startY + tracks[tracks.length - 1].height;
        }
    }

    public destroy() {
        this._cleanupListener();
        super.destroy();
    }

    public pointerMoveHandler(event: PIXI.InteractionEvent) {
        let tracks = UITrackStore.getState().tracks;

        this._newEventGraphics.visible = false;
        super.pointerMoveHandler(event);
        if (this.timelineMode == TimelineMode.Edit && this._mouseClickType == MouseClickType.None) {
            this._newEventData = undefined;
            // Display new event outline (set width for note events, same length as soundfile for soundfile)
            let mousePos = event.data.getLocalPosition(this.parent);
            mousePos.y -= this._newEventGraphics.y;
            for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].startY + this._verticalScrollPosition < mousePos.y && tracks[i].startY + tracks[i].height + this._verticalScrollPosition > mousePos.y) {
                    let track = tracks[i];

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
                        let existingEvents = track.getOneShotsBetweenTime(startPosition, endPosition);
                        if (!track.track.allowOverlaps && existingEvents.length > 0) {
                            return;
                        }
                        else {
                            if (existingEvents.length == 1 && existingEvents[0].startPosition == startPosition && existingEvents[0].endPosition == endPosition) {
                                return;
                            }
                        }
                    }

                    width = (this.metadata.positionQuarterNoteToBeats(endPosition) - this.metadata.positionQuarterNoteToBeats(startPosition)) * this.beatWidth;
                    // Fixes a bug where very small events won't display properly.
                    width = Math.max(width, 5);

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
        else {
            this._newEventGraphics.visible = false;
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
                this._initialiseOneShotTimelineEvent(event, track);
            }
            this._newEventData = undefined;
        }
    }

    public mouseWheelHandler(event: WheelEvent, canvasX: number, canvasY: number) {
        this._newEventGraphics.visible = false;
        super.mouseWheelHandler(event, canvasX, canvasY);
    }

    /**
     * Clears all tracks and redraws them all, including TrackTimelineEvents
     * Use when inserting or removing a UITrack
     *
     * @memberof SongTimeline
     */
    public regenerateTracks() {
        while (this._eventContainer.children[0]) {
            let timelineEvent = this._eventContainer.children[0] as TrackTimelineEvent;
            timelineEvent.destroy();
        }

        this._noteGroupTimelineEvents = [];

        this._initialiseTrackTimelineEvents();
    }

    /**
     * Reinitialises the TrackTimelineEvents for a given Track
     *
     * @memberof SongTimeline
     */
    public reinitialiseTrack(track : UITrack) {
        for (let i = 0; i < this._eventContainer.children.length; i++) {
            let timelineEvent = this._eventContainer.children[i] as TrackTimelineEvent;
            if (timelineEvent.track === track) {
                timelineEvent.reinitialise();
            }
        }
    }

    /**
     * Removes all note group timeline events and creates them again.
     *
     * @memberof SongTimeline
     */
    public regenerateNoteGroups() {
        this._noteGroupTimelineEvents.forEach(timelineEvent => {
            timelineEvent.destroy();
        });

        this._noteGroupTimelineEvents = [];

        UITrackStore.getState().tracks.forEach(track => {
            if (track instanceof NoteUITrack) {
                track.noteGroups.forEach(noteGroup => {
                    this._initialiseNoteGroup(noteGroup, track);
                });
            }
        });
    }

    public addedHandler() {
        this.regenerateNoteGroups();
        editType.noteLengthDisabled = true;
        super.addedHandler();
    }

    protected _initialiseTrackTimelineEvents() {
        let tracks = UITrackStore.getState().tracks;

        for (let i = 0; i < tracks.length; i++) {
            let track = tracks[i];
            if (track instanceof NoteUITrack) {
                // Get all note groups that should be generated in the current bar range
                track.noteGroups.forEach(group => {
                    this._initialiseNoteGroup(group, track as NoteUITrack);
                });
            }
            else if (track instanceof SoundFileUITrack) {
                track.track.timeline.events.forEach(event => {
                    this._initialiseOneShotTimelineEvent(event, track as SoundFileUITrack);
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
    private _initialiseNoteGroup(noteGroup: number[], track: NoteUITrack): NoteGroupTimelineEvent {
        // starting x position is calculated as follows:
        // (Position of note group start in beats - the position of the first DISPLAYED bar in beats) * beat width * zoom + the start position of the first DISPLAYED bar in pixels
        let event = new NoteGroupTimelineEvent(this, track, noteGroup, this._showSequencerCallback);
        this._eventContainer.addChild(event);
        this._noteGroupTimelineEvents.push(event);
        return event;
    }

    private _initialiseOneShotTimelineEvent(event: SecondsBaseEvent, track: SoundFileUITrack): OneShotTimelineEvent {
        let timelineEvent = new OneShotTimelineEvent(this, track, event);
        this._eventContainer.addChild(timelineEvent);
        return timelineEvent;
    }

    private _UITrackUpdateHandler() {
        let barHeight = Math.max(this.contentHeight, this.endY);
        for(let i = 0; i < this._barContainer.children.length; i++) {
            let bar = this._barContainer.children[i] as ScrollableBar;
            bar.resize(barHeight);
        }
        this.regenerateTracks();
    }
}
