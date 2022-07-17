import readline from 'readline';

export function stderrWritePath(path: string) {
  const terminalWidth = process.stderr.columns;

  process.stderr.write(path.slice(-1 * terminalWidth));

  // clear the printed filename before we print
  // file imports or the next file name
  return function stderrClearPath() {
    readline.cursorTo(process.stderr, 0);
    readline.clearLine(process.stderr, 1);
  };
}
