const path = require('path');

module.exports = {
  entry: './src/index.tsx',
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
                  '@babel/preset-env',
                  '@babel/preset-react'
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
};