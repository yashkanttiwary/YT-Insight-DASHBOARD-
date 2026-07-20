const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');
c = c.replace('\\n  app.get("/api/youtube", async (req, res)', '\n  app.get("/api/youtube", async (req, res)');
fs.writeFileSync('server.ts', c);
