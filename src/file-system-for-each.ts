import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function fileSystemForEach(
  givenPath: string,
  forEachFile: (givenPath: string, stop: () => void) => void | Promise<void>,
  options: { pathRegexIgnores?: RegExp[] } = {}
) {
  const { pathRegexIgnores = [] } = options;
  const isDirectory = await stat(givenPath).then((s) => s.isDirectory());

  if (
    (!isDirectory && !/\.js$/.test(givenPath)) ||
    pathRegexIgnores.some((regexIgnore) => regexIgnore.test(givenPath))
  ) {
    return false;
  }

  if (!isDirectory) {
    let shouldBreak = false;
    const stop = () => (shouldBreak = true);
    await forEachFile(givenPath, stop);
    if (shouldBreak) return true;
  } else {
    const dirItems = await readdir(givenPath);
    for (const dirItem of dirItems) {
      const shouldBreak = await fileSystemForEach(
        join(givenPath, dirItem),
        forEachFile,
        options
      );
      if (shouldBreak) return true;
    }
  }

  return false;
}
