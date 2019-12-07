const path = require('path');

module.exports = {
  mode: 'production',
  performance: {
    hints: false,
  },
  devtool: 'inline-source-map',
  entry: path.resolve(__dirname, 'src', 'index.ts'),
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            declarationDir: path.resolve(__dirname, 'dist'),
            sourceMap: true,
            module: 'commonjs',
          },
        },
      },
    ],
  },
  node: { fs: 'empty' },
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'browser'),
    filename: 'browser.js',
    libraryTarget: 'umd',
    library: 'gnyClient', // global variable in browser
  },
};
