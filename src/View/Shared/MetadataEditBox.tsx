import * as React from "react";

interface MetadataProps {
    numerator: number,
    denominator: number,
    bpm: number,
    onSubmit: Function
}

export class MetadataEditBox extends React.Component<MetadataProps> {

    state: { numerator: string, denominator: number, bpm: string }

    constructor(props) {
        super(props);
        this.state = { numerator: this.props.numerator.toString(), denominator: this.props.denominator, bpm: this.props.bpm.toString() };
        this.handleNumeratorChange = this.handleNumeratorChange.bind(this);
        this.handleDenominatorChange = this.handleDenominatorChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleNumeratorChange(value: string) {
        this.setState({ numerator: value });
    }

    handleDenominatorChange(value: string) {
        let intValue = parseInt(value, 10);
        this.setState({ denominator: intValue });
    }

    handleBPMChange(value: string) {
        this.setState({ bpm: value });
    }

    handleSubmit(e : React.MouseEvent) {
        // Validate input on submit
        let newNumerator = parseInt(this.state.numerator);
        if (newNumerator === NaN) {
            this.setState({numerator: this.props.numerator});
            newNumerator = this.props.numerator;
        }
        let newBpm = parseInt(this.state.bpm);
        if (newBpm === NaN) {
            this.setState({bpm: this.props.bpm});
            newBpm = this.props.bpm
        }

        this.props.onSubmit(newNumerator, this.state.denominator, newBpm);
    }

    render() {
        return <div className="metadataEditDiv">
            <div className="metadataEditInnerDiv">
                <TimeSignatureEditBox numerator={this.state.numerator} onNumeratorChange={this.handleNumeratorChange} denominator={this.state.denominator} onDenominatorChange={this.handleDenominatorChange} />
                <input type="text" size={2} value={this.state.bpm} pattern="[0-9]*" onChange={(event) => { this.handleBPMChange(event.target.value) }} />
            </div>
            <button onClick={this.handleSubmit}>Submit</button>
        </div>
    }
}

interface TimeSignatureProps {
    numerator: string,
    onNumeratorChange: Function,
    denominator: number,
    onDenominatorChange: Function

}

class TimeSignatureEditBox extends React.Component<TimeSignatureProps> {

    public static timeSignatureNumbers = [2, 4, 8, 16, 32];

    state: TimeSignatureProps;

    render() {
        var containerStyle = { display: "inline-block" };
        return <div style={containerStyle}>
            <input type="text" value={this.props.numerator} onChange={(event) => { this.props.onNumeratorChange(event.target.value) }} />
            <div className="metadataEditDivider"></div>
            <SelectNumbers name="timeSigDenominator" numbers={TimeSignatureEditBox.timeSignatureNumbers} value={this.props.denominator} onSelectedChange={this.props.onDenominatorChange} />
        </div>
    }
}

class SelectNumbers extends React.Component<{ name: string, numbers: number[], value: number, onSelectedChange: Function }> {

    constructor(props) {
        super(props);
    }

    render() {
        const options = this.props.numbers.map((number) => {
            let numString = number.toString();
            return <option value={numString} key={numString}>{number}</option>;
        });

        return <select value={this.props.value} onChange={(event) => {this.props.onSelectedChange(event.target.value)}} >{options}</select>;
    }
}