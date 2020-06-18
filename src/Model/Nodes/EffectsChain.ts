import { ICustomInputAudioNode, ICustomOutputAudioNode } from "../Interfaces/ICustomAudioNode.js";
import { IChain } from "../Interfaces/IInstrumentSettings.js";
import { Tuna } from "../../../dependencies/tuna.js";
import {v4 as uuid} from "uuid";

export class EffectsChain implements ICustomInputAudioNode, ICustomOutputAudioNode {

    public id : string;

    private _context: AudioContext | OfflineAudioContext;
    private _settings: IChain;
    private _preGain: GainNode;
    private _postGain: GainNode;
    private _tuna;

    private _chainNodes = [];

    constructor(context: AudioContext | OfflineAudioContext, settings: IChain = EffectsChain.defaults) {
        this.id = uuid();

        this._context = context;
        this._settings = settings;
        this._tuna = new Tuna(context);
        this._preGain = context.createGain();
        this._preGain.gain.value = this._settings.preGain;
        this._postGain = context.createGain();
        this._preGain.gain.value = this._settings.postGain;

        // Populate chain from settings
        if (this._settings.effects.length > 0) {
            let currentEffect = this._tuna[this._settings.effects[0].effectType](this._settings.effects[0].properties);
            this._chainNodes.push(currentEffect);
            this._preGain.connect(currentEffect)
            for (let i = 1; i < this._settings.effects.length; i++) {
                currentEffect = this._tuna[this._settings.effects[i].effectType](this._settings.effects[i].properties)
                this._chainNodes[i-1].connect(currentEffect);
                this._chainNodes.push(currentEffect);
            }
            this._chainNodes[this._chainNodes.length - 1].connect(this._postGain);
        }
    }

    get input() {
        return this._postGain;
    }

    get effectCount() {
        return this._chainNodes.length;
    }

    public connect(node : AudioNode|ICustomInputAudioNode) {
        if (node instanceof AudioNode) {
            this._postGain.connect(node);
        }
        else {
            this._postGain.connect(node.input);
        }
    }

    public disconnect(node : AudioNode|ICustomInputAudioNode) {
        if (node instanceof AudioNode) {
            this._postGain.disconnect(node);
        }
        else {
            this._postGain.disconnect(node.input);
        }
    }

    public disconnectAll() {
        this._postGain.disconnect();
    }

    /**
     * Adds a new tuna effect to the chain - one of "Chorus", "Delay", "Phaser", "Overdrive", "Compressor", "Convolver", "Filter", 
     * "Cabinet", "Tremolo", "WahWah", "Bitcrusher", "MoogFilter", "PingPongDelay", "Panner", "Gain"
     *
     * @param {number} position The index to add the effect to in the chain, between 0 and the number of nodes in the chain (inclusive)
     * @param {string} effectType The name of the effect
     * @param {{[property : string] : any}} properties Properties object, different for each effect (see https://github.com/Theodeus/tuna/wiki/Node-examples for usage)
     * @memberof EffectsChain
     */
    public addEffect(index: number, effectType: string, properties: { [property: string]: any }) {
        if (index < 0 || index > this._chainNodes.length) {
            throw new RangeError("Index out of range");
        }
        let effect = new this._tuna[effectType](properties);

        // Connect effect
        if (index > 0) {
            this._chainNodes[index - 1].disconnect();
            this._chainNodes[index - 1].connect(effect);
        }
        else {
            this._preGain.disconnect();
            this._preGain.connect(effect);
        }
        if (index === this._chainNodes.length) {
            effect.connect(this._postGain);
            this._chainNodes.push(effect);
        }
        else {
            effect.connect(this._chainNodes[index]);
            this._chainNodes.splice(index, 0, effect);
        }

        // Update settings
        this._settings.effects.splice(index, 0, {effectType, properties});
    }

    /**
     * Removes an effect from the chain at a specific index
     *
     * @param {number} index The index to remove the effect at.
     * @memberof EffectsChain
     */
    public removeEffect(index: number) {
        if (index > 0 && index < this._chainNodes.length) {
            this._chainNodes[index-1].disconnect();
            this._chainNodes[index-1].connect(this._chainNodes[index+1]);
            this._chainNodes.splice(index, 1);
            this._settings.effects.splice(index, 1);
        }
        else {
            throw new RangeError("Index out of range");
        }
    }

    /**
     * Swaps the position of two effects in the chain
     *
     * @param {number} index1
     * @param {number} index2
     * @memberof EffectsChain
     */
    public swapEffects(index1 : number, index2 : number) {
        if (index1 > 0 && index1 < this._chainNodes.length && index2 > 0 && index2 < this._chainNodes.length) {
            if (index1 != index2) {
                // Disconnect nodes
                this._chainNodes[index1-1].disconnect();
                this._chainNodes[index1].disconnect();
                this._chainNodes[index2-1].disconnect();
                this._chainNodes[index2].disconnect();
                // Swap nodes
                let temp = this._chainNodes[index1];
                this._chainNodes[index1] = this._chainNodes[index2];
                this._chainNodes[index2] = temp;
                // Reconnect nodes
                this._chainNodes[index1-1].connect(this._chainNodes[index1]);
                this._chainNodes[index1].connect(this._chainNodes[index1+1]);
                this._chainNodes[index2-1].connect(this._chainNodes[index2]);
                this._chainNodes[index2].connect(this._chainNodes[index2+1]);
            }
        }
        else {
            throw new RangeError("Index out of range");
        }
    }

    public serialise() : IChain{
        return this._settings;
    }

    public static defaults : IChain = {
        "effects" : [],
        "preGain" : 1,
        "postGain" : 1,
        "connections" : ["context"]
    }
}


