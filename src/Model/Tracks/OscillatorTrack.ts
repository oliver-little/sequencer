import SongMetadata from "../SongManagement/SongMetadata.js";
import {OscillatorInstrument} from "../Nodes/OscillatorInstrument.js";
import {NoteEvent, BaseEvent, ISongEvent} from "../Notation/SongEvents.js";
import {BaseTrack} from "./BaseTrack.js";
import {SimpleEvent} from "../../HelperModules/SimpleEvent.js";
import {IOscillatorSettings} from "../Interfaces/IInstrumentSettings.js";

export class OscillatorTrack extends BaseTrack {

    public audioSource : OscillatorInstrument;

    /**
     * Creates an instance of OscillatorTrack.
     * @param {SongMetadata} metadata A SongMetadata object
     * @param {AudioContext|OfflineAudioContext} context The AudioContext this object will use
     * @param {SimpleEvent} scheduleEvent A scheduling event that triggers regularly to schedule notes to play.
     * @param {IOscillatorSettings} settings An object that fulfills the IOscillatorSettings interface
     * @memberof OscillatorTrack
     */
    constructor(metadata : SongMetadata, context : AudioContext|OfflineAudioContext, scheduleEvent : SimpleEvent, settings? : IOscillatorSettings) {
        let instrument = new OscillatorInstrument(context, settings);
        super(metadata, context, scheduleEvent, instrument);
    }

    /**
     * Adds a new note to this track
     *
     * @param {number} startPosition
     * @param {(string|number)} pitch
     * @param {(string|number)} duration
     * @memberof OscillatorTrack
     */
    public addNote(startPosition : number, pitch : string|number, duration : string|number) {
        this._timeline.addEvent(new NoteEvent(startPosition, pitch, duration));
    }

    /**
     * Removes a note from this track by it's details
     *
     * @param {number} startPosition
     * @param {(string|number)} pitch
     * @param {(string|number)} duration
     * @memberof OscillatorTrack
     */
    public removeNote(event : NoteEvent) {
        let index = -1;
        for (let i = 0; i < this._timeline.events.length; i++) {
            let curEvent = this._timeline.events[i] as NoteEvent;
            if (curEvent.startPosition == event.startPosition && curEvent.duration == event.duration && curEvent.pitch == event.pitch){
                index = i;
                break
            }
        }

        if (index == -1) {
            throw new Error("NoteEvent doesn't exist");
        }

        this._timeline.removeAt(index);
    }

    /**
     * Removes a note from this track 
     *
     * @param {number} index
     * @memberof OscillatorTrack
     */
    public removeNoteByIndex(index : number) {
        this._timeline.events.removeAt(index);
    }

    protected songEventHandler(event: BaseEvent) {
        if (event instanceof NoteEvent) {
            let eventStart = this._startTime + this._metadata.positionQuarterNoteToSeconds(event.startPosition);
            let eventEnd = this._startTime +  this._metadata.positionQuarterNoteToSeconds(event.startPosition + event.duration);
            console.log("queuing: " + event.pitch);
            this.audioSource.playNote(eventStart, eventEnd, event.pitch);
        }
        else {
            throw new Error("OscillatorTrack cannot handle this event type:" + event);
        }
    }
}