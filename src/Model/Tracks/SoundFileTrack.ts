import {BaseTrack} from "./BaseTrack.js";
import { SoundFileInstrument } from "../Nodes/SoundFileInstrument.js";
import SongMetadata from "../SongManagement/SongMetadata.js";
import { ISoundFileSettings } from "../Interfaces/IInstrumentSettings.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import { BaseEvent } from "../Notation/SongEvents.js";

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


    public addOneShot(startPosition : number) {
        this._timeline.addEvent(new BaseEvent(startPosition, this._metadata.positionSecondsToQuarterNote(this.audioSource.duration)));
    }

    public removeOneShot(startPosition : number) {
        this._timeline.removeEvent(new BaseEvent(startPosition, this._metadata.positionSecondsToQuarterNote(this.audioSource.duration)));
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
            event.duration = this._metadata.positionSecondsToQuarterNote(this.audioSource.duration);
        });
    }

    protected songEventHandler(event : BaseEvent) {
        if (event instanceof BaseEvent) {
            let startPositionSeconds = this._startTime + this._metadata.positionQuarterNoteToSeconds(event.startPosition);
            this.audioSource.playOneShot(startPositionSeconds, this._context.currentTime - startPositionSeconds);
        }
        else {
            throw new Error("SoundFileTrack cannot handle this event type: " + event);
        }
    }
}
