import SongMetadata from "../SongManagement/SongMetadata.js";
import {OscillatorInstrument} from "../Instruments/OscillatorInstrument.js";
import {NoteEvent, BaseEvent} from "../Notation/SongEvents.js";
import {BaseTrack} from "./BaseTrack.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import {IOscillatorSettings} from "../SongManagement/IInstrumentSettings.js";

export class OscillatorTrack extends BaseTrack {

    public audioSource : OscillatorInstrument;

    /**
     * Creates an instance of OscillatorTrack.
     * @param {SongMetadata} metadata A SongMetadata object
     * @param {AudioContext} context The AudioContext this object will use
     * @param {SimpleEvent} scheduleEvent A scheduling event that triggers regularly to schedule notes to play.
     * @param {IOscillatorSettings} settings An object that fulfills the IOscillatorSettings interface
     * @memberof OscillatorTrack
     */
    constructor(metadata : SongMetadata, context : AudioContext, scheduleEvent : SimpleEvent, settings? : IOscillatorSettings) {
        let instrument = null;
        if (settings != null) {
            instrument = new OscillatorInstrument(context, settings);
        } else {
            instrument = new OscillatorInstrument(context);
        }
        super(metadata, context, scheduleEvent, instrument);
    }

    protected songEventHandler(event: BaseEvent) {
        if (event instanceof NoteEvent) {
            let eventStart = this._startTime + this._metadata.positionQuarterNoteToSeconds(event.startPosition);
            let eventEnd = this._startTime +  this._metadata.positionQuarterNoteToSeconds(event.startPosition + event.duration);
            console.log("queuing: " + event.pitch);
            this.audioSource.playNote(event.pitch, eventStart, eventEnd);
        }
        else {
            throw new Error("OscillatorTrack cannot handle this event type:" + event);
        }
    }
}