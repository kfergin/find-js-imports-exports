import { getAstFromPath } from './get-ast-from-path';

export async function findFileImports({ filePath }: { filePath: string }) {
  const ast = await getAstFromPath(filePath);
  console.log(ast);
}
