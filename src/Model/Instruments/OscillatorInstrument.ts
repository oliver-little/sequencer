import {IInstrument} from "./IInstrument.js";
import { IOscillatorSettings } from "../SongManagement/IInstrumentSettings.js";
import SongMetadata from "../SongManagement/SongMetadata.js";

interface IOscillatorBaseChain {
    "oscillator" : OscillatorNode,
    "gain" : GainNode,
    "usage" : number[][]
}

/**
 * Implements an instrument based on the OscillatorNode class
 *
 * @export
 * @class OscillatorInstrument
 */
export class OscillatorInstrument implements IInstrument {

    public settings : IOscillatorSettings;

    protected _context : AudioContext|OfflineAudioContext;
    protected _sources : IOscillatorBaseChain[];
    protected _masterGain : GainNode;

    /**
     *Creates an instance of OscillatorInstrument.
     * @param {AudioContext} context The AudioContext for this object
     * @param {IOscillatorSettings} [settings=JSON.parse(oscillatorDefaults)] An object describing the settings for this track
     * @memberof OscillatorInstrument
     */
    constructor(context : AudioContext|OfflineAudioContext, settings : IOscillatorSettings = JSON.parse(oscillatorDefaults)) {
        this._context = context;
        this.settings = settings;
        this._masterGain = context.createGain();
        this._masterGain.gain.value = this.settings.source.gain;
        this._masterGain.connect(context.destination);
        this._sources = [OscillatorInstrument.newOscillator(context, settings, this._masterGain)];
    }

    get oscillatorType() {
        return this._sources[0].oscillator.type;
    }
    
    set oscillatorType(value : string) {
        this.settings.source.oscillatorType = value;
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
        this.settings.source.gain = value;
        this._masterGain.gain.value;
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
            sourceToUse = OscillatorInstrument.newOscillator(this._context, this.settings, this._masterGain);
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
        if (this.settings.envelopeEnabled) {
            sourceGain.gain.setValueAtTime(0, time);
            sourceGain.gain.linearRampToValueAtTime(volume, time + this.settings.envelope.attack);
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
        if (this.settings.envelopeEnabled) {
            sourceGain.gain.cancelScheduledValues(time - this.settings.envelope.release);
            sourceGain.gain.setValueAtTime(volume, time - this.settings.envelope.release);
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
        this._sources.forEach(element => {
            element.gain.gain.cancelAndHoldAtTime(0);
            element.gain.gain.linearRampToValueAtTime(0, this.settings.envelope.release);
        });
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
        source.type = settings.source.oscillatorType as OscillatorType;
        let sourceGain = context.createGain();
        sourceGain.gain.value = 0;

        // Connect nodes
        source.connect(sourceGain);
        sourceGain.connect(destination);
        return {oscillator : source, gain : sourceGain, usage : []};
    }
}

let oscillatorDefaults = `{
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
    }
}`;