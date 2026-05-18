// Type-only assertions — never executed, only checked with `tsc --noEmit`.
import { render } from "./render";

// Return type is string.
const _result: string = render("hi", {});
void _result;

// Required key present: OK.
render("Hello, {{name}}", { name: "world" });

// Extra keys beyond template needs are allowed.
render("Hello, {{name}}", { name: "world", extra: "ok" });

// const-bound template variable — no annotation needed.
const greeting = "Hello, {{name}}!";
render(greeting, { name: "world" });

// Escape placeholders never require a context key.
render("{{{escaped}}}", {});

// Multiple placeholders all required.
render("{{a}} and {{b}}", { a: "x", b: "y" });

// --- Negative cases (must remain type errors) ---

// @ts-expect-error — required key 'name' missing
render("Hello, {{name}}", {});

// @ts-expect-error — typo: 'nmae' is not 'name'
render("Hello, {{name}}", { nmae: "world" });

// @ts-expect-error — 'b' missing
render("{{a}} {{b}}", { a: "x" });
