require('./transpile-ts');

const {
  config,
  fileSystemForEach,
  findFileExports,
  findFileImports,
  stderrWritePath,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('./src');

module.exports = {
  config,
  fileSystemForEach,
  findFileExports,
  findFileImports,
  stderrWritePath,
};
