export type ScriptOption<Name extends string, Value> = {
  defaultValue: Value;
  documentation: string;
  flags: string[];
  getValue: (arg: string, argIndex: number, allArgs: string[]) => Value;
  name: Name;
};

type ScriptOptionToDict<Type> = Type extends ScriptOption<
  infer Name,
  infer Value
>
  ? { [Key in Name]: Value }
  : never;

type Flatten<Type> = Type extends Array<infer Item> ? Item : never;

type UnionToIntersection<UnionType> = (
  UnionType extends unknown ? (k: UnionType) => void : never
) extends (k: infer IntersectionType) => void
  ? IntersectionType
  : never;

export type ScriptOptionTypesToDict<OptionTypes> = UnionToIntersection<
  ScriptOptionToDict<Flatten<OptionTypes>>
>;

// important to tell TS to infer the Name type as 'help' and not string.
// `name: 'help' as const,` would also work
export const helpScriptOption: ScriptOption<'help', boolean> = {
  defaultValue: false,
  documentation: `--help, -h
        Print out help documentation.`,
  flags: ['--help', '-h'],
  getValue() {
    return true;
  },
  name: 'help',
};

export const pathRegexIgnoresScriptOption: ScriptOption<
  'pathRegexIgnores',
  RegExp[]
> = {
  defaultValue: [],
  documentation: `--path-regex-ignores, -i
        Ignores a directory or file if one of the provided regex patterns
        matches the path. Should be in the regex-literal form and
        space-delimited. The regex body and flags will be passed to the RegExp
        constructor.
        e.g. \`find-imports-script someVar './some-file' -i /.test.js$/i /.*flow.*/\``,
  flags: ['--path-regex-ignores', '-i'],
  getValue(arg, flagIdx, sourceArgs) {
    const regexes = [];

    for (let idx = flagIdx + 1; idx < sourceArgs.length; idx++) {
      const [, regexBody, regexFlags] =
        sourceArgs[idx].match(/^\/(.+)\/([a-z]*)$/) || [];
      if (regexBody) {
        regexes.push(new RegExp(regexBody, regexFlags));
      } else {
        break;
      }
    }

    if (!regexes.length) {
      throw Error(
        "Option error with '--path-regex-ignores, -i'. You're trying to ignore files, but didn't provide a regex pattern"
      );
    }

    return regexes;
  },
  name: 'pathRegexIgnores',
};

export function makeGetScriptOptions(
  ...optionDefinitions: ScriptOption<string, unknown>[]
) {
  const defaultOptions = optionDefinitions.reduce(
    (defaults: { [name: string]: unknown }, def) => {
      defaults[def.name] = def.defaultValue;
      return defaults;
    },
    {}
  ) as ScriptOptionTypesToDict<typeof optionDefinitions>;

  return function getScriptOptions(args: string[]) {
    return args.reduce((options, arg, idx, sourceArgs) => {
      for (const def of optionDefinitions) {
        if (def.flags.includes(arg)) {
          options[def.name] = def.getValue(arg, idx, sourceArgs);
        }
      }
      return options;
    }, defaultOptions);
  };
}
