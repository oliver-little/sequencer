import SongMetadata from "../SongManagement/SongMetadata.js";
import {OscillatorInstrument} from "../Instruments/OscillatorInstrument.js";
import {NoteEvent, BaseEvent} from "../Notation/SongEvents.js";
import {BaseTrack} from "./BaseTrack.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import { IOscillatorSettings } from "../SongManagement/IInstrumentSettings.js";

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
    constructor(metadata : SongMetadata, context : AudioContext, scheduleEvent : SimpleEvent, settings : IOscillatorSettings) {
        super(metadata, context, scheduleEvent);
        this.audioSource = new OscillatorInstrument(context, settings);
    }

    /**
     * Sets up object states to begin playback
     *
     * @param {number} audioContextTime The **AudioContext** time at which the playback was started
     * @param {number} startPosition The position **in quarter notes** where playback was started from
     * @param {SimpleEvent} scheduleEvent The event fired to schedule new notes
     * @memberof OscillatorTrack
     */
    public start(scheduleEvent : SimpleEvent, startPosition = this._timeDifference) : void {
        // Time difference is used by default for startPosition to allow easy restarting from where playback was last paused.
        this.timeline.start(startPosition);
        super.start(startPosition);
    }

    /**
     * Override BaseTrack stop to mute instrument
     *
     * @memberof OscillatorTrack
     */
    public stop() : void {
        super.stop();
        this.audioSource.stop();
    }

    protected songEventHandler(event: BaseEvent) {
        if (event instanceof NoteEvent) {
            let noteLength = event.duration * this._metadata.quarterNoteMultiplier * this._metadata.secondsPerBeat;
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

let metadata = new SongMetadata();
let context = new AudioContext();
let jsonString = `{
    "source": {
        "type": "oscillator",
        "oscillatorType": "triangle",
        "gain": 0.3,
        "detune": 0
    },
    "envelopeEnabled" : true,
    "envelope": {
        "attack": 0.1,
        "release": 0.1
    },
    "chains": [
        {
            "filters": [
                {
                    "type": "filter",
                    "filterType": "Delay",
                    "properties": {
                        "...": "."
                    }
                },
                {
                    "type": "tuna",
                    "filterType": "Chorus",
                    "properties": {
                        "...": "."
                    }
                }
            ],
            "gain": 100
        },
        {
            "filters": [
                {
                    "type": "filter",
                    "filterType": "Delay",
                    "properties": {
                        "...": "."
                    }
                },
                {
                    "type": "tuna",
                    "filterType": "Chorus",
                    "properties": {
                        "...": "."
                    }
                }
            ],
            "gain": 100
        }
    ]
}`;

// Testing code

let oscillatorObj = JSON.parse(jsonString) as IOscillatorSettings;
let scheduleEvent = new SimpleEvent();
let oscillatorTrack = new OscillatorTrack(metadata, context, scheduleEvent, oscillatorObj);
oscillatorTrack.timeline.addEvent(new NoteEvent(0, "E5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(0, "C5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(0, "G5", "2n"));
//oscillatorTrack.timeline.addEvent(new NoteEvent(2, "E5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(2, "C6", "2n"));
//oscillatorTrack.timeline.addEvent(new NoteEvent(2, "G5", "2n"));
//oscillatorTrack.timeline.addEvent(new NoteEvent(1, "E5", "32n"));
let intervalID = setInterval(function() {scheduleEvent.emit()}, 50);

let btn = document.getElementById("startButton");
let restartBtn = document.getElementById("restartButton");

btn.onclick = function () {
    if(!oscillatorTrack.playing) {
        context.resume();
        oscillatorTrack.start(scheduleEvent);
        btn.innerHTML = "Stop";
    }
    else {
        oscillatorTrack.stop();
        btn.innerHTML = "Start";
    }

}

restartBtn.onclick = function() {
    oscillatorTrack.stop();
    oscillatorTrack.start(scheduleEvent, 0);
    btn.innerHTML = "Stop";
}