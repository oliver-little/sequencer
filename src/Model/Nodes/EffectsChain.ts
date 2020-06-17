import { ICustomInputAudioNode, ICustomOutputAudioNode } from "../Interfaces/ICustomAudioNode.js";
import { IChain } from "../Interfaces/IInstrumentSettings.js";
import {Tuna} from "../../../dependencies/tuna.js";

export class EffectsChain implements ICustomInputAudioNode, ICustomOutputAudioNode {

    private _context : AudioContext|OfflineAudioContext;
    private _settings : IChain;
    private _preGain : GainNode;
    private _postGain : GainNode;
    private _tuna;

    private _chainNodes = [];

    constructor (context : AudioContext|OfflineAudioContext, settings : IChain) {
        this._context = context;
        this._settings = settings;
        this._tuna = new Tuna(context);
        this._preGain = context.createGain();
        this._postGain = context.createGain();
    }

    get effectCount() {
        return this._chainNodes.length;
    }

    /**
     * Adds a new tuna effect to the chain - one of "Chorus", "Delay", "Phaser", "Overdrive", "Compressor", "Convolver", "Filter", 
     * "Cabinet", "Tremolo", "WahWah", "Bitcrusher", "MoogFilter", "PingPongDelay", "Panner", "Gain"
     *
     * @param {number} position The index to add the effect to in the chain
     * @param {string} effectType The name of the effect
     * @param {{[property : string] : any}} properties Properties object, different for each effect (see https://github.com/Theodeus/tuna/wiki/Node-examples for usage)
     * @memberof EffectsChain
     */
    public addEffect(index : number, type : string, effectType : string, properties : {[property : string] : any}) {
        let effect = null;
        if (type == "tuna") { // Create tuna effect
            let effect = new this._tuna[effectType](properties);
            

        }
        else if (type == "standard") { // Create default web audio effect
            let x=1;
        }
        // Connect effect
        this._chainNodes[index-1].disconnect();
        this._chainNodes[index-1].connect(effect);
    }

    /**
     * Removes an effect from the chain at a specific index
     *
     * @param {number} index The index to remove the effect at.
     * @memberof EffectsChain
     */
    public removeEffect(index : number) {
        if (index > 0 && index < this._chainNodes.length) {
            this._chainNodes.splice(index, 1);
        }
        else {
            throw new RangeError("Index out of range");
        }
    }
}
