#!/usr/bin/env node

require('../transpile-ts');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { findImportsScript } = require('../src/script-functions');

findImportsScript();
