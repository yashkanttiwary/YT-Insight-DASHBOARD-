const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /\{error \? "API ERROR" : isLoading \? "SYNCING" : "LOCAL TEST MODE"\}/g,
  '{error ? (error.includes("Error:") ? error : "API ERROR") : isLoading ? "SYNCING" : "LOCAL TEST MODE"}'
);

fs.writeFileSync('src/App.tsx', code);
