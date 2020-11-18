import { ICustomInputAudioNode, ICustomOutputAudioNode } from "../Interfaces/ICustomAudioNode.js";
import { IChainSettings, IEffect, IEffectProperty } from "../Interfaces/IInstrumentSettings.js";
import { Tuna } from "../../../dependencies/tuna.js";
import {v4 as uuid} from "uuid";
import { ConnectionManager } from "../SongManagement/ConnectionManager.js";

export class EffectsChain implements ICustomInputAudioNode, ICustomOutputAudioNode {

    public id : string;

    private _context: AudioContext | OfflineAudioContext;
    private _settings: IChainSettings;
    private _preGain: GainNode;
    private _postGain: GainNode;
    private _tuna;

    private _chainNodes = [];

    constructor(context: AudioContext | OfflineAudioContext, settings: IChainSettings = EffectsChain.createDefaults()) {
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
            let currentEffect = this.stringToEffectsObject(this._settings.effects[0].effectType, this._settings.effects[0].properties);
            this._chainNodes.push(currentEffect);
            this._preGain.connect(currentEffect)
            for (let i = 1; i < this._settings.effects.length; i++) {
                currentEffect = this.stringToEffectsObject(this._settings.effects[i].effectType, this._settings.effects[i].properties)
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

    get effects() : IEffect[] {
        return this._settings.effects;
    }

    get effectNodes() {
        return this._chainNodes;
    }

    /**
     * The name assigned to this EffectsChain by the connection manager
     *
     * @memberof EffectsChain
     */
    get chainName() {
        return this._settings.chainName;
    }

    set chainName(value : string) {
        this._settings.chainName = value;
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
     * @param {IEffectProperty[]} properties Properties object, different for each effect (see https://github.com/Theodeus/tuna/wiki/Node-examples for usage)
     * @memberof EffectsChain
     */
    public addEffect(index: number, effectType: string, properties: IEffectProperty[]) {
        if (index < 0 || index > this._chainNodes.length) {
            throw new RangeError("Index out of range");
        }
        let effect = this.stringToEffectsObject(effectType, properties);

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

                temp = this._settings.effects[index1];
                this._settings.effects[index1] = this._settings.effects[index2];
                this._settings.effects[index2] = temp;
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

    /**
     * Moves an effect at a given index to a new index
     *
     * @param {number} index The index to move from
     * @param {number} newIndex The index to move to
     * @memberof EffectsChain
     */
    public moveEffect(index : number, newIndex : number) {
        index = Math.max(Math.min(this.effectCount, index), 0);
        newIndex = Math.max(Math.min(this.effectCount, newIndex), 0);

        if (index != newIndex) {
            this._chainNodes[index].disconnect();
            this._chainNodes[index-1].disconnect();
            this._chainNodes[index-1].connect(this._chainNodes[index+1]);

            let effect = this._chainNodes[index];
            this._chainNodes.splice(index, 1);

            this._chainNodes[newIndex-1].disconnect();
            this._chainNodes.splice(newIndex, 0, effect);
            this._chainNodes[newIndex-1].connect(this._chainNodes[newIndex]);
            this._chainNodes[newIndex].connect(this._chainNodes[newIndex+1]);

            let temp = this._settings.effects[index];
            this._settings.effects.splice(index, 1);
            this._settings.effects.splice(newIndex, 0, temp);
        }
    }

    /**
     * Returns a copy of this effects chain's settings (note that its current connections are NOT accurate)
     *
     * @returns {IChainSettings}
     * @memberof EffectsChain
     */
    public serialise() : IChainSettings{
        return this._settings;
    }

    public static createDefaults() : IChainSettings {
        return {
            "chainName" : "",
            "effects" : [],
            "preGain" : 1,
            "postGain" : 1,
            "connections" : ["Context"]
        }
    }

    public stringToEffectsObject(effectString : string, properties? : IEffectProperty[]) {
        let p = this._convertPropertyToObject(properties);
        switch (effectString) {
            case "Chorus":
                return this._tuna.Chorus(p);
            case "Delay":
                return this._tuna.Delay(p);
            case "Overdrive":
                return this._tuna.Overdrive(p);
            case "Compressor":
                return this._tuna.Compressor(p);
            case "Convolver":
                return this._tuna.Convolver(p);
            case "Filter":
                return this._tuna.Filter(p);
            case "Cabinet":
                return this._tuna.Cabinet(p);
            case "Tremolo":
                return this._tuna.Tremolo(p);
            case "WahWah":
                return this._tuna.WahWah(p);
            case "Phaser":
                return this._tuna.Phaser(p);
            case "Bitcrusher":
                return this._tuna.Bitcrusher(p);
            case "Moog":
                return this._tuna.MoogFilter(p);
            case "PingPongDelay":
                return this._tuna.PingPongDelay(p);
            case "Panner":
                return this._tuna.Panner(p);
            case "Gain":
                return this._context.createGain();
            default:
                throw new Error("Invalid effect name.");
        }
    }

    private _convertPropertyToObject(properties : IEffectProperty[]) {
        let newObj = {};
        properties.forEach((prop) => {
            newObj[prop.propertyName] = prop.value;
        });

        return newObj;
    }
}


