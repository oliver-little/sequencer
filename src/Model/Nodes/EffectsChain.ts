import { ICustomInputAudioNode, ICustomOutputAudioNode } from "../Interfaces/ICustomAudioNode.js";
import { IChainSettings, IEffect, IEffectBooleanProperty, IEffectListProperty, IEffectNumberRange, IEffectProperty, IEffectStringProperty } from "../Interfaces/IInstrumentSettings.js";
import { Tuna } from "../../../dependencies/tuna.js";
import { v4 as uuid } from "uuid";

export class EffectsChain implements ICustomInputAudioNode, ICustomOutputAudioNode {

    public id: string;

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
        this._preGain = this._context.createGain();
        this._preGain.gain.value = this._settings.preGain;
        this._postGain = this._context.createGain();
        this._postGain.gain.value = this._settings.postGain;

        // Populate chain from settings
        if (this._settings.effects.length > 0) {
            let currentEffect = this.IEffectToEffectObject(this._settings.effects[0]);
            this._chainNodes.push(currentEffect);
            this._preGain.connect(currentEffect);
            for (let i = 1; i < this._settings.effects.length; i++) {
                currentEffect = this.IEffectToEffectObject(this._settings.effects[i])
                this._chainNodes[i - 1].connect(currentEffect);
                this._chainNodes.push(currentEffect);
            }
            this._chainNodes[this._chainNodes.length - 1].connect(this._postGain);
        }
        else {
            this._preGain.connect(this._postGain);
        }
    }

    get input() {
        return this._preGain;
    }

    get effectCount() {
        return this._chainNodes.length;
    }

    get effects(): IEffect[] {
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

    set chainName(value: string) {
        this._settings.chainName = value;
    }

    get preGain() {
        return this._preGain.gain.value;
    }

    set preGain(value: number) {
        this._preGain.gain.setValueAtTime(this._context.currentTime, value);
    }

    get postGain() {
        return this._postGain.gain.value;
    }

    set postGain(value: number) {
        this._postGain.gain.setValueAtTime(this._context.currentTime, value);
    }

    public connect(node: AudioNode | ICustomInputAudioNode) {
        if (node instanceof AudioNode) {
            this._postGain.connect(node);
        }
        else {
            this._postGain.connect(node.input);
        }
    }

    public disconnect(node: AudioNode | ICustomInputAudioNode) {
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
     * @param {IEffect} effect The interface object describing this object and its properties
     * @memberof EffectsChain
     */
    public addEffect(index: number, effect: IEffect) {
        if (index < 0 || index > this._chainNodes.length) {
            throw new RangeError(("Index out of range:" + index.toString()));
        }
        let effectObject = this.IEffectToEffectObject(effect);

        this._connectEffect(index, effectObject);

        // Update settings
        this._settings.effects.splice(index, 0, effect);
    }

    /**
     * Removes an effect from the chain at a specific index
     *
     * @param {number} index The index to remove the effect at.
     * @memberof EffectsChain
     */
    public removeEffect(index: number) {
        if (index >= 0 && index < this._chainNodes.length) {
            this._disconnectEffect(index);

            this._settings.effects.splice(index, 1);
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
    public moveEffect(index: number, newIndex: number) {
        index = Math.max(Math.min(this.effectCount, index), 0);
        newIndex = Math.max(Math.min(this.effectCount, newIndex), 0);

        if (index != newIndex) {
            let effect = this._disconnectEffect(index);

            this._connectEffect(newIndex, effect);

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
    public serialise(): IChainSettings {
        return this._settings;
    }

    public static createDefaults(): IChainSettings {
        return {
            "chainName": "",
            "effects": [],
            "preGain": 1,
            "postGain": 1,
            "connections": ["Context"]
        }
    }

    public IEffectToEffectObject(effect: IEffect) {
        let p = this._convertPropertyToObject(effect.properties);
        switch (effect.effectType) {
            case "Chorus":
                return new this._tuna.Chorus(p);
            case "Delay":
                return new this._tuna.Delay(p);
            case "Overdrive":
                return new this._tuna.Overdrive(p);
            case "Compressor":
                return new this._tuna.Compressor(p);
            case "Convolver":
                return new this._tuna.Convolver(p);
            case "Filter":
                return new this._tuna.Filter(p);
            case "Cabinet":
                return new this._tuna.Cabinet(p);
            case "Tremolo":
                return new this._tuna.Tremolo(p);
            case "WahWah":
                return new this._tuna.WahWah(p);
            case "Phaser":
                return new this._tuna.Phaser(p);
            case "Bitcrusher":
                return new this._tuna.Bitcrusher(p);
            case "Moog":
                return new this._tuna.MoogFilter(p);
            case "PingPongDelay":
                return new this._tuna.PingPongDelay(p);
            case "Panner":
                return new this._tuna.Panner(p);
            case "Gain":
                return new this._tuna.Gain(p);
            default:
                throw new Error("Invalid effect name.");
        }
    }

    private _convertPropertyToObject(properties: IEffectProperty[]) {
        let newObj = {};
        properties.forEach((prop) => {
            newObj[prop.propertyName] = prop.value;
        });

        return newObj;
    }

    /**
     * Completes the process of connecting a new effect to the chain
     * *without* updating settings
     *
     * @private
     * @param {number} index
     * @param {AudioNode} effect
     * @memberof EffectsChain
     */
    private _connectEffect(index: number, effect: AudioNode) {
        if (index < 0 || index > this._chainNodes.length) {
            throw new Error("Invalid index to disconnect effect.");
        }

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
    }

    /**
     * Completes the process of disconnecting an effect from the chain
     * updates chainNodes but not settings
     *
     * @private
     * @param {number} index
     * @returns The effect that was disconnected
     * @memberof EffectsChain
     */
    private _disconnectEffect(index: number): AudioNode {
        if (index < 0 || index >= this._chainNodes.length || this._chainNodes.length === 0) {
            throw new Error("Invalid index to disconnect effect.");
        }

        this._chainNodes[index].disconnect();

        let node = null;

        if (index > 0) {
            node = this._chainNodes[index - 1];
        }
        else {
            node = this._preGain;
        }
        node.disconnect();
        if (index === this._chainNodes.length - 1) {
            node.connect(this._postGain);
        }
        else {
            node.connect(this._chainNodes[index + 1]);
        }

        return this._chainNodes.splice(index, 1)[0];
    }

    // Effect Type Declarations

    public static Chorus(): IEffect {
        return {
            id: uuid(),
            effectType: "Chorus",
            properties: [
                { type: "number", propertyName: "rate", value: 1.5, editable: true, step: 0.01, min: 0.01, max: 8 } as IEffectNumberRange,
                { type: "number", propertyName: "feedback", value: 0.4, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "depth", value: 0.7, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "delay", value: 0.0045, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Delay(): IEffect {
        return {
            id: uuid(),
            effectType: "Delay",
            properties: [
                { type: "number", propertyName: "feedback", value: 0.45, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Delay Time", propertyName: "delayTime", value: 100, editable: true, step: 1, min: 1, max: 10000 } as IEffectNumberRange,
                { type: "number", displayName: "Wet Level", propertyName: "wetLevel", value: 0.5, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Dry Level", propertyName: "dryLevel", value: 1, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "cutoff", value: 20000, editable: true, step: 1, min: 20, max: 22050 } as IEffectNumberRange,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Phaser(): IEffect {
        return {
            id: uuid(),
            effectType: "Phaser",
            properties: [
                { type: "number", propertyName: "rate", value: 0.1, editable: true, step: 0.01, min: 0, max: 8 } as IEffectNumberRange,
                { type: "number", propertyName: "depth", value: 0.6, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "feedback", value: 0.7, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Stereo Phase", propertyName: "stereoPhase", value: 40, editable: true, step: 1, min: 0, max: 180 } as IEffectNumberRange,
                { type: "number", displayName: "Base Modulation Frequency", propertyName: "baseModulationFrequency", value: 700, editable: true, step: 1, min: 500, max: 1500 } as IEffectNumberRange,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Overdrive(): IEffect {
        return {
            id: uuid(),
            effectType: "Overdrive",
            properties: [
                { type: "number", displayName: "Output Gain", propertyName: "outputGain", value: 0, editable: true, step: 1, min: -42, max: 0 } as IEffectNumberRange,
                { type: "number", propertyName: "drive", value: 1, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Curve Amount", propertyName: "curveAmount", value: 0.725, editable: true, step: 0.01, min: 0, max: 0.99 } as IEffectNumberRange,
                { type: "number", displayName: "Algorithm Index", propertyName: "algorithmIndex", value: 0, editable: true, step: 1, min: 0, max: 5 } as IEffectNumberRange,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Compressor(): IEffect {
        return {
            id: uuid(),
            effectType: "Compressor",
            properties: [
                { type: "number", propertyName: "threshold", value: -20, editable: true, step: 1, min: -100, max: 0 } as IEffectNumberRange,
                { type: "number", displayName: "Makeup Gain", propertyName: "makeupGain", value: 1, editable: true, step: 1, min: 0, max: 200 } as IEffectNumberRange,
                { type: "number", propertyName: "attack", value: 1, editable: true, step: 1, min: 0, max: 1000 } as IEffectNumberRange,
                { type: "number", propertyName: "release", value: 250, editable: true, step: 1, min: 0, max: 3000 } as IEffectNumberRange,
                { type: "number", propertyName: "ratio", value: 4, editable: true, step: 1, min: 1, max: 20 } as IEffectNumberRange,
                { type: "number", propertyName: "knee", value: 5, editable: true, step: 1, min: 0, max: 40 } as IEffectNumberRange,
                { type: "boolean", displayName: "Auto Makeup", propertyName: "automakeup", value: false, editable: true } as IEffectBooleanProperty,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Convolver(): IEffect {
        return {
            id: uuid(),
            effectType: "Convolver",
            properties: [
                { type: "number", displayName: "High Cut", propertyName: "highCut", value: 22050, editable: true, step: 1, min: 20, max: 22050 } as IEffectNumberRange,
                { type: "number", displayName: "Low Cut", propertyName: "lowCut", value: 20, editable: true, step: 1, min: 20, max: 22050 } as IEffectNumberRange,
                { type: "number", displayName: "Wet Level", propertyName: "wetLevel", value: 1, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Dry Level", propertyName: "dryLevel", value: 1, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "level", value: 0.7, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "string", propertyName: "impulse", value: "/dependencies/impulses/impulse_rev.wav", editable: false } as IEffectStringProperty,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Filter(): IEffect {
        return {
            id: uuid(),
            effectType: "Filter",
            properties: [
                { type: "number", propertyName: "frequency", value: 22050, editable: true, step: 1, min: 20, max: 22050 } as IEffectNumberRange,
                { type: "number", propertyName: "Q", value: 1, editable: true, step: 0.001, min: 0.001, max: 100 } as IEffectNumberRange,
                { type: "number", propertyName: "gain", value: 0, editable: true, step: 1, min: -40, max: 40 } as IEffectNumberRange,
                { type: "list", displayName: "Filter Type", propertyName: "filterType", value: "lowpass", editable: true, options: ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"] } as IEffectListProperty,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Cabinet(): IEffect {
        return {
            id: uuid(),
            effectType: "Cabinet",
            properties: [
                { type: "number", displayName: "Makeup Gain", propertyName: "makeupGain", value: 1, editable: true, step: 0.1, min: 0, max: 20 } as IEffectNumberRange,
                { type: "string", displayName: "Impulse Path", propertyName: "impulsePath", value: "/dependencies/impulses/impulse_guitar.wav", editable: false } as IEffectStringProperty,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Tremolo(): IEffect {
        return {
            id: uuid(),
            effectType: "Tremolo",
            properties: [
                { type: "number", propertyName: "intensity", value: 1, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "rate", value: 5, editable: true, step: 0.001, min: 0.001, max: 8 } as IEffectNumberRange,
                { type: "number", propertyName: "stereoPhase", value: 0, editable: true, step: 1, min: 0, max: 180 } as IEffectNumberRange,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static WahWah(): IEffect {
        return {
            id: uuid(),
            effectType: "WahWah",
            properties: [
                { type: "boolean", displayName: "Auto", propertyName: "automode", value: true, editable: true } as IEffectBooleanProperty,
                { type: "number", displayName: "Base Frequency", propertyName: "baseFrequency", value: 0.5, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Excursion Octaves", propertyName: "excursionOctaves", value: 2, editable: true, step: 1, min: 1, max: 6 } as IEffectNumberRange,
                { type: "number", propertyName: "sweep", value: 0.2, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "resonance", value: 10, editable: true, step: 1, min: 1, max: 100 } as IEffectNumberRange,
                { type: "number", propertyName: "sensitivity", value: 0.5, editable: true, step: 0.01, min: -1, max: 1 } as IEffectNumberRange,
                { type: "boolean", propertyName: "bypass", value: false, editable: true } as IEffectBooleanProperty
            ]
        }
    }

    public static Bitcrusher(): IEffect {
        return {
            id: uuid(),
            effectType: "Bitcrusher",
            properties: [
                { type: "number", propertyName: "bits", value: 4, editable: true, step: 1, min: 1, max: 16 } as IEffectNumberRange,
                { type: "number", displayName: "Normal Frequency", propertyName: "normFreq", value: 0.1, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Buffer Size", propertyName: "bufferSize", value: 4096, editable: true, step: 1, min: 256, max: 16384 } as IEffectNumberRange,
            ]
        }
    }

    public static Moog(): IEffect {
        return {
            id: uuid(),
            effectType: "Moog",
            properties: [
                { type: "number", propertyName: "cutoff", value: 0.065, editable: true, step: 0.001, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", propertyName: "resonance", value: 3.5, editable: true, step: 0.01, min: 0, max: 4 } as IEffectNumberRange,
                { type: "number", displayName: "Buffer Size", propertyName: "bufferSize", value: 4096, editable: true, step: 1, min: 256, max: 16384 } as IEffectNumberRange,
            ]
        }
    }

    public static PingPongDelay(): IEffect {
        return {
            id: uuid(),
            effectType: "PingPongDelay",
            properties: [
                { type: "number", propertyName: "wetLevel", value: 1.5, editable: true, step: 0.01, min: 0.01, max: 8 } as IEffectNumberRange,
                { type: "number", propertyName: "feedback", value: 0.4, editable: true, step: 0.01, min: 0, max: 1 } as IEffectNumberRange,
                { type: "number", displayName: "Delay Time (Left)", propertyName: "delayTimeLeft", value: 200, editable: true, step: 1, min: 1, max: 10000 } as IEffectNumberRange,
                { type: "number", displayName: "Delay Time (Right)", propertyName: "delayTimeRight", value: 400, editable: true, step: 1, min: 1, max: 10000 } as IEffectNumberRange,
            ]
        }
    }

    public static Panner(): IEffect {
        return {
            id: uuid(),
            effectType: "Panner",
            properties: [{ type: "number", propertyName: "pan", value: 0, editable: true, step: 0.01, min: -1, max: 1 } as IEffectNumberRange]
        }
    }

    public static Gain(): IEffect {
        return {
            id: uuid(),
            effectType: "Gain",
            properties: [{ type: "number", propertyName: "gain", value: 1, editable: true, step: 0.01, min: 0, max: 2 } as IEffectNumberRange]
        }
    }
    public static possibleEffects : Map<string, (() =>IEffect)> = new Map([["Chorus", EffectsChain.Chorus], 
        ["Delay", EffectsChain.Delay], 
        ["Ping Pong Delay", EffectsChain.PingPongDelay], 
        ["Overdrive", EffectsChain.Overdrive], 
        ["Gain", EffectsChain.Gain], 
        ["Compressor",  EffectsChain.Compressor], 
        ["Pan", EffectsChain.Panner], 
        ["Convolver Reverb", EffectsChain.Convolver], 
        ["Tremolo", EffectsChain.Tremolo], 
        ["Filter", EffectsChain.Filter], 
        ["Bitcrusher", EffectsChain.Bitcrusher], 
        ["Phaser", EffectsChain.Phaser], 
        ["Wah", EffectsChain.WahWah], 
        ["Moog Filter", EffectsChain.Moog], 
        ["Cabinet Emulator", EffectsChain.Cabinet]]);
}