import * as React from "react";
import { editType } from "../Settings/EditType";

interface EditPanelState {
    selectedSnapButton : number,
    selectedLengthButton : number,
    lengthEnabled : boolean
}

export class EditPanel extends React.Component<{}, EditPanelState> {
    constructor(props) {
        super(props);

        this._snapTypeChanged = this._snapTypeChanged.bind(this);
        this._lengthTypeChanged = this._lengthTypeChanged.bind(this);
        this._lengthEnabledChanged = this._lengthEnabledChanged.bind(this);

        this.state = {
            selectedSnapButton : editType.snapType,
            selectedLengthButton : editType.noteLength,
            lengthEnabled : editType.noteLengthDisabled
        };
    }

    componentDidMount() {
        editType.noteLengthDisabledChange.addListener(this._lengthEnabledChanged);
    }

    componentWillUnmount() {
        editType.noteLengthDisabledChange.removeListener(this._lengthEnabledChanged);
    }

    private _snapTypeChanged(index) {
        this.setState({selectedSnapButton : index});
        editType.snapType = index;
    }

    private _lengthTypeChanged(index) {
        this.setState({selectedLengthButton : index});
        editType.noteLength = index;
    }

    private _lengthEnabledChanged(value : boolean) {
        this.setState({lengthEnabled : value});
    }

    render() {
        return <div className={"editPanel"}>
                <SelectionGroup className={"snapTypeGroup"} buttonClassName={"panelButton"} disabled={false} selectedButton={this.state.selectedSnapButton} buttonContents={["1", <Fraction n={1} d={2} />, <Fraction n={1} d={4} />, <Fraction n={1} d={8} />, <p>&#x2716;</p>]} onButtonClick={this._snapTypeChanged} />
                <SelectionGroup className={"lengthTypeGroup"} buttonClassName={"panelButton noteButton"} disabled={this.state.lengthEnabled} selectedButton={this.state.selectedLengthButton} buttonContents={[<span>&#119133;</span>, <span>&#119134;</span>, <span>&#119135;</span>,  <span>&#119136;</span>, <span>&#119137;</span>, <span>&#119138;</span>]} onButtonClick={this._lengthTypeChanged} />
            </div>;
    }
}

interface FractionProps {
    n : number,
    d : number
}

class Fraction extends React.PureComponent<FractionProps> {
    render() {
        return <p><sup>{this.props.n}</sup>&#x2044;<sub>{this.props.d}</sub></p>
    }
}

interface SelectionGroupProps {
    className? : string,
    buttonClassName? : string,
    disabled : boolean,
    selectedButton : number,
    buttonContents : any[]
    onButtonClick : Function,
}

class SelectionGroup extends React.Component<SelectionGroupProps> {
    render() {
        return <div className={this.props.className}>
            {this.props.buttonContents.map((value, index) => {
                let selected = false;
                if (index === this.props.selectedButton) {
                    selected = true;
                }

                return <SelectionButton key={index} className={this.props.buttonClassName} disabled={this.props.disabled} selected={selected} content={value} onClick={() => {this.props.onButtonClick(index)}}/>
            })}
        </div>;
    }
}

interface SelectionButtonProps {
    className? : string,
    disabled : boolean
    selected : boolean,
    content : any,
    onClick : Function
}

class SelectionButton extends React.Component<SelectionButtonProps> {
    render() {
        const classes = "selectionButton" + (this.props.selected ? " selected" : "") + (this.props.className != null ? " " + this.props.className : "");

        return <button className={classes} onClick={() => {this.props.onClick()}} disabled={this.props.disabled}>{this.props.content}</button>
    }
}