import fs from "fs";
let content = fs.readFileSync("server.ts", "utf8");
content = content.replace(
  `app.use((req, res, next) => {\n  if (!req.url.startsWith("/api/")) {\n    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);\n  }\n  next();\n});`,
  ``
);
fs.writeFileSync("server.ts", content);
