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
      } else if (node.type === 'ExportNamedDeclaration') {
        if (!node.declaration) {
          node.specifiers.forEach((specifier) => {
            // export { something as another } from 'somewhere';
            // export { something as another };
            fileExports.push({
              lineNumber: specifier.exported.loc!.start.line,
              name: specifier.exported.name,
              source: filePath,
            });
          });
        } else {
          const { declaration } = node;
          if (
            declaration.type === 'ClassDeclaration' ||
            declaration.type === 'FunctionDeclaration'
          ) {
            // export function something() {}
            // export class something {}
            fileExports.push({
              // declaration.id can only be null with ExportDefaultDeclaration
              lineNumber: declaration.id!.loc!.start.line,
              name: declaration.id!.name,
              source: filePath,
            });
          }
        }
      }
    },
    fallback: 'iteration',
  });

  return fileExports;
}
