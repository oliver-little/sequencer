import * as React from "react";

interface SliderProps {
    onRelease? : boolean
    className?: string,
    min: string,
    max: string,
    step: string,
    onChange: Function
    value: string
}

export class Slider extends React.PureComponent<SliderProps> {

    private _sliderRef: HTMLInputElement;

    componentDidMount() {
        this._sliderRef.value = this.props.value;
    }

    componentDidUpdate() {
        this._sliderRef.value = this.props.value;
    }

    render() {
        let className = "slider" + (this.props.className ? this.props.className : "");
        if (this.props.onRelease) {
            return <input className={className} type="range" min={this.props.min} max={this.props.max} step={this.props.step} ref={(ref) => { this._sliderRef = ref }} onPointerUp={() => {this.props.onChange(this._sliderRef.value)}} />
        }
        else {
            return <input className={className} type="range" min={this.props.min} max={this.props.max} step={this.props.step} ref={(ref) => { this._sliderRef = ref }} onChange={(event) => {this.props.onChange(event.target.value)}} />
        }
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

export class LabelledCheckbox extends React.PureComponent<LabelledCheckboxProps> {
    render() {
        return <div className={this.props.className}>
            <input type="checkbox" name={this.props.label} checked={this.props.state} onChange={(event) => { this.props.onChange(event.target.checked) }} />
            <label htmlFor={this.props.label}>{this.props.label}</label>
        </div>
    }
}

interface FAButtonProps {
    className?: string,
    title?: string,
    disabled?: boolean,
    iconName: string,
    onClick: Function
}

export class FAButton extends React.PureComponent<FAButtonProps> {
    render() {
        return <button title={this.props.title} className={this.props.className} onClick={() => { this.props.onClick() }} disabled={this.props.disabled}><i className={this.props.iconName}></i></button>
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
export class Dropdown extends React.PureComponent<DropdownProps, DropdownState> {

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

// EITHER SELECTED OR TITLE IS REQUIRED
interface BoxSelectProps {
    overlayClassName?: string,
    mainButtonClassName?: string,
    selectButtonClassName?: string,
    tooltip?: string,
    selected?: number, // Selected by index
    title?: string, // Just show a string
    options: string[],
    selectedCallback: Function,
}

interface BoxSelectState {
    selectVisible: boolean
}

export class BoxSelect extends React.PureComponent<BoxSelectProps, BoxSelectState> {

    private _selectButton: React.RefObject<HTMLButtonElement>;

    constructor(props) {
        super(props);

        this._selectOptionClicked = this._selectOptionClicked.bind(this);

        this.state = {
            selectVisible: false,
        }

        this._selectButton = React.createRef();
    }

    private _selectOptionClicked(index: number) {
        this.props.selectedCallback(index, this.props.options[index]);
        this.setState({ selectVisible: false });
    }

    render() {
        const buttonClassName = "boxSelectButton" + (this.props.selectButtonClassName ? " " + this.props.selectButtonClassName : "");

        return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            <div>
                <button className={(this.props.mainButtonClassName ? this.props.mainButtonClassName : "mainBoxSelectButton")} title={this.props.tooltip} ref={this._selectButton} onClick={() => {this.setState({ selectVisible: !this.state.selectVisible }) }} >{this.props.selected !== undefined ? this.props.options[this.props.selected] : (this.props.title ? this.props.title : this.props.children)}</button>
            </div>
            {this.state.selectVisible && <BoxSelectOverlay buttonClassName={buttonClassName} selectButton={this._selectButton} options={this.props.options} selectOptionClickedCallback={this._selectOptionClicked} />}
        </div>
    }
}

interface BoxSelectOverlayProps {
    className?: string,
    buttonClassName?: string,
    options: string[],
    selectOptionClickedCallback: Function
    selectButton: React.RefObject<HTMLButtonElement>
}

interface BoxSelectOverlayState {
    renderAbove: boolean,
}

class BoxSelectOverlay extends React.Component<BoxSelectOverlayProps, BoxSelectOverlayState> {

    private _overlayContainer: React.RefObject<HTMLDivElement>;

    constructor(props) {
        super(props);

        this.state = {
            renderAbove: false,
        }

        this._overlayContainer = React.createRef();
    }

    componentDidMount() {
        let bottom = this._overlayContainer.current.getBoundingClientRect().bottom;
        if (bottom > window.innerHeight) {
            this.setState({ renderAbove: true });
        }
    }

    render() {
        const overlayClassName = "boxSelectOverlay" + (this.props.className ? " " + this.props.className : "");
        let options = this.props.options.map((value, index) => {
            return <button className={this.props.buttonClassName} key={index} onClick={() => { this.props.selectOptionClickedCallback(index) }} >{value}</button>
        });
        let currentButton = this.props.selectButton.current;
        if (!this.state.renderAbove) {
            return <div className={"boxSelectOverlayContainer"} ref={this._overlayContainer} style={{ top: currentButton.offsetHeight + 1 }}>
                <div className={"boxSelectOverlayArrow top"}></div>
                <div className={overlayClassName} >{options}</div>
            </div>
        }
        else {
            return <div className={"boxSelectOverlayContainer"} ref={this._overlayContainer} style={{ top: -this._overlayContainer.current.offsetHeight - 1 }}>
                <div className={overlayClassName} >{options}</div>
                <div className={"boxSelectOverlayArrow bottom"}></div>
            </div>
        }
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

export class SelectionGroup extends React.Component<SelectionGroupProps> {
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