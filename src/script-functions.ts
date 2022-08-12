import resolveFrom from 'resolve-from';

import { config } from './config-object';
import { fileSystemForEach } from './file-system-for-each';
import { findFileExports } from './find-file-exports';
import { findFileImports } from './find-file-imports';
import {
  ScriptOptionTypesToDict,
  exportNameScriptOption,
  helpScriptOption,
  makeGetScriptOptions,
  pathRegexIgnoresScriptOption,
  sourcePathScriptOption,
} from './script-options';
import { stderrWritePath } from './stderr-write-path';

const scriptOptions = [
  exportNameScriptOption,
  helpScriptOption,
  pathRegexIgnoresScriptOption,
  sourcePathScriptOption,
];
const getScriptOptions = makeGetScriptOptions(...scriptOptions);

export async function findExportsScript() {
  const cwd = process.cwd();

  const { exportName, help, pathRegexIgnores, sourcePath } = getScriptOptions(
    process.argv.slice(2)
  ) as ScriptOptionTypesToDict<typeof scriptOptions>;

  if (help) {
    process.stdout.write(`
    find-exports-script [flags]

    Options:
      ${exportNameScriptOption.documentation}

      ${sourcePathScriptOption.documentation}

      ${pathRegexIgnoresScriptOption.documentation}

      ${helpScriptOption.documentation}

`);
    return;
  }

  const absSource = sourcePath === '*' ? '*' : resolveFrom(cwd, sourcePath);

  fileSystemForEach(
    cwd,
    async function forEachFile(path) {
      const clearPath = stderrWritePath(path);

      const fileExports = await findFileExports(path).then((exports) =>
        exports.filter((exp) => {
          return (
            (exportName === exp.name || exportName === '*') &&
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

  const { exportName, help, pathRegexIgnores, sourcePath } = getScriptOptions(
    process.argv.slice(2)
  ) as ScriptOptionTypesToDict<typeof scriptOptions>;

  if (help) {
    process.stdout.write(`
    find-imports-script [flags]

    Options:
      ${exportNameScriptOption.documentation}

      ${sourcePathScriptOption.documentation}

      ${pathRegexIgnoresScriptOption.documentation}

      ${helpScriptOption.documentation}

`);
    return;
  }

  const absSource = sourcePath === '*' ? '*' : resolveFrom(cwd, sourcePath);

  fileSystemForEach(
    cwd,
    async function forEachFile(path) {
      const clearPath = stderrWritePath(path);

      const fileImports = await findFileImports(path).then((imports) =>
        imports.filter((imp) => {
          return (
            (exportName === imp.name || exportName === '*') &&
            (absSource === imp.source || absSource === '*')
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
