export type ContextValue = string | (() => string);

export class MissingVariableError extends Error {
  readonly variableName: string;

  constructor(name: string) {
    super(`Missing context variable: ${name}`);
    this.name = "MissingVariableError";
    this.variableName = name;
  }
}

type Trim<S extends string> =
  S extends ` ${infer R}` | `\t${infer R}` | `\n${infer R}` ? Trim<R> :
  S extends `${infer R} ` | `${infer R}\t` | `${infer R}\n` ? Trim<R> : S;

type IdentStart =
  'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j'|'k'|'l'|'m'|
  'n'|'o'|'p'|'q'|'r'|'s'|'t'|'u'|'v'|'w'|'x'|'y'|'z'|
  'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L'|'M'|
  'N'|'O'|'P'|'Q'|'R'|'S'|'T'|'U'|'V'|'W'|'X'|'Y'|'Z'|'_';

// Try escape {{{...}}} first (matches runtime regex precedence), then placeholder {{...}}.
// Only emit a key when the trimmed name starts with a valid identifier character.
type ExtractVars<S extends string> =
  S extends `${string}{{{${string}}}}${infer Rest}`
    ? ExtractVars<Rest>
    : S extends `${string}{{${infer Name}}}${infer Rest}`
      ? Trim<Name> extends `${IdentStart}${string}`
        ? Trim<Name> | ExtractVars<Rest>
        : ExtractVars<Rest>
      : never;

type ContextFor<T extends string> =
  [ExtractVars<T>] extends [never]
    ? Record<string, ContextValue>
    : { [K in ExtractVars<T>]: ContextValue };

// Group 1: escape inner content. Group 2: placeholder identifier.
const PATTERN =
  /\{\{\{(\s*[A-Za-z_][A-Za-z0-9_]*\s*)\}\}\}|\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export function render<const T extends string>(
  template: T,
  context: ContextFor<T> & Record<string, ContextValue>
): string {
  return template.replace(
    PATTERN,
    (full, escapeInner: string | undefined, placeholderName: string | undefined): string => {
      if (escapeInner !== undefined) {
        return `{{${escapeInner}}}`;
      }

      if (placeholderName === undefined) {
        throw new Error("render: regex invariant violated");
      }

      if (Object.prototype.hasOwnProperty.call(context, placeholderName)) {
        const value = context[placeholderName];

        if (typeof value === "function") {
          const out = value();
          if (typeof out !== "string") {
            throw new TypeError(
              `Context function "${placeholderName}" must return a string, got ${typeof out}`
            );
          }
          return out;
        }

        if (typeof value === "string") {
          return value;
        }

        throw new TypeError(
          `Context value "${placeholderName}" must be a string or function, got ${typeof value}`
        );
      }

      throw new MissingVariableError(placeholderName);
    }
  );
}
