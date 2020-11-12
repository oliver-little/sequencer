import SongMetadata from "../SongManagement/SongMetadata.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import {EventTimeline} from "../Notation/EventTimeline.js";
import {BaseEvent, ISongEvent} from "../Notation/SongEvents.js";
import {IInstrument} from "../Interfaces/IInstrument.js";
import { IInstrumentSettings } from "../Interfaces/IInstrumentSettings.js";
import {v4 as uuid} from "uuid";

/**
 * Interface describing a serialised track
 *
 * @export
 * @interface ITrackSettings
 */
export interface ITrackSettings {
    "id" : string,
    "source" : IInstrumentSettings,
    "events" : ISongEvent[],
    "connections" : Array<string>
}

/**
 * Works with the timeline and instrument objects to schedule notes as required
 *
 * @export
 * @class BaseTrack
 */
export abstract class BaseTrack {

    public audioSource : IInstrument;
    public id : string;

    protected _timeline : EventTimeline;
    protected _metadata : SongMetadata;
    protected _context : AudioContext|OfflineAudioContext;
    protected _scheduleEvent : SimpleEvent; // Stores the event which fires every time song events should be scheduled.
    protected _startTime = 0; // Stores the AudioContext time at which playback was started.
    protected _playing = false;

    private _scheduleEventFunc : Function;

    /**
     *Creates an instance of BaseTrack.
     * @param {SongMetadata} metadata The SongMetadata this track uses
     * @param {(AudioContext|OfflineAudioContext)} context The AudioContext this track is using
     * @param {SimpleEvent} scheduleEvent An event to schedule notes, should be fired around every 50ms when playing
     * @param {IInstrument} audioSource An AudioSource that this track will use to emit sound.
     * @param {string} [id] An optional uuid to represent this track (used in deserialisation). This is generated if not provided.
     * @memberof BaseTrack
     */
    constructor (metadata : SongMetadata, context : AudioContext|OfflineAudioContext, scheduleEvent : SimpleEvent, audioSource : IInstrument, id? : string) {
        this._timeline = new EventTimeline();
        this._context = context;
        this._metadata = metadata;
        this._scheduleEvent = scheduleEvent;
        this._scheduleEventFunc = function(quarterNotePosition : number) {this.scheduleSongEvents(quarterNotePosition)}.bind(this)
        this._scheduleEvent.addListener(this._scheduleEventFunc);

        this.audioSource = audioSource;
        this.id = id === undefined ? uuid() : id;
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
        this.stop();
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

    public serialise() : ITrackSettings {
        return {
            "id" : this.id,
            "source" : this.audioSource.serialise(),
            "events" : this.timeline.serialise(),
            "connections" : [],
        }
    }

    public destroy() {
        this.stop();
        this.audioSource.destroy();
        this._scheduleEvent.removeListener(this._scheduleEventFunc);
        this.audioSource = null;
    }
}