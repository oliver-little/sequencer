import {BaseTrack, ISoundFileTrackSettings} from "./BaseTrack.js";
import { SoundFileInstrument } from "../Nodes/SoundFileInstrument.js";
import SongMetadata from "../SongManagement/SongMetadata.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import { SecondsBaseEvent, BaseEvent } from "../Notation/SongEvents.js";
import { ConnectionManager } from "../SongManagement/ConnectionManager.js";

export class SoundFileTrack extends BaseTrack {
    public audioSource : SoundFileInstrument;
    public allowOverlaps : boolean = false;

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
    public static async create(metadata : SongMetadata, context : AudioContext|OfflineAudioContext, scheduleEvent : SimpleEvent, connectionManager : ConnectionManager, settings? : ISoundFileTrackSettings) {
        const o = new SoundFileTrack(metadata, context, scheduleEvent, connectionManager, settings);
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
    constructor(metadata : SongMetadata, context : AudioContext|OfflineAudioContext, scheduleEvent : SimpleEvent, connectionManager : ConnectionManager, settings? : ISoundFileTrackSettings) {
        super(metadata, context, scheduleEvent, new SoundFileInstrument(context, settings ? settings.source : undefined), connectionManager, settings);

        if (settings) {
            this.allowOverlaps = settings.allowOverlaps;
        }
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
        if (!this.allowOverlaps && this._timeline.getEventsBetweenTimes(startPosition, startPosition + this._metadata.positionSecondsToQuarterNote(this.audioSource.duration)).length > 0) {
            throw new RangeError("Invalid location: a playback event already occurs in the duration of the new event. Disable allowOverlaps to suppress this error.");
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
            event.secondsDuration = this.audioSource.duration;
        });

        if (!this.allowOverlaps) {
            let index = 0;
            while (index < this._timeline.events.length) {
                let event = this._timeline.events[index];
                let overlappingEvents = this._timeline.getEventsBetweenTimes(event.startPosition, event.endPosition);
                overlappingEvents.forEach(overlapEvent => {
                    if (overlapEvent != event) {
                        this._timeline.removeEvent(overlapEvent);
                    }
                });
                index++;
            }
        }
        this._timeline.updatePlaybackTime();


    }

    public serialise() : ISoundFileTrackSettings {
        return {
            "id" : this.id,
            "source" : this.audioSource.serialise(),
            "events" : this.timeline.serialise(),
            "connections" : this._connectionManager.getConnections(this.audioSource),
            "allowOverlaps" : this.allowOverlaps
        }
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
