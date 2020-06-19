import {IInstrumentSettings} from "./IInstrumentSettings.js";
import { ICustomOutputAudioNode } from "./ICustomAudioNode.js";

// Common functions between all instruments
export interface IInstrument extends ICustomOutputAudioNode {
    stop();
    serialise() : IInstrumentSettings;
}