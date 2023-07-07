const webpack = require('webpack');
const path = require('path');

const config = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'browser.js',
    libraryTarget: 'umd',
    library: 'gnyClient',
  },
  module: {
    rules: [
      {
        test: /\.ts(x)?$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    fallback: { // https://stackoverflow.com/questions/64557638/how-to-polyfill-node-core-modules-in-webpack-5
      "crypto": false,
    },
    extensions: [
      '.tsx',
      '.ts',
      '.js'
    ]
  }
};

module.exports = config;
