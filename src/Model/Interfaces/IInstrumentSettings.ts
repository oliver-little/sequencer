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
    // TODO: add getters and setters to oscillatorinstrument then make settings private on all objects.
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

interface IEffect {
    "effectType" : string,
    "properties" : {[key: string] :any},
}

export {IOscillatorSettings, ISoundFileSettings, IInstrumentSettings, IAmplitudeEnvelope, IChainSettings};