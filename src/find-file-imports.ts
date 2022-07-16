// TODO - learn TS:
// I think `loc` always exists and it's optional because you opt into
// it with a config (?)
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { dirname } from 'path';

import { Scope, analyze } from 'eslint-scope';
import { traverse } from 'estraverse';
import {
  ExportNamedDeclaration,
  Identifier,
  ImportDeclaration,
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

  const globalScope = analyze(ast, {
    ecmaVersion: 6,
    sourceType: 'module',
  }).acquire(ast);
  if (globalScope === null) {
    throw Error(`Error getting scope for ${filePath}!`);
  }
  const allScopes: [Scope] = [globalScope];

  const fileImports: {
    lineNumber: number;
    name: '*import' | '*import()' | '*require' | 'default' | string;
    referenceIdentifiers?: Identifier[];
    source: string;
  }[] = [];

  traverse(ast, {
    enter(node, parentNode) {
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
                lineNumber,
                name: '*import',
                referenceIdentifiers: findOtherReferences(
                  specifier.local,
                  allScopes
                ),
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
      } else if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        // just handling literal sources. not:
        // require(`./path/interpolation/${chaos}`)
        // require('./path/interpolation/' + chaos)
        node.arguments[0].type === 'Literal' &&
        typeof node.arguments[0].value === 'string'
      ) {
        const source = resolveFrom.silent(
          dirname(filePath),
          node.arguments[0].value
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
            if (
              property.type !== 'RestElement' &&
              property.key.type === 'Identifier'
            ) {
              fileImports.push({
                lineNumber: property.key.loc!.start.line,
                name: property.key.name,
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
            lineNumber: parentNode.id.loc!.start.line,
            name: '*require',
            referenceIdentifiers: findOtherReferences(parentNode.id, allScopes),
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
      } else if (
        node.type === 'ImportExpression' &&
        // just handling literal sources. not:
        // import(`./path/interpolation/${chaos}`)
        // import('./path/interpolation/' + chaos)
        node.source.type === 'Literal' &&
        typeof node.source.value === 'string'
      ) {
        const source = resolveFrom.silent(dirname(filePath), node.source.value);

        if (!source) return;

        // const something = import('somewhere')
        // (not figuring out specifics on what `something` resolves to)
        fileImports.push({
          lineNumber: node.loc!.start.line,
          name: '*import()',
          source,
        });
      }
    },
    fallback: 'iteration',
  });

  const referencesToFindMap: Map<Identifier, string> = new Map();
  for (const { referenceIdentifiers, source } of fileImports) {
    if (referenceIdentifiers?.length) {
      referenceIdentifiers.forEach((identifier) =>
        referencesToFindMap.set(identifier, source)
      );
    }
  }

  if (referencesToFindMap.size) {
    // import * as something from 'somewhere';
    // looking for `something.<some-propery>`
    traverse(ast, {
      enter: function (node, parent) {
        if (node.type !== 'Identifier' || parent?.type !== 'MemberExpression') {
          return;
        }

        const source = referencesToFindMap.get(node);

        const { property } = parent;
        let name = '';
        switch (property.type) {
          case 'Identifier':
            name = property.name;
            break;
          case 'Literal':
            name = property.value as string;
            break;
        }

        if (source && name) {
          fileImports.push({
            lineNumber: parent.property.loc!.start.line,
            name,
            source,
          });
        }
      },
      fallback: 'iteration',
    });
  }

  return fileImports.map((fileImport) => ({
    ...fileImport,
    destination: filePath,
  }));
}

function findOtherReferences(
  identifier: Identifier,
  scopes: Scope[]
): Identifier[] {
  for (const scope of scopes) {
    const sourceVariable = scope.set.get(identifier.name);
    if (sourceVariable?.defs[0]?.name === identifier) {
      return sourceVariable.references
        .filter((reference) => reference.identifier !== identifier)
        .map(({ identifier }) => identifier);
    }

    const childScopeReferences = findOtherReferences(
      identifier,
      scope.childScopes
    );
    if (childScopeReferences.length) {
      return childScopeReferences;
    }
  }

  return [];
}
