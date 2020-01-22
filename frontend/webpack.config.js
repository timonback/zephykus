const path = require('path');

module.exports = {
  // mode: 'production',
  devtool: 'eval-source-map',

  entry: [
    __dirname + "/index.html",
    './src/app.ts',
  ],

  module: {
    rules: [
      {
        test: /\.html/,
        loader: 'file-loader?name=[name].[ext]',
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js', ".css" ]
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  }
};
