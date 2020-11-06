import { IInstrument } from "../Interfaces/IInstrument.js";
import { ICustomInputAudioNode, ICustomOutputAudioNode } from "../Interfaces/ICustomAudioNode.js";
import { ISoundFileSettings } from "../Interfaces/IInstrumentSettings.js";
import { v4 as uuid } from 'uuid';

/**
 * Creates an instrument that plays a sound file. Not connected to any nodes by default.
 *
 * @export
 * @class SoundFileInstrument
 * @implements {IInstrument}
 */
export class SoundFileInstrument implements IInstrument {
    public id : string; // UUID for this object
    
    protected _settings : ISoundFileSettings;
    protected _context : AudioContext|OfflineAudioContext;
    protected _audioBuffer : AudioBuffer;
    protected _masterGain : GainNode;

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
    static async create(context : AudioContext|OfflineAudioContext, settings : ISoundFileSettings = SoundFileInstrument.createDefaults()) {
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
    constructor(context : AudioContext|OfflineAudioContext, settings : ISoundFileSettings = SoundFileInstrument.createDefaults()) {
        this._settings = settings;
        this.id = uuid();


        this._context = context;
        this._playingNodes = [];

        this._masterGain = context.createGain();
        this._masterGain.gain.value = this._settings.gain;
    }

    /**
     * Completes construction of this object with the parts that are done asynchronously.
     *
     * @memberof SoundFileInstrument
     */
    public async initialise() {
        if (this._settings.soundData != "") {
            // Complicated way of decoding the base64 string into a blob, converting to an ArrayBuffer, then converting to an AudioBuffer
            this._audioBuffer = await this._context.decodeAudioData(await SoundFileInstrument.getBlobFromBase64(this._settings.soundData).arrayBuffer());
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

    get masterGain() {
        return this._masterGain.gain.value;
    }

    set masterGain(value : number) {
        if (!(value >= 0 && value <= 1)){
            throw new RangeError("Invalid Gain Value");
        }
        this._settings.gain = value;
        this._masterGain.gain.setValueAtTime(value, this._context.currentTime);
    }


    /**
     * Connects this instrument to a given node.
     *
     * @param {AudioNode} node
     * @memberof SoundFileInstrument
     */
    public connect(node : AudioNode|ICustomInputAudioNode) {
        if (node instanceof AudioNode) {
            this._masterGain.connect(node);
        }
        else {
            this._masterGain.connect(node.input);
        }
    }

    /**
     * Disconnects this instrument from a specific node, if it is connected.
     *
     * @param {AudioNode} node
     * @memberof SoundFileInstrument
     */
    public disconnect(node : AudioNode|ICustomInputAudioNode) {
        if (node instanceof AudioNode) {
            this._masterGain.disconnect(node);
        }
        else {
            this._masterGain.disconnect(node.input);
        }
    }

    /**
     * Removes all connections from this node.
     *
     * @memberof SoundFileInstrument
     */
    public disconnectAll() {
        this._masterGain.disconnect();
    }

    public playOneShot(startTime : number, offset : number, volume = 1) {
        let bufferSource = SoundFileInstrument.createBufferSource(this._context, this._audioBuffer);
        this._playingNodes.push(bufferSource);
        if (volume != 1) {
            let volumeGain = this._context.createGain();
            volumeGain.gain.value = volume;
            bufferSource.connect(volumeGain);
            volumeGain.connect(this._masterGain);
        }
        else {
            bufferSource.connect(this._masterGain);
        }
        if (offset < 0) {
            offset = 0;
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
            this._settings.soundData = base64;
        });

        // Get ArrayBuffer from blob and load as AudioBuffer
        this._audioBuffer = await this._context.decodeAudioData(await file.arrayBuffer());
    }

    public serialise() : ISoundFileSettings {
        return this._settings;
    }

    public destroy() {
        this._masterGain = null;
        this._playingNodes = [];
        this._audioBuffer = null;
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

    
    public static createDefaults() : ISoundFileSettings {
        return {
            "type": "soundFile",
            "gain": 1,
            "soundData": ""
        };
    }
}

