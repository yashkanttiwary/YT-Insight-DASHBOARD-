const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace('export default app;', 'export { app as default };');
fs.writeFileSync('server.ts', code);
