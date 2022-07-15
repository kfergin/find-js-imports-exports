require('@babel/register')({
  cwd: __dirname,
  extensions: ['.js', '.ts'],
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
});

const { findFileImports } = require('./src');

module.exports = { findFileImports };
