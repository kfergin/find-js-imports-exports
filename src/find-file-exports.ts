// TODO - learn TS:
// I think `loc` always exists and it's optional because you opt into
// it with a config (?)
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { traverse } from 'estraverse';

import { getAstFromPath } from './get-ast-from-path';

export async function findFileExports(filePath: string) {
  const ast = await getAstFromPath(filePath);

  const fileExports: {
    lineNumber: number;
    name: string;
    source: string;
  }[] = [];

  traverse(ast, {
    enter: function (node) {
      if (node.type === 'ExportDefaultDeclaration') {
        // export default function() {}
        fileExports.push({
          lineNumber: node.loc!.start.line,
          name: 'default',
          source: filePath,
        });
      }
    },
    fallback: 'iteration',
  });

  return fileExports;
}
