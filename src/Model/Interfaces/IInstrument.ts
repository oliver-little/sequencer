import {IInstrumentSettings} from "./IInstrumentSettings.js";

// Common functions between all instruments
export interface IInstrument {
    stop();
    serialise() : IInstrumentSettings;
}