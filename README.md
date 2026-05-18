# minitmpl

Minimal, pure TypeScript template renderer with compile-time safety for missing variables.

Substitutes `{{name}}` placeholders in a string using values from a context object. Built for assembling LLM prompt strings, where a silently-empty `{{user_question}}` wastes tokens and produces garbage output. Missing variables are caught at compile time — if TypeScript is happy, every placeholder is covered.

```ts
import { render, MissingVariableError } from "@gcollazo/minitmpl";

// ✅ all placeholders satisfied — extra keys are fine
render("Hello, {{name}}!", { name: "world", extra: "ignored" });
//=> "Hello, world!"

// ❌ compile-time error — 'name' is missing
render("Hello, {{name}}!", {});
// TypeScript error: Property 'name' is missing in type '{}'

// ❌ runtime error — dynamic template bypasses static checking
const tmpl: string = "Hello, {{name}}!";
(render as (t: string, c: Record<string, string>) => string)(tmpl, {});
// Uncaught MissingVariableError: Missing context variable: name
//   at render (src/render.ts)
```

## Why

Most templating libraries silently substitute missing variables with an empty string. For LLM prompts, that's a silent correctness bug — a missing `{{context}}` or `{{user_input}}` sends a broken prompt to the model with no indication anything went wrong.

`minitmpl` makes missing variables a **TypeScript type error**, caught at edit time before the code ever runs.

## Requirements

`minitmpl` ships as pure TypeScript source. Your toolchain must be able to consume `.ts` files directly:

- **Bun** — native support
- **Deno** — native support
- **Vite / esbuild / Rollup** — native support
- **Node.js ≥ 22.6** — with `--experimental-strip-types`
- **ts-node / tsx** — with the appropriate loader

## Install

```sh
npm install @gcollazo/minitmpl
# or
bun add @gcollazo/minitmpl
# or
pnpm add @gcollazo/minitmpl
```

## Quick start

```typescript
import { render } from "@gcollazo/minitmpl";

// const-bound template — literal type preserved, no annotation needed
const greeting = "Hello, {{name}}!";
render(greeting, { name: "world" });
//=> "Hello, world!"

// Function values — called once per occurrence, never memoized
let n = 0;
render("{{x}} and {{x}}", { x: () => String(++n) });
//=> "1 and 2"

// Escape syntax — {{{name}}} emits the literal {{name}} with no lookup
render("Use {{{placeholder}}} in your template. Example: {{placeholder}}", {
  placeholder: "{{name}}",
});
//=> "Use {{placeholder}} in your template. Example: {{name}}"
```

## API

```typescript
function render<const T extends string>(
  template: T,
  context: ContextFor<T> & Record<string, ContextValue>
): string;
```

`T` is inferred from the string literal you pass. TypeScript extracts the placeholder names and requires them as keys in `context`. No type annotations needed at the call site.

### Types

```typescript
type ContextValue = string | (() => string);
```

Context values can be plain strings or zero-argument functions that return a string. Functions are called once per placeholder occurrence and are never memoized.

## Placeholder syntax

A placeholder is `{{name}}` where `name` is an identifier matching `[A-Za-z_][A-Za-z0-9_]*`. Whitespace inside the braces is stripped: `{{ name }}` and `{{name}}` are equivalent.

Anything between `{{` and `}}` that doesn't match the identifier rule is **not** a placeholder and is emitted verbatim — dotted paths, names with spaces, stray braces, etc.

Substitution output is never re-scanned. If `context.a === "{{b}}"`, then `{{a}}` renders to the literal string `{{b}}`.

## Escape syntax

Use triple braces to emit a placeholder-shaped string literally:

```typescript
render("{{{keepit}}}", { keepit: "X" })
// → "{{keepit}}"   (no lookup, brace stripped)

render("{{{ spaced }}}", {})
// → "{{ spaced }}"  (inner whitespace preserved)

render("{{a}} but {{{a}}}", { a: "1" })
// → "1 but {{a}}"
```

Escaped names are never looked up in the context and never produce a type error.

## Errors

| Error | Cause |
|---|---|
| `MissingVariableError` | Placeholder name absent from context. Caught at compile time when the template is a string literal; thrown at runtime when types are bypassed (e.g. dynamic templates cast via `any`). |
| `TypeError` | A context value function returned a non-string. |
| `TypeError` | A context value is neither string nor function. |

```typescript
class MissingVariableError extends Error {
  readonly variableName: string;
  // message: `Missing context variable: ${variableName}`
}
```

## Dynamic templates

If your template is assembled at runtime (not a string literal), TypeScript cannot statically check the placeholder keys. Cast explicitly to signal the intent — a `MissingVariableError` will still be thrown at runtime if a key is absent:

```typescript
import { render, MissingVariableError, type ContextValue } from "@gcollazo/minitmpl";

const tmpl: string = getTemplateFromSomewhere();
try {
  (render as (t: string, c: Record<string, ContextValue>) => string)(tmpl, ctx);
} catch (e) {
  if (e instanceof MissingVariableError) {
    console.error("missing:", e.variableName);
  }
}
```

## Security

`@gcollazo/minitmpl` performs **raw** string substitution. The rendered output is **not** escaped for any execution context. Do not pass the output directly into any of the following without an appropriate escaper at that boundary:

- **HTML / DOM** — XSS risk; use a dedicated HTML-escaping library
- **SQL** — SQL injection risk; use parameterized queries
- **Shell commands** — command injection risk
- **JavaScript `eval` / `Function` constructors** — arbitrary code execution
- **JSON re-parsed without validation**
- **File paths, URLs, regex sources, or any other interpreted syntax**

This library was built for assembling **LLM prompt strings**, where the output is fed to a model as plain text. Prompt-injection concerns (untrusted text embedded in a prompt) are out of scope for this library and must be addressed separately by the caller.

## Non-features

These are explicit non-goals:

- **No HTML/XML escaping.** Output is raw. Escape at the caller layer.
- **No recursive substitution.** Values are substituted once and not re-scanned.
- **No nested placeholders.** `{{ {{a}} }}` produces no special behavior.
- **No filters, conditionals, loops, or partials.**
- **No N-brace generalization.** Only `{{...}}` and `{{{...}}}` are recognized.
- **No lenient/warn mode.** Missing variables must be present; the type system enforces this.

## Contributing

This project does not accept code contributions. Bug reports and feature suggestions are welcome via [GitHub Issues](https://github.com/gcollazo/minitmpl/issues).

## License

MIT
