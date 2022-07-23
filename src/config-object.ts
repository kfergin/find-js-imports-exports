import path from 'path';

let config: { pathRegexIgnores: RegExp[] } = {
  pathRegexIgnores: [],
};

try {
  config = {
    ...config,
    ...require(path.resolve(__dirname, '../find-js-imports-exports.config.js')),
  };
} catch (_) {
  console.log;
  // do nothing
}

export { config };
