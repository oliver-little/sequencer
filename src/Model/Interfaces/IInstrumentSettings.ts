interface IInstrumentSettings {
    "source" : ISourceSettings
    "connections" : Array<string>
}

interface IAmplitudeEnvelope {
    "attack"  : number,
    "release" : number
}

interface ISourceSettings {
    "type" : string,
    "gain" : number
}

interface IOscillatorSettings extends ISourceSettings {
    "type" : "oscillator",
    "oscillatorType" : string,
    "gain" : number,
    // TODO: add getters and setters to oscillatorinstrument then make settings private on all objects.
    "envelopeEnabled" : boolean,
    "envelope"? : IAmplitudeEnvelope,
}

interface ISoundFileSettings extends ISourceSettings {
    "type" : "soundFile",
    "gain" : number,
    // A base64 encoded Blob of the sound file
    "soundData" : string
}

interface IChain {
    "effects" : Array<IEffect>,
    "preGain" : number,
    "postGain" : number,
    "connections": Array<String>,
}

interface IEffect {
    "effectType" : string,
    "properties" : {[key: string] :any},
}

export {IInstrumentSettings, IOscillatorSettings, ISoundFileSettings, IChain};