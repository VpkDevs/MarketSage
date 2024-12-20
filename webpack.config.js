const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup/index.tsx',
    content: './src/content/index.ts',
    background: './src/background/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@common': path.resolve(__dirname, 'src/common'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@popup': path.resolve(__dirname, 'src/popup')
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/index.html',
      filename: 'popup.html',
      chunks: ['popup']
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  }
};
