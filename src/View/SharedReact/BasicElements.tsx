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