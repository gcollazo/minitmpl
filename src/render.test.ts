import { describe, it, expect, mock } from "bun:test";
import { render, MissingVariableError, type ContextValue } from "./render";

// Bypass compile-time literal-type checking to exercise runtime behavior.
const unsafeRender = render as (t: string, c: Record<string, ContextValue>) => string;

describe("render — basic substitution", () => {
  it("substitutes a string value", () => {
    expect(render("Hello, {{name}}", { name: "World" })).toBe("Hello, World");
  });

  it("substitutes a function value", () => {
    expect(render("Count: {{n}}", { n: () => "42" })).toBe("Count: 42");
  });

  it("substitutes multiple placeholders, including repeats", () => {
    expect(render("{{a}} {{b}} {{a}}", { a: "x", b: "y" })).toBe("x y x");
  });

  it("returns the template unchanged when there are no placeholders", () => {
    expect(render("plain text", {})).toBe("plain text");
  });

  it("handles an empty template", () => {
    expect(render("", {})).toBe("");
  });

  it("substitutes an empty string value as empty", () => {
    expect(render("[{{a}}]", { a: "" })).toBe("[]");
  });
});

describe("render — whitespace inside braces", () => {
  it("trims a single space", () => {
    expect(render("Hello, {{ name }}", { name: "World" })).toBe("Hello, World");
  });

  it("trims multiple spaces", () => {
    expect(render("Hello, {{   name   }}", { name: "World" })).toBe("Hello, World");
  });
});

describe("render — function context values", () => {
  it("calls the function for each occurrence (no memoization)", () => {
    const fn = mock(() => "X");
    render("{{a}} {{a}} {{a}}", { a: fn });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("invokes function values left-to-right across different keys", () => {
    const order: string[] = [];
    render("{{a}} {{b}} {{a}}", {
      a: () => { order.push("a"); return "A"; },
      b: () => { order.push("b"); return "B"; },
    });
    expect(order).toEqual(["a", "b", "a"]);
  });

  it("throws TypeError when a context function returns a non-string", () => {
    expect(() =>
      render("{{a}}", { a: (() => 42) as unknown as () => string })
    ).toThrow(TypeError);
  });

  it("throws TypeError when a context value is neither string nor function", () => {
    expect(() =>
      render("{{a}}", { a: 42 as unknown as ContextValue })
    ).toThrow(TypeError);
  });
});

describe("render — escape syntax", () => {
  it("renders {{{name}}} as the literal {{name}}", () => {
    expect(render("{{{keepit}}}", { keepit: "X" })).toBe("{{keepit}}");
  });

  it("does not look up escaped names (no error on missing)", () => {
    expect(render("{{{foo}}}", {})).toBe("{{foo}}");
  });

  it("preserves inner whitespace in escapes", () => {
    expect(render("{{{ spaced }}}", {})).toBe("{{ spaced }}");
  });

  it("handles escape and placeholder side by side", () => {
    expect(render("{{a}} but {{{a}}}", { a: "1" })).toBe("1 but {{a}}");
  });

  it("tries escape before placeholder at the same position", () => {
    expect(render("{{{foo}}}", { foo: "BAR" })).toBe("{{foo}}");
  });

  it("decomposes four braces as stray-brace + escape + stray-brace", () => {
    expect(render("{{{{foo}}}}", { foo: "BAR" })).toBe("{{{foo}}}");
  });
});

describe("render — non-placeholder content", () => {
  it("emits single braces verbatim", () => {
    expect(render("a { b } c", {})).toBe("a { b } c");
  });

  it("emits asymmetric brace counts mostly verbatim", () => {
    expect(render("{{{foo}}", { foo: "X" })).toBe("{X");
    expect(render("{{foo}}}", { foo: "X" })).toBe("X}");
  });
});

describe("render — missing variables", () => {
  it("throws MissingVariableError for an absent key", () => {
    expect(() => unsafeRender("{{x}}", {})).toThrow(MissingVariableError);
  });

  it("error message names the missing variable", () => {
    expect(() => unsafeRender("{{x}}", {})).toThrow("Missing context variable: x");
  });

  it("carries the variable name on the error", () => {
    expect.assertions(1);
    try {
      unsafeRender("{{x}}", {});
    } catch (e) {
      expect((e as MissingVariableError).variableName).toBe("x");
    }
  });

  it("throws on the first missing variable, left-to-right", () => {
    expect.assertions(1);
    try {
      unsafeRender("{{a}} {{b}}", {});
    } catch (e) {
      expect((e as MissingVariableError).variableName).toBe("a");
    }
  });

  it("does not use inherited properties as context entries", () => {
    expect(() => unsafeRender("{{toString}}", {})).toThrow(MissingVariableError);
  });
});

describe("render — purity", () => {
  it("does not mutate the template string", () => {
    const t = "Hello, {{name}}";
    render(t, { name: "World" });
    expect(t).toBe("Hello, {{name}}");
  });

  it("does not mutate the context object", () => {
    const ctx = { a: "1", b: () => "2" };
    const snapshot = { ...ctx };
    render("{{a}} {{b}}", ctx);
    expect(ctx).toEqual(snapshot);
  });

  it("produces identical output for identical inputs", () => {
    const ctx = { a: "x", b: () => "y" };
    expect(render("{{a}} {{b}}", ctx)).toBe(render("{{a}} {{b}}", ctx));
  });
});
