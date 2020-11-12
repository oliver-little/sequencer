import {IInstrument} from "../Interfaces/IInstrument.js";
import { IOscillatorSettings, IAmplitudeEnvelope } from "../Interfaces/IInstrumentSettings.js";
import {v4 as uuid} from "uuid";
import { ICustomOutputAudioNode, ICustomInputAudioNode } from "../Interfaces/ICustomAudioNode.js";

interface IOscillatorBaseChain {
    "oscillator" : OscillatorNode,
    "gain" : GainNode,
    "usage" : number[][]
}

/**
 * Implements an instrument based on the OscillatorNode class. Not connected to any nodes by default.
 *
 * @export
 * @class OscillatorInstrument
 */
export class OscillatorInstrument implements IInstrument {
    public id : string;
    
    protected _settings : IOscillatorSettings;
    protected _context : AudioContext|OfflineAudioContext;
    protected _sources : IOscillatorBaseChain[];
    protected _masterGain : GainNode;

    /**
     * Creates an instance of OscillatorInstrument.
     * @param {AudioContext} context The AudioContext for this object
     * @param {IOscillatorSettings} [settings=JSON.parse(oscillatorDefaults)] An object describing the settings for this track
     * @memberof OscillatorInstrument
     */
    constructor(context : AudioContext|OfflineAudioContext, settings : IOscillatorSettings = OscillatorInstrument.createDefaults()) {
        this._settings = settings;
        this.id = uuid();

        this._context = context;
        this._masterGain = context.createGain();
        this._masterGain.gain.value = this._settings.gain;
        this._sources = [OscillatorInstrument.newOscillator(context, settings, this._masterGain)];
    }

    get oscillatorType() {
        return this._sources[0].oscillator.type;
    }
    
    set oscillatorType(value : string) {
        // TODO: add support for custom waves (https://github.com/mohayonao/wave-tables)?
        if (["sine", "square", "sawtooth", "triangle"].indexOf(value) == -1) {
            throw new Error("Invalid oscillator type");
        }
        this._settings.oscillatorType = value;
        for (let i = 0; i < this._sources.length; i++) {
            this._sources[i].oscillator.type = value as OscillatorType;
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

    get envelopeEnabled() : boolean {
        return this._settings.envelopeEnabled;
    }
    
    set envelopeEnabled(value : boolean) {
        this._settings.envelopeEnabled = value;
    }

    get envelope() : IAmplitudeEnvelope {
        return this._settings.envelope;
    }

    set envelope(value : IAmplitudeEnvelope) {
        this._settings.envelope = value;
    }

    /**
     * Connects this instrument to a give node.
     *
     * @param {AudioNode} node
     * @memberof OscillatorInstrument
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
     * @memberof OscillatorInstrument
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
     * @memberof OscillatorInstrument
     */
    public disconnectAll() {
        this._masterGain.disconnect();
    }

    /**
     * Plays the oscillator at a given frequency, for a given time.
     *
     * @param {number} frequency The frequency to play the note at (Hz)
     * @param {number} time The audioContext time to start the note at (s)
     * @param {number} duration The duration of the note (s)
     * @memberof OscillatorInstrument
     */
    public playNote(start : number, end : number, frequency : number) : void {
        // Find oscillator that isn't in use
        let sourceToUse = null;
        for (let i = 0; i < this._sources.length; i++) {
            let sourceAvailable = true;
            let currentSource = this._sources[i];
            for(let j = currentSource.usage.length - 1; j >= 0; j--) {
                let noteDuration = currentSource.usage[j];
                if (this._context.currentTime > noteDuration[1]) {
                    currentSource.usage.splice(j, 1);
                    continue;
                }
                else if (start >= noteDuration[0] && start <= noteDuration[1]) {
                    sourceAvailable = false;
                    break;
                }
            }
            if (sourceAvailable) {
                sourceToUse = currentSource;
                break;
            }
        };
        // No free source found, make a new one.
        if (sourceToUse === null) {
            sourceToUse = OscillatorInstrument.newOscillator(this._context, this._settings, this._masterGain);
            this._sources.push(sourceToUse);
        }
        // Push the time this source is being used for to the list
        sourceToUse.usage.push([start, end]);
        // Switch out the base instrument's current source so it schedules the note correctly.

        this.startNote(start, frequency, sourceToUse.oscillator, sourceToUse.gain);
        this.stopNote(end, sourceToUse.gain);
    }

    
    public startNote(time : number, frequency : number, source : OscillatorNode, sourceGain : GainNode, volume = 1) : void {
        if (time < this._context.currentTime) {
            time = this._context.currentTime;
        }
        if (this._settings.envelopeEnabled) {
            sourceGain.gain.setValueAtTime(0, time);
            sourceGain.gain.linearRampToValueAtTime(volume, time + this._settings.envelope.attack);
        }
        else {
            sourceGain.gain.setValueAtTime(volume, time);
        }
        source.frequency.setValueAtTime(frequency, time);
    }

    /**
     * Stops the instrument at a given time with a given frequency
     *
     * @param {number} time The AudioContext time to stop playing at
     * @memberof BaseInstrument
     */
    public stopNote(time : number, sourceGain : GainNode, volume = 1) : void {
        if (this._settings.envelopeEnabled) {
            sourceGain.gain.cancelScheduledValues(time - this._settings.envelope.release);
            sourceGain.gain.setValueAtTime(volume, time - this._settings.envelope.release);
            sourceGain.gain.linearRampToValueAtTime(0, time);
        }
        else {
            sourceGain.gain.setValueAtTime(0, time);
        }
    }

    /**
     * Stops playback on all sources immediately
     *
     * @memberof OscillatorInstrument
     */
    public stop() {
        console.log(this._sources);
        this._sources.forEach(element => {
            element.gain.gain.cancelScheduledValues(0);
            element.gain.gain.setValueAtTime(element.gain.gain.value, this._context.currentTime);
            element.gain.gain.exponentialRampToValueAtTime(0.0001, this._context.currentTime + 0.1);
        });
    }

    public serialise() : IOscillatorSettings {
        return this._settings;
    }

    public destroy() {
        this._masterGain = null;
        this._sources = [];
    }

    /**
     * Creates a new oscillator, with a gain object attached to it.
     *
     * @private
     * @returns An array containing the oscillator and its gain.
     * @memberof OscillatorInstrument
     */
    private static newOscillator(context : AudioContext|OfflineAudioContext, settings : IOscillatorSettings, destination : AudioNode) : IOscillatorBaseChain {
        // Create nodes
        let source = context.createOscillator();
        source.start();
        source.type = settings.oscillatorType as OscillatorType;
        let sourceGain = context.createGain();
        sourceGain.gain.value = 0;

        // Connect nodes
        source.connect(sourceGain);
        sourceGain.connect(destination);
        return {oscillator : source, gain : sourceGain, usage : []};
    }

    public static createDefaults() : IOscillatorSettings {
        return {
            "type": "oscillator",
            "oscillatorType": "sine",
            "gain": 0.5,
            "envelopeEnabled" : true,
            "envelope": {
                "attack": 0.1,
                "release": 0.1
            }
        }
    }
}