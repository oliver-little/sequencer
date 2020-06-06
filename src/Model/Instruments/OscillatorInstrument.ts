import SongMetadata from "../SongManagement/SongMetadata.js";

/**
 * Interface representing an instrument that can be played
 *
 * @interface IInstrument
 */
interface IInstrument { // Common functions between instruments 
    triggerAttack(time : number) : void;
    triggerRelease(time : number) : void;
}

/**
 * Implements an instrument based on the OscillatorNode class
 *
 * @export
 * @class OscillatorInstrument
 */
export class OscillatorInstrument {

    private _context : AudioContext;
    private _oscillator : OscillatorNode;
    private _oscillatorGain : GainNode;

    constructor(context : AudioContext, settings : Map<String, String>) {
        this._oscillator = context.createOscillator();
        this._oscillatorGain = context.createGain();
        this._oscillatorGain.gain.setValueAtTime(0, 0);
        this._oscillator.connect(this._oscillatorGain);
        this._oscillatorGain.connect(context.destination);
        this._oscillator.start();

        this._context = context;

        // TODO: Unpack settings to adjust oscillator settings

    }

    /**
     * Starts the oscillator instrument at a given time with a given frequency
     *
     * @param {number} frequency The frequency to play at
     * @param {number} time The AudioContext time to start at
     * @memberof OscillatorInstrument
     */
    public start(frequency : number, time : number) : void {
        this._oscillator.frequency.setValueAtTime(frequency, time);
        this._oscillatorGain.gain.setValueAtTime(0.5, time);
    }

    
    /**
     * Stops the oscillator instrument at a given time with a given frequency
     *
     * @param {number} time
     * @memberof OscillatorInstrument
     */
    public stop(time : number) : void {
        this._oscillatorGain.gain.setValueAtTime(0, time);
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
        this.start(frequency, time);
        this.stop(time + duration);
    }
}