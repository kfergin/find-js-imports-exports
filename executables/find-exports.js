#!/usr/bin/env node

require('../transpile-ts');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { findExportsScript } = require('../src/script-functions');

findExportsScript();
