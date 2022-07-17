// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@babel/register')({
  cwd: __dirname,
  extensions: ['.js', '.ts'],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
});

const {
  fileSystemForEach,
  findFileImports,
  stderrWritePath,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('./src');

module.exports = { fileSystemForEach, findFileImports, stderrWritePath };
