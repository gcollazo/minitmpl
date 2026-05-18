import { render, type ContextValue } from "../src/render";

type Example = {
  template: string;
  context: string;
};

const examples: Record<string, Example> = {
  hello: {
    template: "Hello, {{name}}!",
    context: `{
  name: "World"
}`,
  },
  multi: {
    template: "Dear {{title}} {{lastName}},\n\nYour order #{{orderId}} is ready.\n\n— {{company}}",
    context: `{
  title: "Dr.",
  lastName: "Curie",
  orderId: "A-1042",
  company: "Soup Co."
}`,
  },
  fn: {
    template: "Generated at {{now}} — random token: {{token}}",
    context: `{
  now: () => new Date().toISOString(),
  token: () => Math.random().toString(36).slice(2, 10)
}`,
  },
  escape: {
    template: "Use {{{name}}} as a placeholder for the user's name.\nExample: {{name}}",
    context: `{
  name: "Alice"
}`,
  },
  whitespace: {
    template: "Hello, {{ name }} — your role is {{   role   }}.",
    context: `{
  name: "Bob",
  role: "admin"
}`,
  },
};

const $ = <T extends HTMLElement>(id: string, ctor: new (...args: never[]) => T): T => {
  const el = document.getElementById(id);
  if (!(el instanceof ctor)) throw new Error(`Missing or wrong-type element: ${id}`);
  return el;
};

const templateEl = $("template", HTMLTextAreaElement);
const contextEl = $("context", HTMLTextAreaElement);
const renderBtn = $("render", HTMLButtonElement);
const outputEl = $("output", HTMLPreElement);
const logEl = $("log", HTMLPreElement);
const callEl = $("call", HTMLPreElement);
const exampleEl = $("example", HTMLSelectElement);

function loadExample(key: string) {
  const ex = examples[key];
  if (!ex) return;
  templateEl.value = ex.template;
  contextEl.value = ex.context;
  doRender();
}

exampleEl.addEventListener("change", () => loadExample(exampleEl.value));

function parseContext(src: string): Record<string, ContextValue> {
  const trimmed = src.trim();
  if (!trimmed) return {};
  // Evaluate as a JS expression in a sandboxed function scope.
  // Acceptable for a local playground; do not ship to untrusted input.
  const fn = new Function(`"use strict"; return (${trimmed});`);
  const value: unknown = fn();
  if (value === null || typeof value !== "object") {
    throw new TypeError("Context must be an object literal.");
  }
  const out: Record<string, ContextValue> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "string" && typeof v !== "function") {
      throw new TypeError(`Context value "${k}" must be a string or function, got ${typeof v}`);
    }
    out[k] = v as ContextValue;
  }
  return out;
}

function appendLog(line: string, kind: "info" | "warn" | "error") {
  const span = document.createElement("span");
  span.className = kind;
  span.textContent = line + "\n";
  logEl.appendChild(span);
}

function indent(src: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return src
    .split("\n")
    .map((line, i) => (i === 0 ? line : pad + line))
    .join("\n");
}

function formatTemplate(src: string): string {
  return "`" + src.replace(/\\/g, "\\\\").replace(/`/g, "\\`") + "`";
}

function formatContext(src: string): string {
  const trimmed = src.trim();
  return trimmed ? trimmed : "{}";
}

function updateCall() {
  const tmpl = formatTemplate(templateEl.value);
  const ctx = formatContext(contextEl.value);
  callEl.textContent =
    "render(\n" +
    "  " + indent(tmpl, 2) + ",\n" +
    "  " + indent(ctx, 2) + "\n" +
    ");";
}

function doRender() {
  updateCall();
  outputEl.textContent = "";
  logEl.textContent = "";

  let ctx: Record<string, ContextValue>;
  try {
    ctx = parseContext(contextEl.value);
  } catch (e) {
    appendLog(`Context parse error: ${e instanceof Error ? e.message : String(e)}`, "error");
    return;
  }

  try {
    // Template is a runtime string — bypass static literal-type checking intentionally.
    const out = (render as (t: string, c: Record<string, ContextValue>) => string)(
      templateEl.value,
      ctx
    );
    outputEl.textContent = out;
    appendLog(`rendered ${out.length} chars`, "info");
  } catch (e) {
    if (e instanceof Error) {
      appendLog(`${e.name}: ${e.message}`, "error");
    } else {
      appendLog(String(e), "error");
    }
  }
}

renderBtn.addEventListener("click", doRender);
templateEl.addEventListener("input", updateCall);
contextEl.addEventListener("input", updateCall);

templateEl.addEventListener("keydown", handleTab);
contextEl.addEventListener("keydown", handleTab);
function handleTab(e: KeyboardEvent) {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const ta = e.currentTarget;
  if (!(ta instanceof HTMLTextAreaElement)) return;
  const { selectionStart: s, selectionEnd: end } = ta;
  ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = s + 2;
}

// Start with the first example.
loadExample("hello");
