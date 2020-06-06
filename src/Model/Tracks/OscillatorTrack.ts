import SongMetadata from "../SongManagement/SongMetadata.js";
import {OscillatorInstrument} from "../Instruments/OscillatorInstrument.js";
import {NoteEvent, BaseEvent} from "../Notation/SongEvents.js";
import {BaseTrack} from "./BaseTrack.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";


export class OscillatorTrack extends BaseTrack {
    
    public audioSource : OscillatorInstrument;

    constructor(metadata : SongMetadata, context : AudioContext, settings : Map<String, String>) {
        super(metadata, context);
        this.audioSource = new OscillatorInstrument(context, settings);
    }

    protected songEventHandler(event: BaseEvent) {
        if (event instanceof NoteEvent) {
            let noteLength = parseLength(event.duration, this._metadata.timeSignature, this._metadata.secondsPerBeat);
            // Calculate the time the note should play in seconds using the start audioContext time + 
            // the start position (in quarter notes) * the multiplier to get from the quarter notes to the beat * the number of seconds per beat
            let noteTime = this._startTime + (event.startPosition * this._metadata.quarterNoteMultiplier * this._metadata.secondsPerBeat);
            console.log("queuing: " + event.pitch);
            this.audioSource.playNote(event.pitch, noteTime, noteLength);
        }
        else {
            throw new Error("OscillatorTrack cannot handle this event type:" + event);
        }
    }
}

/**
 * Calculates the length of a note from a note string, given metadata about the song
 *
 * @param {string} note The note string to parse
 * @param {number[]} timeSignature The time signature of the song, represented as an array of 2 numbers
 * @param {number} secondsPerBeat The number of seconds in each beat of the song (derived from bpm).
 * @returns {number} The note length in seconds
 */
function parseLength(note : string, timeSignature : number[], secondsPerBeat : number) : number {
    // General calculation for getting a note's length:
    // (Beat Type (denominator of time signature) / Note Type) * Seconds Per Beat
    // E.G: At 120bpm the seconds per beat is 0.5 (60/120),
    // Therefore in 4/4, an 8th note is 4/8 * 0.5 = 0.25s
    let noteLength = parseInt(note.slice(0, note.length - 1));
    switch (note.charAt(note.length - 1)) {
        case "n":
            return ((timeSignature[1] / noteLength) * secondsPerBeat);
        case ".":
            return ((timeSignature[1] / noteLength) * secondsPerBeat * 1.5);
        case "t":
            return (((timeSignature[1] / noteLength) * secondsPerBeat) / 1.5);
        case "b":
            return noteLength * secondsPerBeat * timeSignature[0];
        default:
            throw new Error("Invalid note.");
    }
}