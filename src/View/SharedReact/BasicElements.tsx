import * as React from "react";
import InputRange, { InputRangeClassNames } from "react-input-range";

interface SliderProps {
    onRelease?: boolean
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
    value: number
}

interface SliderState {
    currentValue: number
}

export class Slider extends React.PureComponent<SliderProps, SliderState> {

    public static classNames: InputRangeClassNames = {
        activeTrack: "sliderTrackActive",
        disabledInputRange: "sliderDisabled",
        inputRange: "slider",
        labelContainer: "sliderLabelContainer",
        maxLabel: "sliderMaxLabel",
        minLabel: "sliderMinLabel",
        slider: "sliderHandle",
        sliderContainer: "sliderHandleContainer",
        track: "sliderTrack",
        valueLabel: "sliderValueLabel"
    }

    constructor(props) {
        super(props);

        this.state = {
            currentValue: this.props.value
        }
    }

    render() {
        if (this.props.onRelease) {
            return <InputRange classNames={Slider.classNames} minValue={this.props.min} maxValue={this.props.max} step={this.props.step} value={this.state.currentValue} onChange={(value: number) => this.setState({ currentValue: value })} onChangeComplete={this.props.onChange} />;
        }
        else {
            return <InputRange classNames={Slider.classNames} minValue={this.props.min} maxValue={this.props.max} step={this.props.step} value={this.props.value} onChange={this.props.onChange} />;
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
    title?: string,
    iconName: string,
}

export class IconFileInput extends React.PureComponent<IconFileInputProps> {

    private _inputRef: HTMLInputElement;

    handleClick() {
        this._inputRef.click();
    }

    render() {
        return <div>
            <button className={this.props.className} title={this.props.title} onClick={this.handleClick.bind(this)}><i className={this.props.iconName}></i></button>
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
        return <div className={this.props.className} onClick={() => { this.props.onChange(!this.props.state) }}>
            <p>{this.props.label}</p>
            <input type="checkbox" name={this.props.label} checked={this.props.state} onChange={(event) => { this.props.onChange(event.target.checked) }} />
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
    title?: string,
    iconName: string,
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
        const objDivClasses = "dropdown" + (this.props.optionsDivClassName == undefined ? "" : " " + this.props.optionsDivClassName);
        return <div>
            <FAButton className={this.props.buttonClassName} iconName={this.props.iconName} onClick={() => { this._handleDropdownClick(); }} />

            {this.state.dropdownVisible && <ClickOutsideWatcher callback={() => this.setState({ dropdownVisible: false })}>
                <div className={objDivClasses}>
                    {this.props.optionTitles.map((title, index) => {
                        return <DropdownItem key={index} index={index} className={this.props.optionClassName} title={title} callback={(index) => { this._handleDropdownClick(); this.props.optionClickCallback(index); }} />
                    })}
                </div>
            </ClickOutsideWatcher>}
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
        const className = "dropdownItem buttonColorAnim" + (this.props.className == undefined ? "" : " " + this.props.className);
        return <button className={className} onClick={() => { this.props.callback(this.props.index) }}>{this.props.title}</button>;
    }
}

// EITHER SELECTED OR TITLE IS REQUIRED
interface BoxSelectProps {
    className?: string,
    overlayClassName?: string,
    mainButtonClassName?: string,
    selectButtonClassName?: string,
    title?: string,
    selected?: number, // Selected by index
    boxSelectTitle?: string, // Just show a string
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

        return <div className={this.props.className} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            <div>
                <button className={(this.props.mainButtonClassName ? this.props.mainButtonClassName : "mainBoxSelectButton")} title={this.props.title} ref={this._selectButton} onClick={() => { this.setState({ selectVisible: !this.state.selectVisible }) }} >{this.props.selected !== undefined ? this.props.options[this.props.selected] : (this.props.boxSelectTitle ? this.props.boxSelectTitle : this.props.children)}</button>
            </div>
            {this.state.selectVisible && <ClickOutsideWatcher className={"boxSelectWatcher"} callback={() => { this.setState({ selectVisible: false }) }}>
                <BoxSelectOverlay buttonClassName={buttonClassName} selectButton={this._selectButton} options={this.props.options} selectOptionClickedCallback={this._selectOptionClicked} />
            </ClickOutsideWatcher>}
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
    className?: string,
    buttonClassName?: string,
    disabled: boolean,
    selectedButton: number,
    buttonContents: any[],
    buttonTitles? : string[],
    onButtonClick: Function,
}

export class SelectionGroup extends React.Component<SelectionGroupProps> {
    render() {
        return <div className={this.props.className}>
            {this.props.buttonContents.map((value, index) => {
                let selected = false;
                if (index === this.props.selectedButton) {
                    selected = true;
                }

                let title = undefined;
                if (this.props.buttonTitles && this.props.buttonTitles.length > index) {
                    title = this.props.buttonTitles[index];
                }

                return <SelectionButton key={index} title={title} className={this.props.buttonClassName} disabled={this.props.disabled} selected={selected} content={value} onClick={() => { this.props.onButtonClick(index) }} />
            })}
        </div>;
    }
}

interface SelectionButtonProps {
    className?: string,
    title? : string
    disabled: boolean
    selected: boolean,
    content: any,
    onClick: Function
}

class SelectionButton extends React.Component<SelectionButtonProps> {
    render() {
        const classes = "selectionButton" + (this.props.selected ? " selected" : "") + (this.props.className != null ? " " + this.props.className : "");

        return <button className={classes} title={this.props.title} onClick={() => { this.props.onClick() }} disabled={this.props.disabled}>{this.props.content}</button>
    }
}

interface ClickOutsideWatcherProps {
    className?: string
    callback: Function
}

export class ClickOutsideWatcher extends React.Component<ClickOutsideWatcherProps> {

    private _childRef: React.RefObject<HTMLDivElement>;

    constructor(props) {
        super(props);

        this._childRef = React.createRef();
        this.handleClick = this.handleClick.bind(this);
    }

    public handleClick(e: PointerEvent) {
        if (this._childRef && e.target instanceof Element && !this._childRef.current.contains(e.target)) {
            this.props.callback()
        }
    }

    componentDidMount() {
        document.addEventListener("pointerdown", this.handleClick);
    }

    componentWillUnmount() {
        document.removeEventListener("pointerdown", this.handleClick);
    }

    render() {
        return <div className={this.props.className} ref={this._childRef}>{this.props.children} </div>
    }
}