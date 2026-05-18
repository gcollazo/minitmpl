class m extends Error{variableName;constructor(o){super(`Missing context variable: ${o}`);this.name="MissingVariableError",this.variableName=o}}var y=/\{\{\{(\s*[A-Za-z_][A-Za-z0-9_]*\s*)\}\}\}|\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;function b(o,r){return o.replace(y,(e,i,t)=>{if(i!==void 0)return`{{${i}}}`;if(t===void 0)throw Error("render: regex invariant violated");if(Object.prototype.hasOwnProperty.call(r,t)){let a=r[t];if(typeof a==="function"){let n=a();if(typeof n!=="string")throw TypeError(`Context function "${t}" must return a string, got ${typeof n}`);return n}if(typeof a==="string")return a;throw TypeError(`Context value "${t}" must be a string or function, got ${typeof a}`)}throw new m(t)})}var z={hello:{template:"Hello, {{name}}!",context:`{
  name: "World"
}`},multi:{template:`Dear {{title}} {{lastName}},

Your order #{{orderId}} is ready.

— {{company}}`,context:`{
  title: "Dr.",
  lastName: "Curie",
  orderId: "A-1042",
  company: "Soup Co."
}`},fn:{template:"Generated at {{now}} — random token: {{token}}",context:`{
  now: () => new Date().toISOString(),
  token: () => Math.random().toString(36).slice(2, 10)
}`},escape:{template:`Use {{{name}}} as a placeholder for the user's name.
Example: {{name}}`,context:`{
  name: "Alice"
}`},whitespace:{template:"Hello, {{ name }} — your role is {{   role   }}.",context:`{
  name: "Bob",
  role: "admin"
}`}},s=(o,r)=>{let e=document.getElementById(o);if(!(e instanceof r))throw Error(`Missing or wrong-type element: ${o}`);return e},c=s("template",HTMLTextAreaElement),d=s("context",HTMLTextAreaElement),k=s("render",HTMLButtonElement),g=s("output",HTMLPreElement),u=s("log",HTMLPreElement),F=s("call",HTMLPreElement),f=s("example",HTMLSelectElement);function v(o){let r=z[o];if(!r)return;c.value=r.template,d.value=r.context,x()}f.addEventListener("change",()=>v(f.value));function M(o){let r=o.trim();if(!r)return{};let i=Function(`"use strict"; return (${r});`)();if(i===null||typeof i!=="object")throw TypeError("Context must be an object literal.");let t={};for(let[a,n]of Object.entries(i)){if(typeof n!=="string"&&typeof n!=="function")throw TypeError(`Context value "${a}" must be a string or function, got ${typeof n}`);t[a]=n}return t}function l(o,r){let e=document.createElement("span");e.className=r,e.textContent=o+`
`,u.appendChild(e)}function h(o,r){let e=" ".repeat(r);return o.split(`
`).map((i,t)=>t===0?i:e+i).join(`
`)}function S(o){return"`"+o.replace(/\\/g,"\\\\").replace(/`/g,"\\`")+"`"}function R(o){let r=o.trim();return r?r:"{}"}function p(){let o=S(c.value),r=R(d.value);F.textContent=`render(
  `+h(o,2)+`,
  `+h(r,2)+`
);`}function x(){p(),g.textContent="",u.textContent="";let o;try{o=M(d.value)}catch(r){l(`Context parse error: ${r instanceof Error?r.message:String(r)}`,"error");return}try{let r=b(c.value,o);g.textContent=r,l(`rendered ${r.length} chars`,"info")}catch(r){if(r instanceof Error)l(`${r.name}: ${r.message}`,"error");else l(String(r),"error")}}k.addEventListener("click",x);c.addEventListener("input",p);d.addEventListener("input",p);c.addEventListener("keydown",w);d.addEventListener("keydown",w);function w(o){if(o.key!=="Tab")return;o.preventDefault();let r=o.currentTarget;if(!(r instanceof HTMLTextAreaElement))return;let{selectionStart:e,selectionEnd:i}=r;r.value=r.value.slice(0,e)+"  "+r.value.slice(i),r.selectionStart=r.selectionEnd=e+2}v("hello");
