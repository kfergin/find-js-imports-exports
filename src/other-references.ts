import { Scope } from 'eslint-scope';
import { Identifier } from 'estree';

export function findVariableOtherReferences(
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

    const childScopeReferences = findVariableOtherReferences(
      identifier,
      scope.childScopes
    );
    if (childScopeReferences.length) {
      return childScopeReferences;
    }
  }

  return [];
}
