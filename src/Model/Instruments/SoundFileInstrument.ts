import { IInstrument } from "./IInstrument.js";
import { ISoundFileSettings } from "../SongManagement/IInstrumentSettings.js";

export class SoundFileInstrument implements IInstrument  {
    public settings : ISoundFileSettings;

    protected _context : AudioContext|OfflineAudioContext;
    protected _audioBuffer : AudioBuffer;
    protected _gainNode : GainNode;

    private _playingNodes : AudioBufferSourceNode[];


    /**
     * Creates a new instance of SoundFileInstrument and calls initialise.
     *
     * @static
     * @param {(AudioContext|OfflineAudioContext)} context
     * @param {ISoundFileSettings} settings
     * @returns
     * @memberof SoundFileInstrument
     */
    static async create(context : AudioContext|OfflineAudioContext, settings : ISoundFileSettings) {
        const o = new SoundFileInstrument(context, settings);
        await o.initialise();
        return o;
    }

    /**
     * Creates a new instance of SoundFileInstrument. initialise **must** be called alongside this as some construction must be done asynchronously.
     * @param {(AudioContext|OfflineAudioContext)} context
     * @param {IMP3Settings} settings
     * @memberof MP3Instrument
     */
    constructor(context : AudioContext|OfflineAudioContext, settings : ISoundFileSettings) {
        this._context = context;
        this._playingNodes = [];
        this.settings = settings;

        this._gainNode = context.createGain();
        this._gainNode.gain.value = this.settings.source.gain;
        this._gainNode.connect(context.destination);
    }

    /**
     * Completes construction of this object with the parts that are done asynchronously.
     *
     * @memberof SoundFileInstrument
     */
    public async initialise() {
        if (this.settings.source.soundData != "") {
            // Complicated way of decoding the base64 string into a blob, converting to an ArrayBuffer, then converting to an AudioBuffer
            this._audioBuffer = await this._context.decodeAudioData(await SoundFileInstrument.getBlobFromBase64(this.settings.source.soundData).arrayBuffer());
        }
    }

    get duration() {
        if (this._audioBuffer != null) {
            return this._audioBuffer.duration;
        }
        else {
            return 0;
        }
    }

    public playOneShot(startTime : number, offset : number, volume = 1) {
        let bufferSource = SoundFileInstrument.createBufferSource(this._context, this._audioBuffer);
        this._playingNodes.push(bufferSource);
        if (volume != 1) {
            let volumeGain = this._context.createGain();
            volumeGain.gain.value = volume;
            bufferSource.connect(volumeGain);
            volumeGain.connect(this._gainNode);
        }
        else {
            bufferSource.connect(this._gainNode);
        }
        bufferSource.start(startTime, offset);
    }

    public stop() {
        // TODO: store references to gain nodes and destroy them too.
        this._playingNodes.forEach(bufferSource => {
            bufferSource.stop();
        });
        // Remove all references as they can't be used again
        this._playingNodes = [];
    }

    public async setSoundFile(file : Blob) {
        SoundFileInstrument.getBase64FromBlob(file, base64 => {
            this.settings.source.soundData = base64;
        });

        // Get ArrayBuffer from blob and load as AudioBuffer
        this._audioBuffer = await this._context.decodeAudioData(await file.arrayBuffer());
    }

    private static createBufferSource(context : AudioContext|OfflineAudioContext, buffer : AudioBuffer) : AudioBufferSourceNode {
        let bufferSource = context.createBufferSource();
        bufferSource.buffer = buffer;
        return bufferSource;
    }

    /**
     * Creates a base64 string from a Blob, callback is what function to call when the 
     *
     * @private
     * @static
     * @param {Blob} file
     * @param {Function} callback
     * @memberof SoundFileInstrument
     */
    // TODO: look at this, unsure if it's the best approach, possibly some kind of zip archive for all mp3 files, then sounddata just stores a pointer.
    private static getBase64FromBlob(file : Blob, callback : Function) : void {
        // Encode blob as base64 to save to settings.
        let reader = new FileReader();

        reader.onload = function() {
            callback(reader.result);
        };

        reader.readAsDataURL(file);
    }

    /**
     * Creates a blob from a base64 string, this string is also assumed to have a prefix of data:<media type>[;base64], data
     *
     * @private
     * @param {String} base64Blob
     * @returns {Blob}
     * @memberof SoundFileInstrument
     */
    private static getBlobFromBase64(base64blob : String) : Blob {
        var byteString = atob(base64blob.split(',')[1]);
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);

        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: base64blob.split(":").pop().split(";")[0] });
    }
}

