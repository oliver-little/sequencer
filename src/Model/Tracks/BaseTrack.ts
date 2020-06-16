import SongMetadata from "../SongManagement/SongMetadata.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import {EventTimeline} from "../Notation/EventTimeline.js";
import {BaseEvent} from "../Notation/SongEvents.js";
import {IInstrument} from "../Instruments/IInstrument.js";

/**
 * Works with the timeline and instrument objects to schedule notes as required
 *
 * @export
 * @class BaseTrack
 */
export abstract class BaseTrack {

    public audioSource : IInstrument;

    protected _timeline : EventTimeline;
    protected _metadata : SongMetadata;
    protected _context : AudioContext|OfflineAudioContext;
    protected _scheduleEvent : SimpleEvent; // Stores the event which fires every time song events should be scheduled.
    protected _startTime = 0; // Stores the AudioContext time at which playback was started.
    protected _playing = false;

    /**
     *Creates an instance of BaseTrack.
     * @param {SongMetadata} metadata The song metadata this track uses.
     * @param {AudioContext|OfflineAudioContext} context The audio context this track should play to
     * @param {SimpleEvent} scheduleEvent An event that fires regularly to allow notes to be scheduled.
     * @memberof BaseTrack
     */
    constructor (metadata : SongMetadata, context : AudioContext|OfflineAudioContext, scheduleEvent : SimpleEvent, audioSource : IInstrument) {
        this._timeline = new EventTimeline();
        this._context = context;
        this._metadata = metadata;
        this._scheduleEvent = scheduleEvent;
        this._scheduleEvent.addListener(function(quarterNotePosition : number) {this.scheduleSongEvents(quarterNotePosition)}.bind(this));
        this.audioSource = audioSource;
    }

    get timeline() {
        return this._timeline;
    }

    /**
     * Prepares the track for playback (doesn't actually cause the timeline to progress as it's more efficient to use a central clock - 
     * scheduleEvent must be called at regular intervals to cause notes to play)
     *
     * @param {number} startPosition The position **in quarter notes** where playback should start from
     * @memberof BaseTrack
     */
    public start(startPosition) : void {
        if (startPosition == 0) {
            this._startTime = this._context.currentTime;
        }
        else {
            this._startTime = this._context.currentTime - this._metadata.positionQuarterNoteToSeconds(startPosition);
        }

        this._playing = true;
        this._timeline.start(startPosition);
    }

    /**
     * Stops playback at the current position
     *
     * @memberof BaseTrack
     */
    public stop() : void {
        this.audioSource.stop();
        this._playing = false;
    }


    /**
     * Schedules upcoming playback events (start **must** be called first)
     *
     * @param {number} quarterNoteTime The current position of the timeline in quarter notes
     * @memberof BaseTrack
     */
    public scheduleSongEvents(quarterNoteTime : number) {
        if(this._playing) {
            let events = this._timeline.getEventsUntilTime(quarterNoteTime);
            events.forEach(event => {
                this.songEventHandler(event);
            });
        }
    }

    /**
     * Schedules all notes to the context, with a start time of now
     *
     * @memberof BaseTrack
     */
    public scheduleAllEvents() {
        this._startTime = this._context.currentTime;
        for(let i = 0; i < this._timeline.events.length; i++) {
            this.songEventHandler(this._timeline.events[i]);
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