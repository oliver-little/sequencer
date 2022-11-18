import * as React from "react";
import { BoxSelect } from "../SharedReact/BasicElements";
import { ErrorModal } from "../SharedReact/Modal";

interface MetadataProps {
    numerator: number,
    denominator: number,
    bpm: number,
    onSubmit: Function
}

export class MetadataEditBox extends React.Component<MetadataProps> {

    state: { numerator: string, denominator: number, bpm: string, modalShown: boolean, errorString: string }

    constructor(props) {
        super(props);
        this.state = {
            numerator: this.props.numerator.toString(),
            denominator: this.props.denominator,
            bpm: this.props.bpm.toString(),
            modalShown: false, errorString: ""
        };
        this.handleNumeratorChange = this.handleNumeratorChange.bind(this);
        this.handleNumeratorBlur = this.handleNumeratorBlur.bind(this);
        this.handleDenominatorChange = this.handleDenominatorChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleNumeratorChange(value: string) {
        this.setState({ numerator: value });
    }

    handleNumeratorBlur(value: string) {
        let newNumerator = parseInt(value, 10);
        if (Number.isNaN(newNumerator) || newNumerator <= 0 || newNumerator > 32) {
            this.setState({ numerator: this.props.numerator, modalShown: true, errorString: "Invalid numerator value - please enter a number between 1 and 32." });
        }
        else {
            this.setState({ numerator: newNumerator });
        }
    }

    handleDenominatorChange(value: string) {
        let intValue = parseInt(value, 10);
        this.setState({ denominator: intValue });
    }

    handleBPMChange(value: string) {
        this.setState({ bpm: value });
    }

    handleBPMBlur(value: string) {
        let newBpm = parseInt(value, 10);
        if (Number.isNaN(newBpm) || newBpm <= 0 || newBpm > 300) {
            this.setState({ bpm: this.props.bpm, modalShown: true, errorString: "Invalid BPM value - please enter a number between 1 and 300." });
        }
        else {
            this.setState({ bpm: newBpm });
        }
    }

    handleSubmit() {
        if (!this.state.modalShown) {
            // Check input on submit again to be careful
            let newNumerator = parseInt(this.state.numerator);
            let newBpm = parseInt(this.state.bpm);
            this.props.onSubmit(newNumerator, this.state.denominator, newBpm);
        }
    }

    render() {
        return <div className="metadataDiv">
            <div className="boxSelectOverlayArrow top" />
            <div className="metadataInnerDiv">
                <div className="metadataProperty">
                    <p>Time Signature:</p>
                    <TimeSignatureEditBox numerator={this.state.numerator} onNumeratorBlur={(value) => { this.handleNumeratorBlur(value) }} onNumeratorChange={this.handleNumeratorChange} denominator={this.state.denominator} onDenominatorChange={this.handleDenominatorChange} />
                </div>
                <div className="metadataProperty">
                    <p>BPM:</p>
                    <input className="metadataBPM" type="text" size={2} value={this.state.bpm} pattern="[0-9]*" onBlur={(event) => { this.handleBPMBlur(event.target.value) }} onChange={(event) => { this.handleBPMChange(event.target.value) }} />
                </div>
                <button className="metadataSubmit" onClick={this.handleSubmit}>Submit</button>
            </div>
            {this.state.modalShown && <ErrorModal error={this.state.errorString} onClose={() => this.setState({ modalShown: false })} />}
        </div>
    }
}

interface TimeSignatureProps {
    numerator: string,
    onNumeratorBlur: Function,
    onNumeratorChange: Function,
    denominator: number,
    onDenominatorChange: Function

}

class TimeSignatureEditBox extends React.Component<TimeSignatureProps> {

    public static timeSignatureStrings = ["2", "4", "8", "16", "32"];
    public static timeSignatureNumbers = [2, 4, 8, 16, 32];

    state: TimeSignatureProps;

    render() {
        var containerStyle = { display: "inline-block" };
        return <div className="metadataTimeSignature" style={containerStyle}>
            <input className="metadataNumerator" type="text" value={this.props.numerator} onBlur={(event) => { this.props.onNumeratorBlur(event.target.value) }} onChange={(event) => { this.props.onNumeratorChange(event.target.value) }} />
            <div className="metadataDivider"></div>
            <BoxSelect mainButtonClassName="metadataDenominator buttonAnim" boxSelectTitle={this.props.denominator.toString()} options={TimeSignatureEditBox.timeSignatureStrings} selectedCallback={(value) => { this.props.onDenominatorChange(TimeSignatureEditBox.timeSignatureNumbers[value]) }} />
        </div>
    }
}
