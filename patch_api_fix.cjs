const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/api.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\\`Server error \\\$\\{res\\.status\\}: \\\$\\{res\\.statusText\\}\\`/g, '`Server error ${res.status}: ${res.statusText}`');

fs.writeFileSync(filePath, content);
