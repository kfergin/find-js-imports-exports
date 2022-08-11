import resolveFrom from 'resolve-from';

import { config } from './config-object';
import { fileSystemForEach } from './file-system-for-each';
import { findFileExports } from './find-file-exports';
import { findFileImports } from './find-file-imports';
import {
  ScriptOptionTypesToDict,
  helpScriptOption,
  makeGetScriptOptions,
  pathRegexIgnoresScriptOption,
} from './script-options';
import { stderrWritePath } from './stderr-write-path';

const scriptOptions = [helpScriptOption, pathRegexIgnoresScriptOption];
const getScriptOptions = makeGetScriptOptions(...scriptOptions);

export async function findExportsScript() {
  const cwd = process.cwd();

  const [, , ...args] = process.argv;
  const [name, source] = args;
  const { help, pathRegexIgnores } = getScriptOptions(
    args
  ) as ScriptOptionTypesToDict<typeof scriptOptions>;

  if (help) {
    process.stdout.write(`
    find-exports-script [export-name] [export-path] [flags]

    export-name
      - named export: '<name-of-import>'
      - default export: 'default'
      - any export: '*'

    export-path
      Can be absolute or relative. '*' for any path

    Options:
      ${pathRegexIgnoresScriptOption.documentation}

      ${helpScriptOption.documentation}

`);
    return;
  }

  if ([name, source].some((arg) => arg === undefined || /^-/.test(arg))) {
    throw Error(
      'Please provide [export-name] and [export-path] arguments first'
    );
  }

  const absSource = source === '*' ? '*' : resolveFrom(cwd, source);

  fileSystemForEach(
    cwd,
    async function forEachFile(path) {
      const clearPath = stderrWritePath(path);

      const fileExports = await findFileExports(path).then((exports) =>
        exports.filter((exp) => {
          return (
            (name === exp.name || name === '*') &&
            (absSource === exp.source || absSource === '*')
          );
        })
      );

      clearPath();

      fileExports.forEach((exp) => {
        process.stdout.write(
          `${exp.name}\n  ${exp.source}|${exp.lineNumber}\n\n`
        );
      });
    },
    { pathRegexIgnores: [...config.pathRegexIgnores, ...pathRegexIgnores] }
  );
}

export async function findImportsScript() {
  const cwd = process.cwd();

  const [, , ...args] = process.argv;
  const [name, source] = args;
  const { help, pathRegexIgnores } = getScriptOptions(
    args
  ) as ScriptOptionTypesToDict<typeof scriptOptions>;

  if (help) {
    process.stdout.write(`
    find-imports-script [import-name] [import-path] [flags]

    import-name
      - default import: 'default'
      - namespace import: '*'
      - named import: '<name-of-import>'

    import-path
      Can be absolute or relative

    Options:
      ${pathRegexIgnoresScriptOption.documentation}

      ${helpScriptOption.documentation}

`);
    return;
  }

  if ([name, source].some((arg) => arg === undefined || /^-/.test(arg))) {
    throw Error(
      'Please provide [import-name] and [import-path] arguments first'
    );
  }

  const absSource = resolveFrom(cwd, source);

  fileSystemForEach(
    cwd,
    async function forEachFile(path) {
      const clearPath = stderrWritePath(path);

      const fileImports = await findFileImports(path).then((imports) =>
        imports.filter((imp) => {
          return (
            (name === imp.name || name === '*') && absSource === imp.source
          );
        })
      );

      clearPath();

      fileImports.forEach((imp) => {
        process.stdout.write(
          `${imp.name}\n${imp.source}\n  ${imp.destination}|${imp.lineNumber}\n\n`
        );
      });
    },
    { pathRegexIgnores: [...config.pathRegexIgnores, ...pathRegexIgnores] }
  );
}
