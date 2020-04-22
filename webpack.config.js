const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/index.ts',
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                  '@babel/preset-env'
              ]
            }
          },
          {
            loader: 'ts-loader'
          }
        ]
      }
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'index.js',
    library: '', libraryTarget: 'commonjs',
    path: path.resolve(__dirname, 'build'),
  },
  target: 'node',
  node: {
      __dirname: false,
      __filename: false
  },
  externals: [nodeExternals()],
};