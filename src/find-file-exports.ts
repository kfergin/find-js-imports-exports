// TODO - learn TS:
// I think `loc` always exists and it's optional because you opt into
// it with a config (?)
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { dirname } from 'path';

import { Scope, analyze } from 'eslint-scope';
import { traverse } from 'estraverse';
import { Identifier } from 'estree';
import resolveFrom from 'resolve-from';

import { getAstFromPath } from './get-ast-from-path';
import {
  findOtherReferencesFromReference,
  findOtherReferencesFromVariable,
} from './other-references';

export async function findFileExports(filePath: string) {
  const ast = await getAstFromPath(filePath);

  const globalScope = analyze(ast, {
    ecmaVersion: 6,
    sourceType: 'module',
  }).acquire(ast);
  if (globalScope === null) {
    throw Error(`Error getting scope for ${filePath}!`);
  }
  const allScopes: [Scope] = [globalScope];

  const fileExports: {
    isReExport: boolean;
    lineNumber: number;
    name: string;
    numReferencesInSource: number | null;
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
          isReExport: false,
          lineNumber: node.loc!.start.line,
          name: 'default',
          numReferencesInSource: null,
          source: filePath,
        });
      } else if (node.type === 'ExportNamedDeclaration') {
        if (!node.declaration) {
          node.specifiers.forEach((specifier) => {
            // export { something as another } from 'somewhere';
            // export { something as another };
            fileExports.push({
              isReExport: false,
              lineNumber: specifier.exported.loc!.start.line,
              name: specifier.exported.name,
              numReferencesInSource: node.source
                ? 0
                : findOtherReferencesFromReference(specifier.local, allScopes)
                    .length,
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
              isReExport: false,
              // declaration.id can only be null with ExportDefaultDeclaration
              lineNumber: declaration.id!.loc!.start.line,
              name: declaration.id!.name,
              numReferencesInSource: findOtherReferencesFromVariable(
                declaration.id as Identifier,
                allScopes
              ).length,
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
                  isReExport: false,
                  lineNumber: identifier.loc!.start.line,
                  name: identifier.name,
                  numReferencesInSource: findOtherReferencesFromVariable(
                    identifier,
                    allScopes
                  ).length,
                  source: filePath,
                });
              });
          }
        }
      } else if (node.type === 'ExportAllDeclaration') {
        if (node.exported) {
          // export * as something from 'somewhere';
          fileExports.push({
            isReExport: false,
            lineNumber: node.exported.loc!.start.line,
            name: node.exported.name,
            numReferencesInSource: 0,
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
    fileExports.push(
      ...(await findFileExports(exportStarPath).then((fileExport) => ({
        ...fileExport,
        isReExport: true,
      })))
    );
  }

  return fileExports;
}
