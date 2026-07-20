import fs from "fs";
let content = fs.readFileSync("server.ts", "utf8");

content = content.replace(
  `const app = express();`,
  `const app = express();

app.use((req, res, next) => {
  if (!req.url.startsWith("/api/")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  next();
});`
);

fs.writeFileSync("server.ts", content);
