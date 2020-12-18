import SongMetadata from "./SongMetadata.js";
import { SimpleEvent } from "../../HelperModules/SimpleEvent.js";
import { IChainSettings } from "../Interfaces/IInstrumentSettings.js";
import { BaseTrack, IOscillatorTrackSettings, ISoundFileTrackSettings, ITrackSettings } from "../Tracks/BaseTrack.js";
import { OscillatorTrack } from "../Tracks/OscillatorTrack.js";
import { SoundFileTrack } from "../Tracks/SoundFileTrack.js";
import { ConnectionManager } from "./ConnectionManager.js";
import { ISongEvent } from "../Notation/SongEvents.js";
import { setContext } from "../../../dependencies/tuna.js";

export class SongManager {

    static saveFileVersion = "1.0.0";

    // The amount of time to look ahead for events in seconds
    public lookaheadTime = 0.125;

    public metadata: SongMetadata;
    public connectionManager: ConnectionManager;
    public context: AudioContext | OfflineAudioContext;
    public scheduleEvent: SimpleEvent;
    public playingChangedEvent: SimpleEvent;
    public quarterNotePositionChangedEvent: SimpleEvent;

    protected _tracks: BaseTrack[];
    protected _playing = false;

    protected _startTime = 0; // Stores the AudioContext time at which the song started playing.
    protected _quarterNotePosition = 0;

    protected playingIntervalIDs = null;

    protected _boundQuarterNoteUpdateFunction: () => any;

    private _stopTimeout : NodeJS.Timeout;

    constructor(context?: AudioContext | OfflineAudioContext) {
        this.metadata = new SongMetadata();
        this.context = (context === undefined) ? new AudioContext() : context;
        this.connectionManager = new ConnectionManager(this.context);
        this.scheduleEvent = new SimpleEvent();
        this.playingChangedEvent = new SimpleEvent();
        this.quarterNotePositionChangedEvent = new SimpleEvent();
        this._tracks = [];

        this._boundQuarterNoteUpdateFunction = this.quarterNoteUpdateFunction.bind(this);
    }

    get playing() {
        return this._playing;
    }

    get quarterNotePosition() {
        return this._quarterNotePosition;
    }


    /**
     * Used for external setting of quarterNotePosition (forces the update function to use a new start time)
     *
     * @memberof SongManager
     */
    set quarterNotePosition(value: number) {
        this._internalQuarterNotePosition = value;
        this._startTime = this.context.currentTime - this.metadata.positionQuarterNoteToSeconds(this._quarterNotePosition);
        clearTimeout(this._stopTimeout);
        this._stopTimeout = setTimeout(() => {this.stopToBeginning();}, (this.getPlaybackLength() - this.metadata.positionQuarterNoteToSeconds(this._quarterNotePosition))* 1000)
        if (this._playing) {
            this._tracks.forEach(element => {
                element.start(this._quarterNotePosition);
            });
        }
    }

