import { SimpleEvent } from "../../HelperModules/SimpleEvent";
import { EventSnapType, NoteLength } from "./Enums";

export class EditType {
    public snapType : EventSnapType;
    public noteLength : NoteLength;
    public noteLengthDisabledChange : SimpleEvent;
    public markerCenteredChanged : SimpleEvent;

    private _noteLengthDisabled : boolean;
    private _markerCentered : boolean;

    constructor() {
        this.snapType = EventSnapType.Beat;
        this.noteLength = NoteLength.Quarter;
        this._noteLengthDisabled = true;
        this.noteLengthDisabledChange = new SimpleEvent();
        this.markerCenteredChanged = new SimpleEvent();
    }

    get noteLengthDisabled() {
        return this._noteLengthDisabled;
    }

    set noteLengthDisabled(value : boolean) {
        this._noteLengthDisabled = value;
        this.noteLengthDisabledChange.emit(value);
    }

    get markerCentered() {
        return this._markerCentered;
    }

    set markerCentered(value: boolean) {
        this._markerCentered = value;
        this.markerCenteredChanged.emit(value);
    }
}

export const editType = new EditType();