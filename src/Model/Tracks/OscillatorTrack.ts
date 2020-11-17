import SongMetadata from "../SongManagement/SongMetadata.js";
import { OscillatorInstrument } from "../Nodes/OscillatorInstrument.js";
import { NoteEvent, BaseEvent } from "../Notation/SongEvents.js";
import { BaseTrack, IOscillatorTrackSettings } from "./BaseTrack.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import NoteHelper from "../../HelperModules/NoteHelper.js";
import { ConnectionManager } from "../SongManagement/ConnectionManager.js";

export class OscillatorTrack extends BaseTrack {

    public audioSource: OscillatorInstrument;

    // Stores note string names, and the number of times that note string appears.
    private _pitchStrings : {[noteName : string] : number};

    /**
     * Creates an instance of OscillatorTrack.
     * @param {SongMetadata} metadata A SongMetadata object
     * @param {AudioContext|OfflineAudioContext} context The AudioContext this object will use
     * @param {SimpleEvent} scheduleEvent A scheduling event that triggers regularly to schedule notes to play.
     * @param {IOscillatorSettings} settings An object that fulfills the IOscillatorSettings interface
     * @memberof OscillatorTrack
     */
    constructor(metadata: SongMetadata, context: AudioContext | OfflineAudioContext, scheduleEvent: SimpleEvent, connectionManager : ConnectionManager, settings?: IOscillatorTrackSettings) {
        let instrument = new OscillatorInstrument(context, settings ? settings.source : undefined);

        super(metadata, context, scheduleEvent, instrument, connectionManager);

        this._pitchStrings = {};
    }

    /**
     * Gets the highest pitch in this track
     *
     * @readonly
     * @memberof OscillatorTrack
     */
    get highestPitch() {
        let highest = "C0";
        Object.keys(this._pitchStrings).forEach(pitchString => {
            if (NoteHelper.distanceBetweenNotes(pitchString, highest) > 0) {
                highest = pitchString;
            }
        });
        return highest;
    }

    /**
     * Gets the lowest pitch in this track
     *
     * @readonly
     * @memberof OscillatorTrack
     */
    get lowestPitch() {
        let lowest = "B9";
        Object.keys(this._pitchStrings).forEach(pitchString => {
            if (NoteHelper.distanceBetweenNotes(pitchString, lowest) < 0) {
                lowest = pitchString;
            }
        });
        return lowest;
    }

    /**
     * Adds a new note to this track
     *
     * @param {number} startPosition
     * @param {(string)} pitch
     * @param {(string|number)} duration
     * @returns {NoteEvent} The NoteEvent that was added to the timeline
     * @memberof OscillatorTrack
     */
    public addNote(startPosition: number, pitch: string, duration: string | number) : NoteEvent {
        let event = new NoteEvent(startPosition, pitch, duration);
        this._timeline.addEvent(event);

        if (pitch in this._pitchStrings) {
            this._pitchStrings[pitch] += 1
        }
        else {
            this._pitchStrings[pitch] = 1
        }

        return event;
    }

    /**
     * Removes a NoteEvent from the timeline
     *
     * @param {NoteEvent} event
     * @returns
     * @memberof OscillatorTrack
     */
    public removeNote(event: NoteEvent) {
        this.timeline.removeEvent(event);
        if (event.pitchString in this._pitchStrings) {
            this._pitchStrings[event.pitchString] -= 1
            if (this._pitchStrings[event.pitchString] < 1) {
                delete this._pitchStrings[event.pitchString]
            }
        }
    }

    /**
     * Removes a note from this track using its index.
     *
     * @param {number} index
     * @memberof OscillatorTrack
     */
    public removeNoteByIndex(index: number) {
        this._timeline.events.removeAt(index);
    }

    protected songEventHandler(event: BaseEvent) {
        if (event instanceof NoteEvent) {
            let eventStart = this._startTime + this._metadata.positionQuarterNoteToSeconds(event.startPosition);
            let eventEnd = this._startTime + this._metadata.positionQuarterNoteToSeconds(event.startPosition + event.duration);
            this.audioSource.playNote(eventStart, eventEnd, event.pitch);
        }
        else {
            throw new Error("OscillatorTrack cannot handle this event type:" + event.constructor.name);
        }
    }
}