import * as React from "react";

interface SliderProps {
    className?: string,
    min: string,
    max: string,
    step: string,
    onChange: Function,
}

export class Slider extends React.Component<SliderProps> {
    render() {
        return <input className={this.props.className} type="range" min={this.props.min} max={this.props.max} step={this.props.step} onChange={(event) => { this.props.onChange(event.target.value) }} />
    }
}

interface FileInputProps {
    className?: string,
    onChange: Function,
    accept: string,
}

export class FileInput extends React.Component<FileInputProps> {
    render() {
        return <input className={this.props.className} type="file" onChange={(event) => this.props.onChange(event.target.files)} accept={this.props.accept} />
    }
}

interface IconFileInputProps extends FileInputProps {
    iconName: string,
}

export class IconFileInput extends React.Component<IconFileInputProps> {

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

export class FAButton extends React.Component<FAButtonProps> {
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
    className?: string,
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

    private _selectContainer: React.RefObject<HTMLDivElement>;

    constructor(props) {
        super(props);

        this._selectOptionClicked = this._selectOptionClicked.bind(this);

        this._selectContainer = React.createRef();

        this.state = {
            selectVisible: false,
        }
    }

    componentDidMount() {
        this._updateSize();
    }

    componentDidUpdate() {
        this._updateSize();
    }

    private _selectOptionClicked(index: number) {
        this.props.selectedCallback(index);
        this.setState({ selectVisible: false });
    }

    // This function implements a workaround to the fact that width and height: auto cannot be animated. It calculates the width and height intended for the box and sets it as the inline style
    private _updateSize() {
        let childWidth = 0;
        let childHeight = 0;
        for (let i = 0; i < this._selectContainer.current.children.length; i++) {
            let child = this._selectContainer.current.children[i];
            childWidth = Math.max(child.scrollWidth, childWidth);
            childHeight += child.scrollHeight;
        }
        this._selectContainer.current.style.width = childWidth.toString();
        this._selectContainer.current.style.height = childHeight.toString();
    }

    render() {
        const mainClassName = "boxSelect" + (this.props.className ? " " + this.props.className : "");
        const buttonClassName = "boxSelectButton" + (this.props.selectButtonClassName ? " " + this.props.selectButtonClassName : "");

        let topOptions, bottomOptions = null;
        if (this.state.selectVisible) {
            {
                topOptions = this.props.options.slice(0, this.props.selected).map((value, index) => {
                    return <button className={buttonClassName} key={index} onClick={() => { this._selectOptionClicked(index) }}>{value}</button>
                })
                bottomOptions = this.props.options.slice(this.props.selected + 1, this.props.options.length).map((value, index) => {
                    index = this.props.selected + 1 + index;
                    return <button className={buttonClassName} key={index} onClick={() => { this._selectOptionClicked(index) }}>{value}</button>
                });
            }
        }

        return <div className={mainClassName} ref={this._selectContainer}>
            <button className={buttonClassName} onClick={() => { this.setState({ selectVisible: !this.state.selectVisible }) }}>{this.props.options[this.props.selected]}</button>
            {topOptions}
            {bottomOptions}
        </div>
    }
}