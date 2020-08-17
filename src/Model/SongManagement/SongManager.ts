import SongMetadata from "./SongMetadata.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import { IOscillatorSettings, ISoundFileSettings, IChainSettings } from "../Interfaces/IInstrumentSettings.js";
import { BaseTrack, ITrackSettings } from "../Tracks/BaseTrack.js";
import { OscillatorTrack } from "../Tracks/OscillatorTrack.js";
import { SoundFileTrack } from "../Tracks/SoundFileTrack.js";
import { ConnectionManager } from "./ConnectionManager.js";
import { ISongEvent } from "../Notation/SongEvents.js";

export class SongManager {

    static saveFileVersion = "1.0.0";

    // The amount of time to look ahead for events in seconds
    public lookaheadTime = 0.125;

    public metadata: SongMetadata;
    public connectionManager : ConnectionManager;
    public context: AudioContext|OfflineAudioContext;
    public scheduleEvent: SimpleEvent;

    protected _tracks: BaseTrack[];
    protected _playing = false;

    protected _startTime = 0; // Stores the AudioContext time at which the song started playing.
    protected _quarterNotePosition = 0;

    protected playingIntervalID = null;

    constructor(context? : AudioContext|OfflineAudioContext) {
        this.metadata = new SongMetadata();
        this.context = (context === undefined) ? new AudioContext() : context;
        this.connectionManager = new ConnectionManager(this.context);
        this.scheduleEvent = new SimpleEvent();
        this._tracks = [];
    }

    get playing() {
        return this._playing;
    }

    get quarterNotePosition() {
        return this._quarterNotePosition;
    }

    set quarterNotePosition(value : number) {
        this._quarterNotePosition = value;
    }

    get tracks() {
        return this._tracks;
    }

    /**
     * Adds a new oscillator track to the song
     *
     * @param {IOscillatorSettings} settings
     * @returns {OscillatorTrack}
     * @memberof SongManager
     */
    public addOscillatorTrack(connections : string[] = ["context"], settings?: IOscillatorSettings, events? : ISongEvent[]): OscillatorTrack {
        let newTrack = new OscillatorTrack(this.metadata, this.context, this.scheduleEvent, settings);
        if (events != undefined) {
            newTrack.timeline.deserialise(events, this.metadata);
        }
        this._tracks.push(newTrack);
        this.connectionManager.createConnections(newTrack.audioSource, connections);
        return newTrack;
    }

    /**
     * Adds a new sound file track to the song
     *
     * @param {ISoundFileSettings} [settings]
     * @param {string[]} [connections=["context"]]
     * @returns {Promise<SoundFileTrack>}
     * @memberof SongManager
     */
    public async addSoundFileTrack(connections : string[] = ["context"], settings?: ISoundFileSettings, events? : ISongEvent[]) : Promise<SoundFileTrack> {
        let newTrack = await SoundFileTrack.create(this.metadata, this.context, this.scheduleEvent, settings);
        if (events != undefined) {
            newTrack.timeline.deserialise(events, this.metadata);
        }
        this._tracks.push(newTrack);
        this.connectionManager.createConnections(newTrack.audioSource, connections);
        return newTrack;
    }

