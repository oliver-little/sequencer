interface IInstrumentSettings {
    "source" : {
        "type" : string,
        "gain" : number,
    }
    "envelopeEnabled" : boolean,
    "envelope"? : IAmplitudeEnvelope,
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
}

interface IMP3Settings extends IInstrumentSettings {
    "source" : {
        "type" : "MP3",
        "gain" : number,
        "MP3Data" : Blob
    }
}

export {IInstrumentSettings, IOscillatorSettings};