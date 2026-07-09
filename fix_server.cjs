const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// The original file started with:
// import express from "express";
// import path from "path";
// import { createServer as createViteServer } from "vite";
// 
// const app = express();
// const PORT = 3000;
// app.use(express.json({ limit: "50mb" }));
// 
// async function startServer() {
//   const app = express();
// ...

// Wait, actually I just need to remove the first async function startServer() {
// and its corresponding closing brace.

code = code.replace('async function startServer() {\n  const app = express();\n  const PORT = 3000;\n\n  app.use(express.json({ limit: \'50mb\' }));', 
`const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '50mb' }));`);

// At the end of the file, we have:
//   app.listen(PORT, "0.0.0.0", () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//   });
// }
// 
// if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
//   startServer();
// }

// Let's just find the Vite middleware part and replace it completely down to the end.

const vitePart = code.indexOf('// Vite middleware for development');
if (vitePart !== -1) {
    code = code.substring(0, vitePart) + `// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;
`;
}

// But I need to also clean up the top duplicate lines:
code = code.replace(/const app = express\(\);\nconst PORT = 3000;\napp\.use\(express\.json\(\{ limit: "50mb" \}\)\);\n/, '');

fs.writeFileSync('server.ts', code);
