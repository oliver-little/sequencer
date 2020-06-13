import SongMetadata from "./SongMetadata.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import { IInstrumentSettings, IOscillatorSettings } from "./IInstrumentSettings.js";
import { BaseTrack } from "../Tracks/BaseTrack.js";
import { OscillatorTrack } from "../Tracks/OscillatorTrack.js";
import { NoteEvent } from "../Notation/SongEvents.js";

export class SongManager {

    // The amount of time to look ahead for events in seconds
    public lookaheadTime = 0.125;

    public metadata: SongMetadata;
    public context: AudioContext;
    public scheduleEvent: SimpleEvent;

    private _tracks: BaseTrack[];
    private _playing = false;

    private _startTime = 0; // Stores the AudioContext time at which the song started playing.
    private _quarterNotePosition = 0; // Stores the current quarter note position of the song.

    private playingIntervalID = null;

    // TODO: construct with existing song file
    constructor() {
        this.metadata = new SongMetadata();
        this.context = new AudioContext();
        this.scheduleEvent = new SimpleEvent();

        this._tracks = [];
    }

    get playing() {
        return this._playing;
    }

    get tracks() {
        return this._tracks;
    }

    /**
     * Adds a new track to the song
     *
     * @param {IInstrumentSettings} settings The settings object describing the track to add.
     * @memberof SongManager
     */
    public addTrack(settings: IInstrumentSettings): BaseTrack {
        if (settings.source.type = "oscillator") {
            let newTrack = new OscillatorTrack(this.metadata, this.context, this.scheduleEvent, settings as IOscillatorSettings);
            this._tracks.push(newTrack);
            return newTrack;
        }
    }

    public async start(startPosition = this._quarterNotePosition) {
        if (this.context.state === "suspended") {
            await this.context.resume();
        }

        this._playing = true;
        this._quarterNotePosition = startPosition;
        if (startPosition == 0) {
            this._startTime = this.context.currentTime;
        }
        else {
            this._startTime = this.context.currentTime - this.metadata.positionQuarterNoteToSeconds(startPosition);
        }
        this.playingIntervalID = setInterval(function () { this.scheduleNotes() }.bind(this), 50);
        this._tracks.forEach(element => {
            element.start(startPosition);
        });
    }

    public stop() {
        this._playing = false;
        clearInterval(this.playingIntervalID);
        this._tracks.forEach(element => {
            element.stop();
        });
    }

    private scheduleNotes() { // Calculates the current quarter note position and updates tracks.
        let timeSinceStart = this.context.currentTime - this._startTime;
        this._quarterNotePosition = this.metadata.positionSecondsToQuarterNote(timeSinceStart);
        let quarterNoteTime = this._quarterNotePosition + ((this.lookaheadTime / this.metadata.getSecondsPerBeat(this._quarterNotePosition))
            / this.metadata.getQuarterNoteMultiplier(this._quarterNotePosition));
        this.scheduleEvent.emit(quarterNoteTime);
    }
}


let jsonString = `{
    "source": {
        "type": "oscillator",
        "oscillatorType": "sine",
        "gain": 0.1
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
let songManager = new SongManager();
let oscillatorObj = JSON.parse(jsonString) as IOscillatorSettings;
let oscillatorTrack = songManager.addTrack(oscillatorObj) as OscillatorTrack;
oscillatorTrack.timeline.addEvent(new NoteEvent(0, "E5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(0, "C5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(0, "G5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(2, "E5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(2, "C6", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(2, "G5", "2n"));
oscillatorTrack.timeline.addEvent(new NoteEvent(3, "G6", "32n"));

songManager.metadata.addMetadataEvent(2, 180, [4, 4]);

let btn = document.getElementById("startButton");
let restartBtn = document.getElementById("restartButton");
let typeBtn = document.getElementById("typeButton");

btn.onclick = function () {
    if (!songManager.playing) {
        songManager.start();
        btn.innerHTML = "Stop";
    }
    else {
        songManager.stop();
        btn.innerHTML = "Start";
    }

}

restartBtn.onclick = function () {
    songManager.stop();
    songManager.start(0);
    btn.innerHTML = "Stop";
}

typeBtn.onclick = function () {
    if (oscillatorTrack.audioSource.settings.source.oscillatorType === "sawtooth") {
        console.log("changing type: sine");
        oscillatorTrack.audioSource.settings.source.oscillatorType = "sine";
    }
    else {
        console.log("changing type: sawtooth");
        oscillatorTrack.audioSource.settings.source.oscillatorType = "sawtooth";
    }
}