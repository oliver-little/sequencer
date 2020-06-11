import { IInstrumentSettings } from "../SongManagement/IInstrumentSettings.js";

export class BaseInstrument {

    public settings : IInstrumentSettings;

    protected _context : AudioContext;
    protected _source : AudioScheduledSourceNode;
    protected _sourceGain : GainNode;

    constructor(context : AudioContext, settings : IInstrumentSettings, source : AudioScheduledSourceNode, sourceGain : GainNode) {
        this._context = context;
        this.settings = settings;

        // Create nodes
        this._source = source;
        this._sourceGain = context.createGain();
        this._sourceGain.gain.value = 0;

        // Connect nodes
        this._source.connect(this._sourceGain);
        this._sourceGain.connect(context.destination);
    }

    // Functions rather than getter and setter to ensure subclasses also get these functions
    public getContext() {
        return this._context;
    }

    public setContext(value : AudioContext) {
        this._context = value;
        // Also point the source at the correct destination
        this._sourceGain.disconnect();
        this._sourceGain.connect(value.destination);
    }

    /**
     * Starts playback of an event
     *
     * @param {number} time The AudioContext time to start the playback
     * @param {number} [volume=1] Optional volume parameter [0-1] as a percentage of max volume
     * @memberof BaseInstrument
     */
    public startNote(time: number, volume = 1) : void {
        if (this.settings.envelopeEnabled) {
            this._sourceGain.gain.setValueAtTime(0, time);
            this._sourceGain.gain.linearRampToValueAtTime(this.settings.source.gain * volume, time + this.settings.envelope.attack);
        }
        else {
            this._sourceGain.gain.setValueAtTime(this.settings.source.gain * volume, time);
        }
    }

    /**
     * Stops the instrument at a given time with a given frequency
     *
     * @param {number} time The AudioContext time to stop playing at
     * @memberof BaseInstrument
     */
    public stopNote(time : number, volume = 1) : void {
        if (this.settings.envelopeEnabled) {
            this._sourceGain.gain.setValueAtTime(this.settings.source.gain * volume, time - this.settings.envelope.release);
            this._sourceGain.gain.linearRampToValueAtTime(0, time);
        }
        else {
            this._sourceGain.gain.setValueAtTime(0, time);
        }
    }

    /**
     * Stops playback immediately
     *
     * @memberof BaseInstrument
     */
    public stop() {
        this._sourceGain.gain.cancelAndHoldAtTime(0);
        this._sourceGain.gain.linearRampToValueAtTime(0, this.settings.envelope.release);
    }
}