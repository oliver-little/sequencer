/**
 * Manages the AudioContext, starting and stopping the timeline, and playing notes with already provided times.
 *
 * @class ClockManager
 */
class ClockManager {

    private _intervalTime = 50; 
    private _lookaheadTime = 0.05;
    private _context: AudioContext;
    private _running = false;

    private _bpm = 60;
    private _timeSignature = [4, 4];

    // Internal AudioContext time when the track was started.
    private _startTime = 0;
    // Internal setInterval ID in order to stop it when the track is stopped.
    private _intervalID = null;

    private _clickSample = null;

    constructor () {
        this._context = new AudioContext();
    }

    get context() {
        return this._context;
    }

    get running() {
        return this._running;
    }
    // A number greater than 0 representing the number of quarter notes per minute of the song.
    get bpm() {
        return this._bpm;
    }

    // bpm must be greater than 0.
    set bpm(value: number) {
        if (value < 0) {
            throw new RangeError();
        }
        this._bpm = value;
    }

    // Time period between each check to schedule new notes.
    get intervalTime() {
        return this._intervalTime;
    }

    set intervalTime(value: number) {
        if (value < 0) {
            throw new RangeError();
        }
        this._intervalTime = value;
    }

    // Amount of time to look ahead for clicks to schedule.
    get lookaheadTime() {
        return this._lookaheadTime;
    }

    set lookaheadTime(value: number) {
        if (value < 0) {
            throw new RangeError();
        }
        this._lookaheadTime = value;
    }

    start() : void {
        if(this._context.state === "suspended") {
            this._context.resume();
        }
        if (!this._running){
            this._startTime = this._context.currentTime;

            // TODO: Start note scheduler

            this._running = true;
        }
    }

    stop() : void {
        if (this._running) {
            clearInterval(this._intervalID);
        }
    }
}