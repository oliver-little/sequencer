import * as React from "react";

interface SliderProps {
    className? : string,
    min : string,
    max : string,
    step : string,
    onChange : Function,
}

export class Slider extends React.Component<SliderProps> {
    render() {
        return <input className={this.props.className} type="range" min={this.props.min} max={this.props.max} step={this.props.step} onChange={(event) => {this.props.onChange(event.target.value)}} />
    }
}

interface FileInputProps {
    className? : string,
    onChange : Function,
    accept : string,
}

export class FileInput extends React.Component<FileInputProps> {
    render() {
        return <input className={this.props.className} type="file" onChange={(event) => this.props.onChange(event.target.files)} accept={this.props.accept}/>
    }
}

interface IconFileInputProps extends FileInputProps {
    iconName: string,
}

export class IconFileInput extends React.Component<IconFileInputProps> {

    private _inputRef : HTMLInputElement;

    handleClick() {
        this._inputRef.click();
    }

    render() {
        return <div>
            <button className={this.props.className} onClick={this.handleClick.bind(this)}><i className={this.props.iconName}></i></button>
            <input style={{position: "absolute", zIndex: -1, opacity: 0}} type="file" ref={(ref) => {this._inputRef = ref}} onChange={(event) => this.props.onChange(event.target.files)} accept={this.props.accept}/>
        </div>
    }
}

interface LabelledCheckboxProps {
    className? : string,
    state : boolean,
    label : string,
    onChange : Function
}

export class LabelledCheckbox extends React.Component<LabelledCheckboxProps> {
    render() {
        return <div className={this.props.className}>
            <input type="checkbox" name={this.props.label} checked={this.props.state} onChange={(event) => {this.props.onChange(event.target.checked)}} />
            <label htmlFor={this.props.label}>{this.props.label}</label>
        </div>
    }
}