import * as React from "react";
import {render} from "react-dom";
import { SequencerApp } from "./View/ReactUI/SequencerApp";

let loaderDiv = document.getElementById("loader");
let hideLoader = () => {
    loaderDiv.className += " hide";
    setTimeout(() => {loaderDiv.parentElement.removeChild(loaderDiv)}, 500);
}

render(
    <SequencerApp hideLoader={hideLoader} />,
    document.getElementById('root')
);
      