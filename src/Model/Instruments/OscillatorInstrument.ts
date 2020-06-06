import SongMetadata from "../SongManagement/SongMetadata.js";
import {EventTrack} from "../Notation/EventTrack.js";

/**
 * Interface representing an instrument that can be played
 *
 * @interface IInstrument
 */
interface IInstrument { // Common functions between instruments 
    track : EventTrack;
    triggerAttack(time : number) : void;
    triggerRelease(time : number) : void;
}

export class OscillatorInstrument implements IInstrument {

    public track : EventTrack;

    private _context : AudioContext;
    private _oscillator : OscillatorNode;

    constructor(metadata : SongMetadata, context : AudioContext, settings : Map<String, String>) {
        this._oscillator = context.createOscillator();
        this._oscillator.connect(context.destination);

        // TODO: Unpack settings to adjust oscillator settings

        this.track = new EventTrack(metadata);
    }

    public triggerAttack(time : number) : void {
        this._oscillator.start(time);
    }

    public triggerRelease(time : number) : void {
        this._oscillator.stop(time);
    }
}