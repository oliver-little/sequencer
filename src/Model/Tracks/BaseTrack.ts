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
    protected _playing = false; 
    protected _timeDifference = 0; // Stores the last recorded time difference between the startTime and the audioContext time

    private _anonymousScheduleFunc = function() {this.scheduleSongEvents()}.bind(this); // Reference to the anonymous function scheduleEvent calls

    /**
     *Creates an instance of BaseTrack.
     * @param {SongMetadata} metadata The song metadata this track uses.
     * @param {AudioContext} context The audio context this track should play to
     * @param {SimpleEvent} scheduleEvent An event that fires regularly to allow notes to be scheduled.
     * @memberof BaseTrack
     */
    constructor (metadata : SongMetadata, context : AudioContext, scheduleEvent : SimpleEvent) {
        this.timeline = new EventTimeline();
        this._context = context;
        this._metadata = metadata;
        this._scheduleEvent = scheduleEvent;
    }

    /**
     * Returns whether this object is playing
     *
     * @readonly
     * @memberof BaseTrack
     */
    get playing() {
        return this._playing;
    }

    /**
     * Begins playback, override by subclasses to determine how to handle the timeline
     *
     * @param {number} audioContextTime The **AudioContext** time at which the playback was started
     * @param {number} startPosition The position **in quarter notes** where playback was started from
     * @memberof BaseTrack
     */
    public start(startPosition) : void {
        this._startTime = this._context.currentTime - startPosition;
        this._playing = true;

        // FIXME: Possible bug here, are callbacks different between class instances.
        this._scheduleEvent.addListener(this._anonymousScheduleFunc);
    }

    /**
     * Stops playback at the current position
     *
     * @memberof BaseTrack
     */
    public stop() : void {
        let index = this._scheduleEvent.callbacks.indexOf(this._anonymousScheduleFunc); 
        if(index != -1) {
            this._scheduleEvent.removeAt(index);
        }
        this._playing = false;
    }


    /**
     * Schedules upcoming playback events (start **must** be called first)
     *
     * @memberof BaseTrack
     */
    public scheduleSongEvents() {
        if (this._playing) {
            this._timeDifference = this.toQuarterNoteTime(this._context.currentTime - this._startTime);
            // This calculation works out the amount of time that has passed since playback began, adds the lookahead buffer, then converts it into number of quarter notes.
            let quarterNoteTime = this._timeDifference + this.toQuarterNoteTime(this.lookaheadTime);
            let events = this.timeline.getEventsUntilTime(quarterNoteTime);
            events.forEach(event => {
                this.songEventHandler(event);
            });
        }
    }

    protected toQuarterNoteTime(value: number) : number {
        return (value / this._metadata.secondsPerBeat) / this._metadata.quarterNoteMultiplier;
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