const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /res\.status\(500\)\.json\(\{ error: "Failed to fetch YouTube data" \}\);/g,
  'res.status(500).json({ error: "YouTube Error: " + error.message });'
);

code = code.replace(
  /res\.status\(500\)\.json\(\{ error: "Failed to fetch Instagram data" \}\);/g,
  'res.status(500).json({ error: "Instagram Error: " + error.message });'
);

fs.writeFileSync('server.ts', code);
