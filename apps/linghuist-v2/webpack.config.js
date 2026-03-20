const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const path = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
  externals: {
    '@prisma/client': 'commonjs @prisma/client',
    '@prisma/adapter-pg': 'commonjs @prisma/adapter-pg',
    pg: 'commonjs pg',
  },
  resolve: {
    alias: {
      '.prisma/client': path.resolve(__dirname, '../../node_modules/.prisma/client'),
    },
  },
};
