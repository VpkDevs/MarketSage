const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/popup/index.tsx',
    content: './src/content/index.ts',
    background: './src/background/background.ts'
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
        use: {
          loader: 'ts-loader',
          options: {
            // tsconfig sets noEmit (for editor/ts-jest use); the bundler
            // must emit. Only files in the bundle graph are type-checked
            // here — the repo also contains an abandoned second-generation
            // layer under src/core that nothing imports; its errors are
            // reported by a full `tsc --noEmit`, not by the build.
            compilerOptions: { noEmit: false },
            onlyCompileBundledFiles: true
          }
        },
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
      template: './public/popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    // Assemble the loadable extension: manifest + icons alongside the
    // bundles (popup.html, popup.js, content.js, background.js).
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: 'public/icons', to: 'icons' }
      ]
    })
  ]
  // NOTE: no splitChunks. Chrome content scripts and MV3 service workers
  // must each be a single self-contained file; shared chunks would make
  // content.js/background.js fail to load.
};
