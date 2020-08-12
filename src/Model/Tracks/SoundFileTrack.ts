import {BaseTrack} from "./BaseTrack.js";
import { SoundFileInstrument } from "../Nodes/SoundFileInstrument.js";
import SongMetadata from "../SongManagement/SongMetadata.js";
import { ISoundFileSettings } from "../Interfaces/IInstrumentSettings.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import { SecondsBaseEvent, BaseEvent } from "../Notation/SongEvents.js";

export class SoundFileTrack extends BaseTrack {
    public audioSource : SoundFileInstrument;

    /**
     * Creates and initialises a SoundFileTrack
     *
     * @static
     * @param {SongMetadata} metadata
     * @param {(AudioContext|OfflineAudioContext)} context
     * @param {SimpleEvent} scheduleEvent
     * @param {ISoundFileSettings} settings
     * @memberof SoundFileTrack
     */
    public static async create(metadata : SongMetadata, context : AudioContext|OfflineAudioContext, scheduleEvent : SimpleEvent, settings? : ISoundFileSettings) {
        const o = new SoundFileTrack(metadata, context, scheduleEvent, settings);
        await o.initialise();
        return o;
    }

    /**
     * Gets the duration of the sound file (quarter notes)
     *
     * @readonly
     * @memberof SoundFileTrack
     */
    get soundFileDuration() {
        return this._metadata.positionSecondsToQuarterNote(this.audioSource.duration);
    }

    /**
     *Creates an instance of SoundFileTrack. initialise **must** be called alongside this to handle asynchronous setup.
     * @param {SongMetadata} metadata
     * @param {(AudioContext|OfflineAudioContext)} context
     * @param {SimpleEvent} scheduleEvent
     * @param {ISoundFileSettings} settings
     * @memberof SoundFileTrack
     */
    constructor(metadata : SongMetadata, context : AudioContext|OfflineAudioContext, scheduleEvent : SimpleEvent, settings? : ISoundFileSettings) {
        super(metadata, context, scheduleEvent, new SoundFileInstrument(context, settings));
    }

    public async initialise() {
        await this.audioSource.initialise();
    }


    /**
     * Adds a playback event for the sound file
     *
     * @param {number} startPosition The time to start at (quarter notes)
     * @returns {SecondsBaseEvent} The event that was added to the timeline 
     * @memberof SoundFileTrack
     */
    public addOneShot(startPosition : number) : SecondsBaseEvent {
        // Check if there are any events occurring within the new location
        if (this._timeline.getEventsBetweenTimes(startPosition, this._metadata.positionSecondsToQuarterNote(this.audioSource.duration)).length > 0) {
            throw new RangeError("Invalid location: a playback event already occurs in the duration of the new event.");
        }
        let event = new SecondsBaseEvent(startPosition, this._metadata, this.audioSource.duration);
        this._timeline.addEvent(event);
        return event;
    }

    /**
     * Removes a playback event for the sound file
     *
     * @param {number} startPosition The time to remove the event at (quarter notes)
     * @memberof SoundFileTrack
     */
    public removeOneShot(event : SecondsBaseEvent) {
        this._timeline.removeEvent(event);
    }

    /**
     * Updates the sound file this track is using
     *
     * @param {Blob} file The sound file blob to use
     * @memberof SoundFileTrack
     */
    public async setSoundFile(file : Blob) {
        await this.audioSource.setSoundFile(file);
        this._timeline.events.forEach(event => {
            event.duration = this._metadata.positionQuarterNoteToSeconds(this.audioSource.duration);
        });
        this._timeline.updatePlaybackTime();
    }

    protected songEventHandler(event : BaseEvent) {
        if (event instanceof SecondsBaseEvent) {
            let startPositionSeconds = this._startTime + this._metadata.positionQuarterNoteToSeconds(event.startPosition);
            this.audioSource.playOneShot(startPositionSeconds, this._context.currentTime - startPositionSeconds);
        }
        else {
            throw new Error("SoundFileTrack cannot handle this event type: " + event.constructor.name);
        }
    }
}
