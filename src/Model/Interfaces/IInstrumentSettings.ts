interface IInstrumentSettings {
    "source" : {
        "type" : string,
        "gain" : number,
    }
    "connections" : Array<String>
}

interface IAmplitudeEnvelope {
    "attack"  : number,
    "release" : number
}

interface IOscillatorSettings extends IInstrumentSettings {
    "source" : {
        "type" : "oscillator",
        "oscillatorType" : string,
        "gain" : number
    }
    // TODO: add getters and setters to oscillatorinstrument then make settings private on all objects.
    "envelopeEnabled" : boolean,
    "envelope"? : IAmplitudeEnvelope,
}

interface ISoundFileSettings extends IInstrumentSettings {
    "source" : {
        "type" : "soundFile",
        "gain" : number,
        // A base64 encoded Blob of the sound file
        "soundData" : string
    }
}

interface IChain {
    "filters" : Array<IEffect>,
    "connections": Array<String>,
}

interface IEffect {
    "type" : string,
    "effectType" : string,
    "properties" : {[key: string] :any},
}

export {IInstrumentSettings, IOscillatorSettings, ISoundFileSettings, IChain};