const path = require('path');

module.exports = {
  entry: './build/app.js', //location of your main js file
  externals: {
    "react": "React",
    "react-dom": "ReactDOM",
    "react-beautiful-dnd": "ReactBeautifulDnd",
    "pixi.js": "PIXI"
  },
  output: {
    path: path.resolve(__dirname, 'assets/scripts/'),
    filename: 'bundle.js',  // where js files would be bundled to
  },
}
