import { IInstrument } from "../Interfaces/IInstrument.js";
import { IOscillatorSettings, IAmplitudeEnvelope } from "../Interfaces/IInstrumentSettings.js";
import { v4 as uuid } from "uuid";
import { ICustomOutputAudioNode, ICustomInputAudioNode } from "../Interfaces/ICustomAudioNode.js";

interface IOscillatorBaseChain {
    "oscillator": OscillatorNode,
    "gain": GainNode,
    "usage": number[][]
}

/**
 * Implements an instrument based on the OscillatorNode class. Not connected to any nodes by default.
 *
 * @export
 * @class OscillatorInstrument
 */
export class OscillatorInstrument implements IInstrument {
    public id: string;

    protected _settings: IOscillatorSettings;
    protected _context: AudioContext | OfflineAudioContext;
    protected _sources: IOscillatorBaseChain[];
    protected _masterGain: GainNode;

    /**
     * Creates an instance of OscillatorInstrument.
     * @param {AudioContext} context The AudioContext for this object
     * @param {IOscillatorSettings} [settings=JSON.parse(oscillatorDefaults)] An object describing the settings for this track
     * @memberof OscillatorInstrument
     */
    constructor(context: AudioContext | OfflineAudioContext, settings: IOscillatorSettings = OscillatorInstrument.createDefaults()) {
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

    set oscillatorType(value: string) {
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

    set masterGain(value: number) {
        if (!(value >= 0 && value <= 1)) {
            throw new RangeError("Invalid Gain Value");
        }
        this._settings.gain = value;
        this._masterGain.gain.setValueAtTime(value, this._context.currentTime);
    }

    get envelopeEnabled(): boolean {
        return this._settings.envelopeEnabled;
    }

    set envelopeEnabled(value: boolean) {
        this._settings.envelopeEnabled = value;
    }

    get envelope(): IAmplitudeEnvelope {
        return this._settings.envelope;
    }

    set envelope(value: IAmplitudeEnvelope) {
        this._settings.envelope = value;
    }

    /**
     * Connects this instrument to a give node.
     *
     * @param {AudioNode} node
     * @memberof OscillatorInstrument
     */
    public connect(node: AudioNode | ICustomInputAudioNode) {
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
    public disconnect(node: AudioNode | ICustomInputAudioNode) {
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
    public playNote(start: number, end: number, frequency: number): void {
        // Find oscillator that isn't in use
        let sourceToUse = null;
        for (let i = 0; i < this._sources.length; i++) {
            let sourceAvailable = true;
            let currentSource = this._sources[i];
            for (let j = currentSource.usage.length - 1; j >= 0; j--) {
                let noteDuration = currentSource.usage[j];
                if (this._context.currentTime > noteDuration[1]) {
                    currentSource.usage.splice(j, 1);
                    continue;
                }
                else if (start <= noteDuration[1]) {
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
            sourceToUse.oscillator.frequency.setValueAtTime(frequency, 0);
            this._sources.push(sourceToUse);
        }
        // Push the time this source is being used for to the list
        sourceToUse.usage.push([start, end]);
        // Switch out the base instrument's current source so it schedules the note correctly.

        this.scheduleNote(start, frequency, end, sourceToUse.oscillator, sourceToUse.gain);
    }

    public scheduleNote(startTime: number, frequency: number, endTime: number, source: OscillatorNode, sourceGain: GainNode, volume = 0.999): void {
        if (startTime < this._context.currentTime) {
            startTime = this._context.currentTime;
        }

        source.frequency.setValueAtTime(frequency, startTime - 0.0005);

        let attackEnd = startTime + 0.001;
        let releaseStart = endTime - 0.001;
        if (this._settings.envelopeEnabled) {
            releaseStart = endTime - this._settings.envelope.release;
            attackEnd = startTime + this._settings.envelope.attack;
        }


        releaseStart = Math.max(endTime - this._settings.envelope.release, startTime);
        attackEnd = Math.min(startTime + this._settings.envelope.attack, endTime);
        if (attackEnd > releaseStart) {
            attackEnd = releaseStart;
        }
        sourceGain.gain.cancelScheduledValues(startTime);
        sourceGain.gain.setTargetAtTime(0.0001, startTime, 0.01);
        sourceGain.gain.linearRampToValueAtTime(volume, attackEnd);
        sourceGain.gain.cancelScheduledValues(releaseStart);
        sourceGain.gain.setValueAtTime(volume, releaseStart);
        sourceGain.gain.exponentialRampToValueAtTime(0.00001, endTime);
    }

    /**
     * Stops playback on all sources immediately
     *
     * @memberof OscillatorInstrument
     */
    public stop() {
        this._sources.forEach(element => {
            element.gain.gain.cancelScheduledValues(this._context.currentTime);
            element.gain.gain.setTargetAtTime(0.0001, this._context.currentTime, 0.03);
        });
    }

    public serialise(): IOscillatorSettings {
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
    private static newOscillator(context: AudioContext | OfflineAudioContext, settings: IOscillatorSettings, destination: AudioNode): IOscillatorBaseChain {
        // Create nodes
        let source = context.createOscillator();
        source.start();
        source.type = settings.oscillatorType as OscillatorType;
        let sourceGain = context.createGain();
        sourceGain.gain.value = 0;

        // Connect nodes
        source.connect(sourceGain);
        sourceGain.connect(destination);
        return { oscillator: source, gain: sourceGain, usage: [] };
    }

    public static createDefaults(): IOscillatorSettings {
        return {
            "type": "oscillator",
            "oscillatorType": "sine",
            "gain": 0.5,
            "envelopeEnabled": true,
            "envelope": {
                "attack": 0.1,
                "release": 0.1
            }
        }
    }
}