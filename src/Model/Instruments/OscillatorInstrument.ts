import {BaseInstrument} from "./BaseInstrument.js";
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
export class OscillatorInstrument extends BaseInstrument {

    public settings : IOscillatorSettings;

    protected _sources : IOscillatorBaseChain[];
    protected _source : OscillatorNode;

    /**
     *Creates an instance of OscillatorInstrument.
     * @param {AudioContext} context The AudioContext for this object
     * @param {IOscillatorSettings} [settings=JSON.parse(oscillatorDefaults)]
     * @memberof OscillatorInstrument
     */
    constructor(context : AudioContext, settings : IOscillatorSettings = JSON.parse(oscillatorDefaults)) {
        let oscillator = context.createOscillator();
        let startOscillator = OscillatorInstrument.newOscillator(context, settings);

        super(context, settings, startOscillator.oscillator, startOscillator.gain);
        this._sources = [startOscillator];

        // Custom getter and setter to directly update all oscillators with new type if it's changed.
        // TODO: when serialising the settings, this getter setter format needs to be turned back to an actual property
        Object.defineProperty(settings.source, "oscillatorType", { 
            get: function() {
                return this._sources[0].oscillator.type;
            }.bind(this),
            set: function(value : string) {
                for (let i = 0; i < this._sources.length; i++) {
                    this._sources[i].oscillator.type = value;
                }
            }.bind(this)
        });
    }

    // Override superclass function to update all sources
    public setContext(value : AudioContext) {
        this._context = value;
        for (let i = 0; i < this._sources.length; i++) {
            this._sources[i].oscillator.disconnect();
            this._sources[i].oscillator.connect(value.destination);
        }
    }

    /**
     * Starts the oscillator instrument at a given time with a given frequency
     *
     * @param {number} frequency The frequency to play at
     * @param {number} time The AudioContext time to start at
     * @param {number} [volume=1] Optional volume parameter for this note only.
     * @memberof OscillatorInstrument
     */
    
    public startNote(frequency : number, time : number, volume = 1) : void {
        super.startNote(time, volume);
        this._source.frequency.setValueAtTime(frequency, time);
    }

    /**
     * Plays the oscillator at a given frequency, for a given time.
     *
     * @param {number} frequency The frequency to play the note at (Hz)
     * @param {number} time The audioContext time to start the note at (s)
     * @param {number} duration The duration of the note (s)
     * @memberof OscillatorInstrument
     */
    public playNote(frequency : number, start : number, end : number) : void {
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
            sourceToUse = OscillatorInstrument.newOscillator(this._context, this.settings);
            this._sources.push(sourceToUse);
        }
        // Push the time this source is being used for to the list
        sourceToUse.usage.push([start, end]);
        // Switch out the base instrument's current source so it schedules the note correctly.
        this._source = sourceToUse.oscillator;
        this._sourceGain = sourceToUse.gain;

        this.startNote(frequency, start);
        this.stopNote(end);
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
    private static newOscillator(context : AudioContext, settings : IOscillatorSettings) : IOscillatorBaseChain {
        // Create nodes
        let source = context.createOscillator();
        source.start();
        source.type = settings.source.oscillatorType as OscillatorType;
        let sourceGain = context.createGain();
        sourceGain.gain.value = 0;

        // Connect nodes
        source.connect(sourceGain);
        sourceGain.connect(context.destination);
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