    /**
     * Starts playback at the given quarter note position
     *
     * @param {number} [startPosition=this._quarterNotePosition]
     * @memberof SongManager
     */
    public async start(startPosition = this.quarterNotePosition) {
        if (this.context.state === "suspended") {
            await this.context.resume();
        }

        this._playing = true;
        this.quarterNotePosition = startPosition;
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

    /**
     * Stops playback immediately
     *
     * @memberof SongManager
     */
    public stop() {
        this._playing = false;
        clearInterval(this.playingIntervalID);
        this._tracks.forEach(element => {
            element.stop();
        });
    }

    /**
     * Serialises the song into an object that can be saved as a JSON string using JSON.parse
     *
     * @returns {ISongSettings}
     * @memberof SongManager
     */
    public serialise() : ISongSettings {
        let serialisedTracks = []
        this._tracks.forEach(track => {
            let trackSettings = track.serialise();
            trackSettings.connections = this.connectionManager.getConnections(track.audioSource);
            serialisedTracks.push(trackSettings);
        });
        let serialisedChains = this.connectionManager.serialiseChains();
        return {
            "version" : SongManager.saveFileVersion,
            "metadataEvents" : this.metadata.serialise(),
            "tracks" : serialisedTracks,
            "chains" : serialisedChains
        }
    }

    /**
     * Deserialises an ISongSettings object to recreate a given song.
     *
     * @param {ISongSettings} settings
     * @memberof SongManager
     */
    public async deserialise(settings : ISongSettings) {
        if (settings.version != SongManager.saveFileVersion) {
            console.log("WARNING: Save file is an old version, loading may not function correctly.");
        }
        this.connectionManager.deserialiseChains(settings.chains);
        this.metadata.deserialise(settings.metadataEvents);
        for (let i = 0; i < settings.tracks.length; i++) {
            let track = settings.tracks[i];
            switch (track.source.type) {
                case "oscillator": 
                    this.addOscillatorTrack(track.connections, track.source as IOscillatorSettings, track.events);
                    break;
                case "soundFile":
                    await this.addSoundFileTrack(track.connections, track.source as ISoundFileSettings, track.events);
                    break;
            }
        };
    }

    /**
     * Saves the current song to a WAV file
     *
     * @returns The WAV file as a Blob
     * @memberof SongManager
     */
    public async saveToWAV() {
        let song = this.serialise();
        let offlineManager = new OfflineSongManager(this.getPlaybackLength());
        await offlineManager.deserialise(song);
        let result = await offlineManager.saveToWAV();
        return result;
    }

    /**
     * Gets the total playback length of this song
     *
     * @private
     * @returns {number} The playback length of the song in seconds
     * @memberof SongManager
     */
    protected getPlaybackLength() : number {
        let longestEvent = 0;
        this._tracks.forEach(track => {
            if (track.timeline.playbackTime > longestEvent) {
                longestEvent = track.timeline.playbackTime;
            }
        });
        return longestEvent;
    }

    protected scheduleNotes() { // Calculates the current quarter note position and updates tracks.
        let timeSinceStart = this.context.currentTime - this._startTime;
        this.quarterNotePosition = this.metadata.positionSecondsToQuarterNote(timeSinceStart);
        let quarterNoteTime = this.quarterNotePosition + ((this.lookaheadTime / this.metadata.getSecondsPerBeat(this.quarterNotePosition))
            / this.metadata.getQuarterNoteMultiplier(this.quarterNotePosition));
        this.scheduleEvent.emit(quarterNoteTime);
    }
}

export class OfflineSongManager extends SongManager {

    public context : OfflineAudioContext;

    /**
     * Constructs a SongManager for saving the track
     * @param {number} length
     * @memberof OfflineSongManager
     */
    constructor(length : number) {
        super(new OfflineAudioContext(2, length * 44100, 44100));
    }

    /**
     * Saves the current song to a WAV file
     *
     * @returns The WAV as a Blob
     * @memberof OfflineSongManager
     */
    public async saveToWAV() {
        this._tracks.forEach(track => {
            track.scheduleAllEvents();
        });
        console.log("Starting AudioBuffer render");
        let audioBuffer = await this.context.startRendering();
        console.log("Finished AudioBuffer render");

        // AudioBuffer to ArrayBuffer conversion (from: https://stackoverflow.com/questions/62172398/convert-audiobuffer-to-arraybuffer-blob-for-wav-download)
        // Get channels as two arrays
        const [left, right] = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];

        // Interleave arrays
        const interleaved = new Float32Array(left.length * 2); // Double the length of the buffer because the two channels are being merged.
        for (let src=0, dst=0; src < left.length; src++, dst+=2) {
            interleaved[dst] =   left[src]
            interleaved[dst+1] = right[src]
        };

        const wavBytes = getWavBytes(interleaved.buffer, {
            isFloat: true,       // floating point or 16-bit integer
            numChannels: 2,
            sampleRate: 44100,
        });

        return new Blob([wavBytes], {type: "audio/wav"});
    }
}

// Helper functions for WAV conversion
// Generates the bytes of the WAV file (header and data)
function getWavBytes(buffer, options) {
    const type = options.isFloat ? Float32Array : Uint16Array;
    const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT;
  
    const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }));
    const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);
  
    // Prepend header, then add pcmBytes
    wavBytes.set(headerBytes, 0);
    wavBytes.set(new Uint8Array(buffer), headerBytes.length);
  
    return wavBytes;
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

export interface ISongSettings {
    "version" : string,
    "metadataEvents" : Array<ISongEvent>,
    "tracks" : Array<ITrackSettings>,
    "chains" : Array<IChainSettings>
}