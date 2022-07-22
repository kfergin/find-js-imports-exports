require('./transpile-ts');

const {
  fileSystemForEach,
  findFileExports,
  findFileImports,
  stderrWritePath,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('./src');

module.exports = {
  fileSystemForEach,
  findFileExports,
  findFileImports,
  stderrWritePath,
};
