const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const app = express\(\);\nconst PORT = 3000;\napp\.use\(express\.json\(\{ limit: "50mb" \}\)\);\nasync function startServer\(\) \{/, 'async function startServer() {');

code = code.replace('async function startServer() {\n  const app = express();\n  const PORT = 3000;\n  app.use(express.json({ limit: \'50mb\' }));', 
`const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '50mb' }));`);

code = code.replace(/\/\/ Vite middleware for development[\s\S]*startServer\(\);/, 
`// Vite middleware for development
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
`);

fs.writeFileSync('server.ts', code);
