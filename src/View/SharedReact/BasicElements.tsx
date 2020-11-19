import * as React from "react";

interface SliderProps {
    className?: string,
    min: string,
    max: string,
    step: string,
    onChange: Function
    value : string
}

export class Slider extends React.PureComponent<SliderProps> {

    private _sliderRef : HTMLInputElement;

    componentDidMount() {
        this._sliderRef.value = this.props.value;
    }

    componentDidUpdate() {
        this._sliderRef.value = this.props.value;
    }

    render() {
        return <input className={this.props.className} type="range" min={this.props.min} max={this.props.max} step={this.props.step} ref={(ref) => {this._sliderRef = ref}} onChange={(event) => { this.props.onChange(event.target.value) }} />
    }
}

interface FileInputProps {
    className?: string,
    onChange: Function,
    accept: string,
}

export class FileInput extends React.PureComponent<FileInputProps> {
    render() {
        return <input className={this.props.className} type="file" onChange={(event) => this.props.onChange(event.target.files)} accept={this.props.accept} />
    }
}

interface IconFileInputProps extends FileInputProps {
    iconName: string,
}

export class IconFileInput extends React.PureComponent<IconFileInputProps> {

    private _inputRef: HTMLInputElement;

    handleClick() {
        this._inputRef.click();
    }

    render() {
        return <div>
            <button className={this.props.className} onClick={this.handleClick.bind(this)}><i className={this.props.iconName}></i></button>
            <input style={{ position: "absolute", zIndex: -1, opacity: 0 }} type="file" ref={(ref) => { this._inputRef = ref }} onChange={(event) => this.props.onChange(event.target.files)} accept={this.props.accept} />
        </div>
    }
}

interface LabelledCheckboxProps {
    className?: string,
    state: boolean,
    label: string,
    onChange: Function
}

export class LabelledCheckbox extends React.Component<LabelledCheckboxProps> {
    render() {
        return <div className={this.props.className}>
            <input type="checkbox" name={this.props.label} checked={this.props.state} onChange={(event) => { this.props.onChange(event.target.checked) }} />
            <label htmlFor={this.props.label}>{this.props.label}</label>
        </div>
    }
}

interface FAButtonProps {
    className?: string,
    iconName: string,
    onClick: Function
}

export class FAButton extends React.PureComponent<FAButtonProps> {
    render() {
        return <button className={this.props.className} onClick={() => { this.props.onClick() }}><i className={this.props.iconName}></i></button>
    }
}

interface DropdownProps {
    title: string,
    buttonClassName?: string,
    optionsDivClassName?: string,
    optionClassName?: string,
    optionTitles: string[],
    optionClickCallback: Function
}

interface DropdownState {
    dropdownVisible: boolean
}


/**
 * Creates a button that, when clicked, reveals a set of other options
 *
 * @export
 * @class Dropdown
 * @extends {React.Component<DropdownProps, DropdownState>}
 */
export class Dropdown extends React.Component<DropdownProps, DropdownState> {

    constructor(props) {
        super(props);

        this.state = {
            dropdownVisible: false
        }
    }

    private _handleDropdownClick() {
        this.setState({ dropdownVisible: !this.state.dropdownVisible });
    }

    render() {
        const objDivClasses = "dropdown" + (this.props.optionsDivClassName == undefined ? "" : " " + this.props.optionsDivClassName) + (this.state.dropdownVisible ? " dropdownVisible" : "");
        return <div>
            <button className={this.props.buttonClassName} onClick={() => { this._handleDropdownClick() }}>{this.props.title}</button>
            <div className={objDivClasses}>
                {this.props.optionTitles.map((title, index) => {
                    return <DropdownItem key={index} index={index} className={this.props.optionClassName} title={title} callback={(index) => { this._handleDropdownClick(); this.props.optionClickCallback(index); }} />
                })}
            </div>
        </div>
    }
}

interface DropdownItemProps {
    className?: string,
    title: string,
    callback: Function,
    index: number
}

export class DropdownItem extends React.Component<DropdownItemProps> {
    render() {
        const className = "dropdownItem" + (this.props.className == undefined ? "" : " " + this.props.className);
        return <button className={className} onClick={() => { this.props.callback(this.props.index) }}>{this.props.title}</button>;
    }
}

interface BoxSelectProps {
    overlayClassName?: string,
    selectButtonClassName?: string,
    title?: string,
    selected: number,
    options: string[],
    selectedCallback: Function,
}

interface BoxSelectState {
    selectVisible: boolean
}

export class BoxSelect extends React.Component<BoxSelectProps, BoxSelectState> {

    private _selectButton: React.RefObject<HTMLButtonElement>;

    constructor(props) {
        super(props);

        this._selectOptionClicked = this._selectOptionClicked.bind(this);

        this._selectButton = React.createRef();


        this.state = {
            selectVisible: false,
        }
    }

    private _selectOptionClicked(index: number) {
        this.props.selectedCallback(index);
        this.setState({ selectVisible: false });
    }

    render() {
        const buttonClassName = "boxSelectButton" + (this.props.selectButtonClassName ? " " + this.props.selectButtonClassName : "");

        return <div>
            <button className={buttonClassName} onClick={() => { this.setState({ selectVisible: !this.state.selectVisible }) }} ref={this._selectButton}>{this.props.options[this.props.selected]}</button>
            {this.state.selectVisible && <BoxSelectOverlay buttonClassName={buttonClassName} selected={this.props.selected} options={this.props.options} positioningButton={this._selectButton} selectOptionClickedCallback={this._selectOptionClicked} />}
        </div>
    }
}

interface BoxSelectOverlayProps {
    className?: string,
    buttonClassName?: string,
    selected: number,
    options: string[],
    positioningButton: React.RefObject<HTMLButtonElement>,
    selectOptionClickedCallback: Function
}

interface BoxSelectOverlayState {
    selectedOffsetTop: number
    overlayWidthDifference : number
    anim: string
}

class BoxSelectOverlay extends React.Component<BoxSelectOverlayProps, BoxSelectOverlayState> {

    private _currentSelectedButton: HTMLButtonElement;
    private _overlayDiv: HTMLDivElement;

    constructor(props) {
        super(props);

        this.state = {
            selectedOffsetTop: 0,
            overlayWidthDifference: 0,
            anim: ""
        }
    }

    componentDidMount() {
        this.setState({ selectedOffsetTop: this._currentSelectedButton.offsetTop, overlayWidthDifference: (this._overlayDiv.offsetWidth - this.props.positioningButton.current.offsetWidth) / 2 });
        setTimeout(() => { this.setState({ anim: " animVisible" }) }, 10);
    }

    render() {
        const overlayClassName = "boxSelectOverlay" + (this.props.className ? " " + this.props.className : "");
        let options = this.props.options.map((value, index) => {
            return <button className={this.props.buttonClassName} key={index} onClick={() => { this.props.selectOptionClickedCallback(index) }} ref={(ref) => { this.props.selected === index ? this._currentSelectedButton = ref : null }}>{value}</button>
        });
        return <div className={overlayClassName + this.state.anim} ref={(ref) => { this._overlayDiv = ref }} style={{ position: "absolute", top: (this.props.positioningButton.current.offsetTop - this.state.selectedOffsetTop), left: this.props.positioningButton.current.offsetLeft - this.state.overlayWidthDifference }}>{options}</div>
    }
}