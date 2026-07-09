const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(/\{notification && \([\s\S]*?<\/div>\s*\)\}/, "");

fs.writeFileSync('src/App.tsx', c);
