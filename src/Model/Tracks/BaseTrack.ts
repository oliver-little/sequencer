import SongMetadata from "../SongManagement/SongMetadata.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import {EventTimeline} from "../Notation/EventTimeline.js";
import {BaseEvent} from "../Notation/SongEvents.js";

/**
 * Works with the timeline and instrument objects to schedule notes as required
 *
 * @export
 * @class BaseTrack
 */
export abstract class BaseTrack {

    // The amount of time to look
    public lookaheadTime = 0.125;

    public timeline : EventTimeline;

    protected _metadata : SongMetadata;
    protected _context : AudioContext;
    protected _startTime = 0; // Stores the audioContext time at which playback was started
    protected _scheduleEvent : SimpleEvent; // Stores the event which fires every time song events should be scheduled.

    constructor (metadata : SongMetadata, context : AudioContext) {
        this.timeline = new EventTimeline();
        this._context = context;
        this._metadata = metadata;
    }

    /**
     * Sets up object states to begin playback
     *
     * @param {number} audioContextTime The **AudioContext** time at which the playback was started
     * @param {number} startPosition The position **in quarter notes** where playback was started from
     * @param {SimpleEvent} scheduleEvent The event fired to schedule new notes
     * @memberof BaseTrack
     */
    public start(scheduleEvent : SimpleEvent, startPosition = 0) : void {
        this._startTime = this._context.currentTime;
        this.timeline.start(startPosition);
        this._scheduleEvent = scheduleEvent;
        // FIXME: Possible bug here, are callbacks different between class instances.
        this._scheduleEvent.addListener(function() {this.scheduleSongEvents()}.bind(this));
    }

    public stop() : void {
        this._scheduleEvent.removeListener(this.scheduleSongEvents);
    }


    /**
     * Schedules upcoming playback events (start **must** be called first)
     *
     * @memberof BaseTrack
     */
    public scheduleSongEvents() {
        // This calculation works out the amount of time that has passed since playback began, adds the lookahead buffer, then converts it into number of quarter notes.
        let quarterNoteTime = ((this._context.currentTime - this._startTime + this.lookaheadTime) / this._metadata.secondsPerBeat) / this._metadata.quarterNoteMultiplier;
        let events = this.timeline.getEventsUntilTime(quarterNoteTime);
        events.forEach(event => {
            this.songEventHandler(event);
        });
    }

    /**
     * Handler for song events, different for each type of track
     *
     * @abstract
     * @param {BaseEvent} event The BaseEvent (but will be a child)
     * @memberof BaseTrack
     */
    protected abstract songEventHandler(event: BaseEvent) : void;
}