    /**
     * Used for internal setting of quarterNotePosition (updates the value and emits the event signifying it was changed)
     *
     * @private
     * @memberof SongManager
     */
    private set _internalQuarterNotePosition(value: number) {
        this._quarterNotePosition = value;
        this.quarterNotePositionChangedEvent.emit(value);
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
    public addOscillatorTrack(settings?: IOscillatorTrackSettings): OscillatorTrack {
        let newTrack = new OscillatorTrack(this.metadata, this.context, this.scheduleEvent, this.connectionManager, settings);
        this._tracks.push(newTrack);
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
    public async addSoundFileTrack(settings?: ISoundFileTrackSettings): Promise<SoundFileTrack> {
        let newTrack = await SoundFileTrack.create(this.metadata, this.context, this.scheduleEvent, this.connectionManager, settings);
        this._tracks.push(newTrack);
        return newTrack;
    }

    public removeTrack(track: BaseTrack) {
        let index = this._tracks.indexOf(track);
        if (index != -1) {
            this._tracks.splice(index, 1);
        }
        track.destroy();
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
        this.playingChangedEvent.emit(this._playing);
        this.quarterNotePosition = startPosition;
        if (startPosition == 0) {
            this._startTime = this.context.currentTime;
        }
        else {
            this._startTime = this.context.currentTime - this.metadata.positionQuarterNoteToSeconds(startPosition);
        }

        this.connectionManager.outputGain.gain.setTargetAtTime(0.9999, this.context.currentTime, 0.03);

        // Schedule notes separately from quarter note update
        this.playingIntervalIDs = setInterval(() => { this.scheduleNotes() }, 50);
        // Schedule quarter note update function until playing stops using animation frame (to keep animations smooth)
        requestAnimationFrame(this._boundQuarterNoteUpdateFunction);
        this._tracks.forEach(element => {
            element.start(this._quarterNotePosition);
        });

        this._stopTimeout = setTimeout(() => {this.stopToBeginning()}, (this.getPlaybackLength() - this.metadata.positionQuarterNoteToSeconds(startPosition))* 1000);
    }

    /**
     * Stops playback immediately
     *
     * @memberof SongManager
     */
    public stop() {
        this._playing = false;
        this.playingChangedEvent.emit(this._playing);

        this.connectionManager.outputGain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.03);

        clearTimeout(this._stopTimeout);
        clearInterval(this.playingIntervalIDs);
        this._tracks.forEach(element => {
            element.stop();
        });
    }

    /**
     * Stops and returns the timeline to the start of playback
     *
     * @memberof SongManager
     */
    public stopToBeginning() {
        this.stop();
        this.quarterNotePosition = 0;
    }

    /**
     * Serialises the song into an object that can be saved as a JSON string using JSON.parse
     *
     * @returns {ISongSettings}
     * @memberof SongManager
     */
    public serialise(): ISongSettings {
        let serialisedTracks = []
        this._tracks.forEach(track => {
            let trackSettings = track.serialise();
            serialisedTracks.push(trackSettings);
        });
        let serialisedChains = this.connectionManager.serialiseChains();
        return {
            "fileType": "SequencerSongSettings",
            "version": SongManager.saveFileVersion,
            "metadataEvents": this.metadata.serialise(),
            "tracks": serialisedTracks,
            "chains": serialisedChains
        }
    }

    /**
     * Deserialises an ISongSettings object to recreate a given song.
     *
     * @param {ISongSettings} settings
     * @memberof SongManager
     */
    public async deserialise(settings: ISongSettings) {
        if (settings.version != SongManager.saveFileVersion) {
            console.log("WARNING: Save file is an old version, loading may not function correctly.");
        }

        // Clear existing tracks
        this._tracks.forEach(track => { track.destroy() });
        this._tracks = [];

        this.connectionManager.deserialiseChains(settings.chains);
        this.metadata.deserialise(settings.metadataEvents);
        for (let i = 0; i < settings.tracks.length; i++) {
            let track = settings.tracks[i];
            switch (track.source.type) {
                case "oscillator":
                    this.addOscillatorTrack(track as IOscillatorTrackSettings);
                    break;
                case "soundFile":
                    await this.addSoundFileTrack(track as ISoundFileTrackSettings);
                    break;
                default:
                    throw new Error("Invalid track type.");
                    break;
            }
        };
    }

    public destroy() {
        this.scheduleEvent.removeAllListeners();
        this.playingChangedEvent.removeAllListeners();
    }

    /**
     * Saves the current song to a WAV file
     *
     * @returns The WAV file as a Blob
     * @memberof SongManager
     */
    public async saveToWAV() {
        let length = this.getPlaybackLength();
        if (length > 0) {
            let song = this.serialise();
            let offlineManager = new OfflineSongManager(length + 0.1);
            await offlineManager.deserialise(song);
            let result = await offlineManager.saveToWAV();

            // Tuna.js has a global variable defining the context to use - this gets changed to the OfflineAudioContext
            // when savetoWAV is called. setContext has been created inside tuna.js to allow the context to be set back
            // to the current context after the WAV file has been created.
            setContext(this.context);
            return result;
            
        }
        else {
            throw new Error("Song Length must be greater than 0 to save to WAV.")
        }
    }

    /**
     * Gets the total playback length of this song
     *
     * @private
     * @returns {number} The playback length of the song in seconds
     * @memberof SongManager
     */
    protected getPlaybackLength(): number {
        let longestEvent = 0;
        let cachedEffectLengths : {[connectionName: string] : number}= {};
        this._tracks.forEach(track => {
            let playbackTime = track.timeline.playbackTime;
            let connection = this.connectionManager.getConnections(track.audioSource)[0];
            if (connection != "Context") {
                if (connection in cachedEffectLengths) {
                    playbackTime += cachedEffectLengths[connection];
                }
                else {
                    let chainDelayTime = this.connectionManager.getChainDelayTime(connection);
                    playbackTime += chainDelayTime;
                    cachedEffectLengths[connection] = chainDelayTime;
                }
            }

            if (playbackTime > longestEvent) {
                longestEvent = playbackTime;
            }
        });
        return longestEvent + 0.01;
    }

    protected scheduleNotes() {
        let quarterNoteTime = this.quarterNotePosition + ((this.lookaheadTime / this.metadata.getSecondsPerBeat(this.quarterNotePosition))
            / this.metadata.getQuarterNoteMultiplier(this.quarterNotePosition));
        this.scheduleEvent.emit(quarterNoteTime);
    }

    protected quarterNoteUpdateFunction() {
        if (this.playing) {
            let timeSinceStart = this.context.currentTime - this._startTime;
            this._internalQuarterNotePosition = this.metadata.positionSecondsToQuarterNote(timeSinceStart);
            requestAnimationFrame(this._boundQuarterNoteUpdateFunction);
        }
    }
}

export class OfflineSongManager extends SongManager {

    public context: OfflineAudioContext;

    /**
     * Constructs a SongManager for saving the track
     * @param {number} length
     * @memberof OfflineSongManager
     */
    constructor(length: number) {
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
        for (let src = 0, dst = 0; src < left.length; src++, dst += 2) {
            interleaved[dst] = left[src]
            interleaved[dst + 1] = right[src]
        };

        const wavBytes = getWavBytes(interleaved.buffer, {
            isFloat: true,       // floating point or 16-bit integer
            numChannels: 2,
            sampleRate: 44100,
        });

        return new Blob([wavBytes], { type: "audio/wav" });
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
    const numFrames = options.numFrames
    const numChannels = options.numChannels || 2
    const sampleRate = options.sampleRate || 44100
    const bytesPerSample = options.isFloat ? 4 : 2
    const format = options.isFloat ? 3 : 1

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
    "fileType": "SequencerSongSettings"
    "version": string,
    "metadataEvents": Array<ISongEvent>,
    "tracks": Array<ITrackSettings>,
    "chains": Array<IChainSettings>
}