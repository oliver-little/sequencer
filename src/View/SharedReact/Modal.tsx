import * as React from "react";
import { createPortal } from "react-dom";
import { FAButton } from "./BasicElements";

const modalRoot = document.getElementById("root");

export class BackgroundModal extends React.PureComponent<{ onClick?: () => void }> {

    private _modalRootChild: HTMLDivElement;

    constructor(props) {
        super(props);

        this._modalRootChild = document.createElement("div");
        this._modalRootChild.className = "fullScreen modal";
    }

    componentDidMount() {
        modalRoot.appendChild(this._modalRootChild);
    }

    componentWillUnmount() {
        this._modalRootChild.className += " hide";
        setTimeout(() => { modalRoot.removeChild(this._modalRootChild) }, 500);
    }

    render() {
        this._modalRootChild.onclick = undefined;
        if (this.props.onClick) {
            this._modalRootChild.onclick = this.props.onClick;
        }
        return createPortal(this.props.children, this._modalRootChild);
    }
}

interface LoadingSpinnerProps {
    title: string
}

function LoadingSpinner(props: LoadingSpinnerProps) {
    return <div className="loadDetails">
        <p className="loadTitle">{props.title}</p>
        <div className="sequencerSpinner">
            <span>&#119133;</span>
            <span>&#119134;</span>
            <span>&#119135;</span>
            <span>&#119136;</span>
        </div>
    </div>;
}

export function LoadingSpinnerModal(props: LoadingSpinnerProps) {
    return <BackgroundModal>
        <LoadingSpinner {...props} />
    </BackgroundModal>
}

interface ErrorBoxProps {
    error: string,
    onClose: () => void
}

function ErrorBox(props: ErrorBoxProps) {
    return <div className="errorModal">
        <FAButton className="buttonAnim" iconName="fa fa-close" onClick={props.onClose} />
        <p>{props.error}</p>
    </div>;
}

export class ErrorModal extends React.Component<ErrorBoxProps> {
    render() {
        return <BackgroundModal>
            <ErrorBox {...this.props} />
        </BackgroundModal>
    }
}

interface LoadingErrorModalProps {
    loading: boolean,
    title: string,
    onClose: () => void
}

export class LoadingErrorModal extends React.Component<LoadingErrorModalProps> {
    render() {
        return <BackgroundModal onClick={(!this.props.loading ? this.props.onClose : undefined)}>
            {this.props.loading ? <LoadingSpinner title={this.props.title} /> : <ErrorBox error={this.props.title} onClose={this.props.onClose} />}
        </BackgroundModal>;
    }
}