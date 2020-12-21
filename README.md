<p align="center">
  <h2 align="center">Sequencer</h3>
	
  <p align="center">
    <a href="LICENSE" alt="Licence">
		<img src="https://img.shields.io/github/license/mdawsonuk/sequencer?style=flat-square" /></a>
	<a alt="Releases">
		<img src="https://img.shields.io/github/v/release/oliver-little/sequencer?include_prereleases&style=flat-square&color=blue" /></a>
	<a href="https://github.com/oliver-little/sequencer/issues" alt="Issues">
		<img src="https://img.shields.io/github/issues/oliver-little/sequencer?style=flat-square" /></a>
	<a href="https://github.com/oliver-little/sequencer/pulse" alt="Maintenance">
		<img src="https://img.shields.io/maintenance/yes/2020?style=flat-square" /></a>
  </p>
  <p align="center">
    A web-based DAW and sequencer built in TypeScript using the Web Audio API
    <br />
    <a href="https://github.com/oliver-little/sequencer/wiki"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://oliver-little.github.io/sequencer/">View on GitHub Pages</a>
    ·
    <a href="https://github.com/oliver-little/sequencer/issues/new?labels=bug">Report a Bug</a>
    ·
    <a href="https://github.com/oliver-little/sequencer/issues/new?labels=enhancement">Request Feature</a>
  </p>
</p>

## Table of Contents

* [About the Project](#about-the-project)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Contributing](#contributing)
* [License](#license)

## About The Project

Sequencer is a web-based DAW sequencer written in TypeScript with Web Audio API, providing the flexibility and ease of use of web apps without needing to download and install additional software. 

### Core Features
* Web-based DAW Sequencer
* Importing of custom tracks
* Custom time signatures
* Wide range of effects which can be chained and applied to audio
* Exporting in .wav format
* Save and load workflows

## Getting Started

For ease of use, Sequencer is hosted on [GitHub Pages](https://oliver-little.github.io/sequencer)

To get a local copy up and running follow these steps.

### Prerequisites

As this is a Node.js project, both Node.js and NPM need to be installed. 

The project is written in TypeScript, requiring the TypeScript installer to be installed globally. This can be done with 
```sh
npm install -g typescript
```

More information can be found on the [TypeScript website](https://www.typescriptlang.org/download).

### Installation

1a. Download the latest [release](https://github.com/oliver-little/releases)

   OR
                
1b. Clone the repo
```sh
git clone https://github.com/oliver-little/sequencer.git
```

2. Open the directory in a command line and install the npm dependencies
```sh
npm install
```

3. Build and start the server
```sh
npm run build
npm run start
```

4. That's it! Navigate to [http://localhost:3000](http://localhost:3000) to view the Sequencer

## Contributing

Want to make the tool better? Improve the code? Pull requests are accepted and very much appreciated.

## Credits
- [tuna](https://github.com/Theodeus/tuna) - Used for effects in effects chains and the global bus.
- [pixi.js](https://www.pixijs.com/) - Used for all UI in canvas objects.

## License

Distributed under the GPLv3 License. See [LICENSE](LICENSE) for more information.
