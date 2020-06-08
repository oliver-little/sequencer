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

    constructor(context : AudioContext, settings : IOscillatorSettings) {
        let oscillator = context.createOscillator();
        let startOscillator = OscillatorInstrument.newOscillator(context, settings);
        startOscillator.oscillator.type = settings.source.oscillatorType as OscillatorType;

        super(context, settings, startOscillator.oscillator, startOscillator.gain);
        this._sources = [startOscillator];
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
    public playNote(frequency : number, time : number, duration : number) : void {
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
                else if (time >= noteDuration[0] && time <= noteDuration[1]) {
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
        sourceToUse.usage.push([time, time + duration]);
        // Switch out the base instrument's current source so it schedules the note correctly.
        this._source = sourceToUse.oscillator;
        this._sourceGain = sourceToUse.gain;

        this.startNote(frequency, time);
        this.stopNote(time + duration);
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