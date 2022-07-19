import { Scope, Variable } from 'eslint-scope';
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

function findVariableFromReference(
  identifier: Identifier,
  scopes: Scope[]
): Variable | null {
  for (const scope of scopes) {
    const identifierReference = scope.references.find(
      (reference) => reference.identifier === identifier
    );
    if (identifierReference) {
      return identifierReference.resolved;
    }

    const childScopeVariable = findVariableFromReference(
      identifier,
      scope.childScopes
    );
    if (childScopeVariable) return childScopeVariable;
  }

  return null;
}

// Given `other` in the export, this function finds its references involved in
// `thing` and `more` and NOT in its initial declaration:
// const other = 123;
// const thing = 456 + other;
// const more = 789 + other;
// export { other as something };
export function findOtherReferencesFromReference(
  identifier: Identifier,
  scopes: Scope[]
) {
  const variable = findVariableFromReference(identifier, scopes);

  return variable === null
    ? []
    : variable.references.filter(
        (reference) =>
          reference.identifier !== identifier &&
          reference.identifier !== variable.defs[0].name
      );
}
