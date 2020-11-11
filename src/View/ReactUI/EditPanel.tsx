import * as React from "react";

interface EditPanelState {
    selectedSnapButton : number,
    selectedLengthButton : number,
}

export class EditPanel extends React.Component<{}, EditPanelState> {
    constructor(props) {
        super(props);

        this._snapTypeChanged = this._snapTypeChanged.bind(this);
        this._lengthTypeChanged = this._lengthTypeChanged.bind(this);

        this.state = {
            selectedSnapButton : 0,
            selectedLengthButton : 0
        };
    }

    private _snapTypeChanged(index) {
        this.setState({selectedSnapButton : index});
    }

    private _lengthTypeChanged(index) {
        this.setState({selectedLengthButton : index});
    }

    render() {
        return <div className={"editPanel"}>
            <SelectionGroup className={"snapTypeGroup"} buttonClassName={"panelButton"} selectedButton={this.state.selectedSnapButton} buttonContents={["1", <Fraction n={1} d={2} />, <Fraction n={1} d={4} />, <Fraction n={1} d={8} />, <p>&#x2716;</p>]} onButtonClick={this._snapTypeChanged} />
            <SelectionGroup className={"lengthTypeGroup"} buttonClassName={"panelButton"} selectedButton={this.state.selectedLengthButton} buttonContents={["1", <Fraction n={1} d={2} />, <Fraction n={1} d={4} />, <Fraction n={1} d={8} />, <Fraction n={1} d={16} />, <Fraction n={1} d={32} />]} onButtonClick={this._lengthTypeChanged} />
        </div>;
    }
}

interface FractionProps {
    n : number,
    d : number
}

class Fraction extends React.Component<FractionProps> {
    render() {
        return <p><sup>{this.props.n}</sup>&#x2044;<sub>{this.props.d}</sub></p>
    }
}

interface SelectionGroupProps {
    className? : string,
    buttonClassName? : string,
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

                return <SelectionButton key={index} className={this.props.buttonClassName} selected={selected} content={value} onClick={() => {this.props.onButtonClick(index)}}/>
            })}
        </div>;
    }
}

interface SelectionButtonProps {
    className? : string,
    selected : boolean,
    content : any,
    onClick : Function
}

class SelectionButton extends React.Component<SelectionButtonProps> {
    render() {
        const classes = "selectionButton" + (this.props.selected ? " selected" : "") + (this.props.className != null ? " " + this.props.className : "");

        return <button className={classes} onClick={() => {this.props.onClick()}}>{this.props.content}</button>
    }
}