// TODO - learn TS:
// I think `loc` always exists and it's optional because you opt into
// it with a config (?)
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { dirname } from 'path';

import { traverse } from 'estraverse';
import resolveFrom from 'resolve-from';

import { getAstFromPath } from './get-ast-from-path';

export async function findFileExports(filePath: string) {
  const ast = await getAstFromPath(filePath);

  const fileExports: {
    lineNumber: number;
    name: string;
    source: string;
  }[] = [];

  // if this file re-exports from other files, we'll include those too
  // e.g. export * from 'somewhere';
  const exportStarPaths: Set<string> = new Set();

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
          } else {
            // declaration.type: 'VariableDeclaration'
            declaration.declarations
              .flatMap((dec) => {
                if (dec.id.type === 'ObjectPattern') {
                  // export const { some: other, another, ...why } = anObject;
                  return dec.id.properties.map((prop) =>
                    prop.type === 'RestElement' ? prop.argument : prop.value
                  );
                } else {
                  // export const something = 'a value';
                  return dec.id;
                }
              })
              .forEach((identifier) => {
                if (identifier.type !== 'Identifier') {
                  throw Error(
                    "A node that isn't an identifier snuck through. The above flatMap needs to handle it."
                  );
                }
                fileExports.push({
                  lineNumber: identifier.loc!.start.line,
                  name: identifier.name,
                  source: filePath,
                });
              });
          }
        }
      } else if (node.type === 'ExportAllDeclaration') {
        if (node.exported) {
          // export * as something from 'somewhere';
          fileExports.push({
            lineNumber: node.exported.loc!.start.line,
            name: node.exported.name,
            source: filePath,
          });
        } else {
          // export * from 'somewhere';
          const exportStarPath = resolveFrom.silent(
            dirname(filePath),
            node.source.value as string
          );
          if (exportStarPath) {
            exportStarPaths.add(exportStarPath);
          }
        }
      }
    },
    fallback: 'iteration',
  });

  for (const exportStarPath of exportStarPaths) {
    // NOTE: this will include default exports, but in the current spec,
    // `export *` doesn't actually include that export. I'm keeping this as is
    // because you shouldn't rely on this behavior, which may change in a
    // future spec.
    fileExports.push(...(await findFileExports(exportStarPath)));
  }

  return fileExports;
}
