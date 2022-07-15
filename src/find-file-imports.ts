import { dirname } from 'path';

import { traverse } from 'estraverse';
import {
  ExportNamedDeclaration,
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
    lineNumber: number;
    name: string;
    source: string;
  }[] = [];

  traverse(ast, {
    enter(node /*, parentNode*/) {
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

      if (
        isImportNodeType(node)
        // node.type === 'ImportDeclaration' ||
        // node.type === 'ExportNamedDeclaration'
      ) {
        const source =
          // only these exports have a `source`:
          // `export { something } from 'somewhere';`
          node.source &&
          resolveFrom.silent(dirname(filePath), node.source.value as string);

        if (!source) return;

        // import 'somewhere';
        fileImports.push({
          // TODO - learn TS:
          // I think `loc` always exists and it's optional because you opt into
          // it with a config (?)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          lineNumber: node.loc!.start.line,
          name: '*import',
          source,
        });
      } else if (isRequireNodeType) {
        const source = resolveFrom.silent(
          dirname(filePath),
          (node.arguments[0] as Literal).value as string
        );

        if (!source) return;

        // require('somewhere')
        // Not clarifying AssignmentExpression...yet
        // someObj.something = require('somewhere');
        fileImports.push({
          // TODO - learn more about TS
          // I think `loc` always exists and it's optional because you opt into
          // it with a config (?)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          lineNumber: node.loc!.start.line,
          name: '*require',
          source,
        });
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
