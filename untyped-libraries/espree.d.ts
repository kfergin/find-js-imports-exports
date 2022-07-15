declare module 'espree' {
  import type { Node } from 'estree';

  function parse(
    code: string,
    options: Partial<{
      allowReserved: boolean;
      comment: boolean;
      ecmaFeatures: Partial<{
        globalReturn: boolean;
        impliedStrict: boolean;
        jsx: boolean;
      }>;
      ecmaVersion: number | 'latest';
      loc: boolean;
      range: boolean;
      sourceType: 'script' | 'module' | 'commonjs';
      tokens: boolean;
    }>
  ): Node;
}
