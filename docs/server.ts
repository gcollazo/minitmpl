import index from "./index.html";

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  development: true,
  routes: {
    "/": index,
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Playground running at http://localhost:${server.port}`);
