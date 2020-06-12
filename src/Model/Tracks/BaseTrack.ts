import SongMetadata from "../SongManagement/SongMetadata.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import {EventTimeline} from "../Notation/EventTimeline.js";
import {BaseEvent} from "../Notation/SongEvents.js";
import {BaseInstrument} from "../Instruments/BaseInstrument.js";

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
    public audioSource : BaseInstrument;

    protected _metadata : SongMetadata;
    protected _context : AudioContext;
    protected _scheduleEvent : SimpleEvent; // Stores the event which fires every time song events should be scheduled.
    protected _startTime = 0; // Stores the AudioContext time at which playback was started.
    protected _quarterNotePosition = 0; // Stores the number of quarter notes passed since the song started playing
    protected _playing = false; 

    private _anonymousScheduleFunc = function() {this.scheduleSongEvents()}.bind(this); // Reference to the anonymous function scheduleEvent calls

    /**
     *Creates an instance of BaseTrack.
     * @param {SongMetadata} metadata The song metadata this track uses.
     * @param {AudioContext} context The audio context this track should play to
     * @param {SimpleEvent} scheduleEvent An event that fires regularly to allow notes to be scheduled.
     * @memberof BaseTrack
     */
    constructor (metadata : SongMetadata, context : AudioContext, scheduleEvent : SimpleEvent, audioSource : BaseInstrument) {
        this.timeline = new EventTimeline();
        this._context = context;
        this._metadata = metadata;
        this._scheduleEvent = scheduleEvent;
        this.audioSource = audioSource;
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

    // Functions rather than getters and setters because these need to be in subclasses too.
    /**
     * Get the AudioContext this object (and it's children) is using
     *
     * @returns
     * @memberof BaseTrack
     */
    public getContext() {
        return this._context;
    }

    public setContext(value : AudioContext) {
       this._context = value;
       this.audioSource.setContext(value);
    }

    /**
     * Begins playback, override by subclasses to determine how to handle the timeline
     *
     * @param {number} startPosition The position **in quarter notes** where playback should start from
     * @memberof BaseTrack
     */
    public start(startPosition = this._quarterNotePosition) : void {
        this._quarterNotePosition = startPosition;
        if (startPosition == 0) {
            this._startTime = this._context.currentTime;
        }
        else {
            this._startTime = this._context.currentTime - this._metadata.positionQuarterNoteToSeconds(this._quarterNotePosition);
        }
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
        this.audioSource.stop();
    }


    /**
     * Schedules upcoming playback events (start **must** be called first)
     *
     * @memberof BaseTrack
     */
    public scheduleSongEvents() {
        if (this._playing) {
            // TODO: move this into the central clock and just have this take the quarterNoteTime as a parameter
            let timeSinceStart = this._context.currentTime - this._startTime;
            this._quarterNotePosition = this._metadata.positionSecondsToQuarterNote(timeSinceStart);
            let quarterNoteTime = this._quarterNotePosition + ((this.lookaheadTime / this._metadata.getSecondsPerBeat(this._quarterNotePosition))
                                                                                    / this._metadata.getQuarterNoteMultiplier(this._quarterNotePosition));
            let events = this.timeline.getEventsUntilTime(quarterNoteTime);
            events.forEach(event => {
                this.songEventHandler(event);
            });
        }
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