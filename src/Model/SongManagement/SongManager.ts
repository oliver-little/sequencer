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

    /**
     * Gets the total playback length of this song
     *
     * @private
     * @returns {number} The playback length of the song in quarter notes
     * @memberof SongManager
     */
    private getPlaybackLength() : number {
        let longestEvent = 0;
        this._tracks.forEach(track => {
            if (track.timeline.playbackTime > longestEvent) {
                longestEvent = track.timeline.playbackTime;
            }
        });
        return longestEvent;
    }

    private scheduleNotes() { // Calculates the current quarter note position and updates tracks.
        let timeSinceStart = this.context.currentTime - this._startTime;
        this._quarterNotePosition = this.metadata.positionSecondsToQuarterNote(timeSinceStart);
        let quarterNoteTime = this._quarterNotePosition + ((this.lookaheadTime / this.metadata.getSecondsPerBeat(this._quarterNotePosition))
            / this.metadata.getQuarterNoteMultiplier(this._quarterNotePosition));
        this.scheduleEvent.emit(quarterNoteTime);
    }

    /**
     * Saves the current song to a WAV (as a Blob)
     *
     * @param {Function} callback The function to call once saving is complete
     * @memberof SongManager
     */
    // TODO: need to get the saved song and create a new SongManager with an offlineaudiocontext and the current song data before this will work
    public saveToWAV(callback : Function) : void {
        return;
        let songLength = this.metadata.positionQuarterNoteToSeconds(this.getPlaybackLength());
        let offlineContext = new OfflineAudioContext(2, songLength * 44100, 44100);
        
        // Setup what to do when rendering is complete
        offlineContext.oncomplete = function(e) {
            let audioBuffer = e.renderedBuffer;
            // AudioBuffer to ArrayBuffer conversion (from: https://stackoverflow.com/questions/62172398/convert-audiobuffer-to-arraybuffer-blob-for-wav-download)
            // Get channels as two arrays
            const [left, right] = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];

            // Interleave arrays
            const interleaved = new Float32Array(left.length)
            for (let src=0, dst=0; src < left.length; src++, dst+=2) {
                interleaved[dst] =   left[src]
                interleaved[dst+1] = right[src]
            };

            const wavBytes = getWavBytes(interleaved.buffer, {
                isFloat: true,       // floating point or 16-bit integer
                numChannels: 2,
                sampleRate: 48000,
            });

            const wav = new Blob([wavBytes], {type: "audio/wav"});
            callback(wav);
        };
        
        offlineContext.startRendering();
    }
}

// Helper functions for WAV conversion
// Generates the bytes of the WAV file (header and data)
function getWavBytes(buffer, options) {
    const type = options.isFloat ? Float32Array : Uint16Array
    const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT
  
    const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }))
    const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);
  
    // Prepend header, then add pcmBytes
    wavBytes.set(headerBytes, 0)
    wavBytes.set(new Uint8Array(buffer), headerBytes.length)
  
    return wavBytes
}

// Generates a WAV header (from https://gist.github.com/also/900023)
function getWavHeader(options) {
    const numFrames =      options.numFrames
    const numChannels =    options.numChannels || 2
    const sampleRate =     options.sampleRate || 44100
    const bytesPerSample = options.isFloat? 4 : 2
    const format =         options.isFloat? 3 : 1
  
    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = numFrames * blockAlign
  
    const buffer = new ArrayBuffer(44)
    const dv = new DataView(buffer)
  
    let p = 0
  
    function writeString(s) {
      for (let i = 0; i < s.length; i++) {
        dv.setUint8(p + i, s.charCodeAt(i))
      }
      p += s.length
    }
  
    function writeUint32(d) {
      dv.setUint32(p, d, true)
      p += 4
    }
  
    function writeUint16(d) {
      dv.setUint16(p, d, true)
      p += 2
    }
  
    writeString('RIFF')              // ChunkID
    writeUint32(dataSize + 36)       // ChunkSize
    writeString('WAVE')              // Format
    writeString('fmt ')              // Subchunk1ID
    writeUint32(16)                  // Subchunk1Size
    writeUint16(format)              // AudioFormat
    writeUint16(numChannels)         // NumChannels
    writeUint32(sampleRate)          // SampleRate
    writeUint32(byteRate)            // ByteRate
    writeUint16(blockAlign)          // BlockAlign
    writeUint16(bytesPerSample * 8)  // BitsPerSample
    writeString('data')              // Subchunk2ID
    writeUint32(dataSize)            // Subchunk2Size
  
    return new Uint8Array(buffer)
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