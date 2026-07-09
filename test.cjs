const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace('export default app;', '');
fs.writeFileSync('server.ts', code);
