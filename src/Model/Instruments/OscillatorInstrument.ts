import {BaseInstrument} from "./BaseInstrument.js";
import { IOscillatorSettings } from "../SongManagement/IInstrumentSettings.js";

/**
 * Implements an instrument based on the OscillatorNode class
 *
 * @export
 * @class OscillatorInstrument
 */
export class OscillatorInstrument extends BaseInstrument {

    public settings : IOscillatorSettings;

    protected _source : OscillatorNode;

    constructor(context : AudioContext, settings : IOscillatorSettings) {
        let oscillator = context.createOscillator();

        super(context, settings, oscillator);
        this._source = oscillator;
        this._source.start();

        this._source.type = this.settings.source.oscillatorType as OscillatorType;

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
        this.startNote(frequency, time);
        this.stopNote(time + duration);
    }
}