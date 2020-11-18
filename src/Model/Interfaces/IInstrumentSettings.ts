// Generally, these interfaces are used to make serialisation and deserialisation simpler.

interface IAmplitudeEnvelope {
    "attack"  : number,
    "release" : number
}

interface IInstrumentSettings {
    "type" : string,
    "gain" : number
}

interface IOscillatorSettings extends IInstrumentSettings {
    "type" : "oscillator",
    "oscillatorType" : string,
    "gain" : number,
    "envelopeEnabled" : boolean,
    "envelope" : IAmplitudeEnvelope,
}

interface ISoundFileSettings extends IInstrumentSettings {
    "type" : "soundFile",
    "gain" : number,
    // A base64 encoded Blob of the sound file
    "soundData" : string
}

interface IChainSettings {
    "chainName" : string
    "effects" : Array<IEffect>,
    "preGain" : number,
    "postGain" : number,
    "connections": Array<string>,
}

interface IEffectProperty {
    kind : string
    "propertyName" : string,
    "value" : any,
    "editable" : boolean
}

interface IEffectNumberProperty extends IEffectProperty {
    kind : "number"
    "value" : number
    "step" : number
}

interface IEffectNumberRange extends IEffectNumberProperty {
    "min" : number,
    "max" : number,
}

interface IEffectBooleanProperty extends IEffectProperty {
    kind : "boolean",
    "value" : boolean
}

interface IEffectStringProperty extends IEffectProperty {
    kind : "string",
    "value" : string,
}

interface IEffect {
    "effectType" : string,
    "properties" : IEffectProperty[],
}

export {IOscillatorSettings, ISoundFileSettings, IInstrumentSettings, IAmplitudeEnvelope, IChainSettings, IEffect, IEffectProperty, IEffectNumberProperty, IEffectNumberRange, IEffectBooleanProperty, IEffectStringProperty};