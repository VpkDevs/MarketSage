const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    popup: path.resolve(__dirname, '..', 'src/popup/index.tsx'),
    background: path.resolve(__dirname, '..', 'src/background/index.ts'),
    content: path.resolve(__dirname, '..', 'src/content/index.ts'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '..', 'src'),
      '@components': path.resolve(__dirname, '..', 'src/components'),
      '@services': path.resolve(__dirname, '..', 'src/services'),
      '@utils': path.resolve(__dirname, '..', 'src/utils'),
      '@types': path.resolve(__dirname, '..', 'src/types'),
      '@common': path.resolve(__dirname, '..', 'src/common'),
      '@background': path.resolve(__dirname, '..', 'src/background'),
      '@content': path.resolve(__dirname, '..', 'src/content'),
      '@popup': path.resolve(__dirname, '..', 'src/popup'),
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '..', 'public'),
          to: path.resolve(__dirname, '..', 'dist'),
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '..', 'public/popup.html'),
      filename: 'popup.html',
      chunks: ['popup'],
    }),
  ],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '..', 'dist'),
    clean: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: 'vendor',
    },
  },
};
