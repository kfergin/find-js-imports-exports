import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { transformAsync } from '@babel/core';
import { parse } from 'espree';

export async function getAstFromPath(filePath: string) {
  return readFile(filePath, { encoding: 'utf8' })
    .then((fileCode) =>
      // Some transpilation is needed because espree can't parse flow and jsx.
      transformAsync(fileCode, {
        compact: true,
        cwd: resolve(__dirname, '..'),
        presets: ['@babel/preset-react', '@babel/preset-flow'],
        // Caveat:
        // Babel will make an effort to generate code such that items are
        // printed on the same line that they were on in the original file.
        // This option exists so that users who cannot use source maps can get
        // vaguely useful error line numbers, but it is only a best-effort, and
        // is not guaranteed in all cases with all plugins.
        // https://babeljs.io/docs/en/options
        retainLines: true,
      })
    )
    .then((transformed) => {
      if (transformed === null || typeof transformed.code !== 'string') {
        throw Error(`Error transpiling ${filePath}!`);
      }

      return parse(transformed.code, {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        // `retainLines: true` is needed to make these line numbers accurate
        loc: true,
        // eslint-scope breaks without this
        range: true,
        sourceType: 'module',
      });
    });
}
