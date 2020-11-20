const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require("webpack");

module.exports = {
  entry: './build/app.js', //location of your main js file
  externals: {
    "react": "React",
    "react-dom": "ReactDOM",
    "react-beautiful-dnd": "ReactBeautifulDnd"
  },
  output: {
      path: path.resolve(__dirname, 'assets/scripts/'),
      filename: 'bundle.js',  // where js files would be bundled to
  },
  devtool: "source-map",
  /*plugins: [ // Use in production build
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  }*/
} 