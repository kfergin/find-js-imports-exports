// TODO - learn TS:
// I think `loc` always exists and it's optional because you opt into
// it with a config (?)
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { dirname } from 'path';

import { traverse } from 'estraverse';
import {
  ExportNamedDeclaration,
  Identifier,
  ImportDeclaration,
  Literal,
  Node,
} from 'estree';
import resolveFrom from 'resolve-from';

import { getAstFromPath } from './get-ast-from-path';

// this is a type predicate.
// TODO - learn TS:
// Do type predicates have to be functions?
function isImportNodeType(
  node: Node
): node is ImportDeclaration | ExportNamedDeclaration {
  return ['ImportDeclaration', 'ExportNamedDeclaration'].includes(node.type);
}

export async function findFileImports({ filePath }: { filePath: string }) {
  const ast = await getAstFromPath(filePath);

  const fileImports: {
    identifier?: Identifier;
    lineNumber: number;
    name: string;
    source: string;
  }[] = [];

  traverse(ast, {
    enter(node, parentNode) {
      const isImportExpressionType =
        node.type === 'ImportExpression' &&
        // just handling literal sources. not:
        // import(`./path/interpolation/${chaos}`)
        // import('./path/interpolation/' + chaos)
        node.source.type === 'Literal';
      const isRequireNodeType =
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require';

      if (isImportNodeType(node)) {
        const source =
          // only these exports have a `source`:
          // `export { something } from 'somewhere';`
          node.source &&
          resolveFrom.silent(dirname(filePath), node.source.value as string);

        if (!source) return;

        if (!node.specifiers.length) {
          // import 'somewhere';
          fileImports.push({
            lineNumber: node.loc!.start.line,
            name: '*import',
            source,
          });
        } else {
          node.specifiers.forEach((specifier) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const lineNumber = specifier.loc!.start.line;

            if (specifier.type === 'ImportDefaultSpecifier') {
              // import something from 'somewhere';
              fileImports.push({
                lineNumber,
                name: 'default',
                source,
              });
            } else if (specifier.type === 'ImportNamespaceSpecifier') {
              // import * as something from 'somewhere';
              fileImports.push({
                identifier: specifier.local,
                lineNumber,
                name: '*import',
                source,
              });
            } else if (specifier.type === 'ImportSpecifier') {
              // import { something as other } from 'somewhere';
              // import { default as other } from 'somewhere';
              fileImports.push({
                lineNumber,
                name: specifier.imported.name,
                source,
              });
            } else if (specifier.type === 'ExportSpecifier' && node.source) {
              // export { something as other } from 'somewhere';
              fileImports.push({
                lineNumber,
                name: specifier.local.name,
                source,
              });
            }
          });
        }
      } else if (isRequireNodeType) {
        const source = resolveFrom.silent(
          dirname(filePath),
          (node.arguments[0] as Literal).value as string
        );

        if (!source) return;

        if (
          parentNode?.type === 'MemberExpression' &&
          parentNode.property.type === 'Identifier' &&
          parentNode.property.name
        ) {
          // require('somewhere').something
          // require('somewhere').default
          fileImports.push({
            lineNumber: parentNode.property.loc!.start.line,
            name: parentNode.property.name,
            source,
          });
        } else if (
          parentNode?.type === 'VariableDeclarator' &&
          parentNode.id.type === 'ObjectPattern'
        ) {
          // const { something, ... } = require('somewhere')
          parentNode.id.properties.forEach((property) => {
            // not supporting: const { ...other } = require('somewhere');
            if (property.type !== 'RestElement') {
              fileImports.push({
                lineNumber: property.key.loc!.start.line,
                name: (property.key as Identifier).name,
                source,
              });
            }
          });
        } else if (
          parentNode?.type === 'VariableDeclarator' &&
          parentNode.id.type === 'Identifier'
        ) {
          // const something = require('somewhere')
          fileImports.push({
            identifier: parentNode.id,
            lineNumber: parentNode.id.loc!.start.line,
            name: '*require',
            source,
          });
        } else {
          // require('somewhere')
          // Not clarifying AssignmentExpression...yet
          // someObj.something = require('somewhere');
          fileImports.push({
            lineNumber: node.loc!.start.line,
            name: '*require',
            source,
          });
        }
      } else if (isImportExpressionType) {
        const source = resolveFrom.silent(
          dirname(filePath),
          (node.source as Literal).value as string
        );

        if (!source) return;

        // const something = import('somewhere')
        // (not figuring out specifics on what `something` resolves to)
        fileImports.push({
          // TODO - learn more about TS
          // I think `loc` always exists and it's optional because you opt into
          // it with a config (?)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          lineNumber: node.loc!.start.line,
          name: '*import()',
          source,
        });
      }
    },
    fallback: 'iteration',
  });

  return fileImports.map((fileImport) => ({
    ...fileImport,
    destination: filePath,
  }));
}
