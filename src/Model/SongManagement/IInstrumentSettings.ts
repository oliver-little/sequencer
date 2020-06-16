interface IInstrumentSettings {
    "source" : {
        "type" : string,
        "gain" : number,
    }
    "chains"? : Array<IChain>;
    
}

interface IAmplitudeEnvelope {
    "attack"  : number,
    "release" : number
}

interface IChain {
    "filters" : Array<IFilter>,
    "gain" : number
}

interface IFilter {
    "type" : string,
    "filterType" : string,
    "properties" : {[key: string] :any};
}

interface IOscillatorSettings extends IInstrumentSettings {
    "source" : {
        "type" : "oscillator",
        "oscillatorType" : string,
        "gain" : number
    }
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

export {IInstrumentSettings, IOscillatorSettings, ISoundFileSettings};