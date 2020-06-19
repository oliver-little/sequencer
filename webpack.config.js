const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: './build/app.js', //location of your main js file
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js',  // where js files would be bundled to
   },
   devtool: "source-map",
   /*plugins: [
       new TerserPlugin(),
   ]*/
} 