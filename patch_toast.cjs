const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /setError\(err\.message \|\| "Failed to fetch data"\);/g,
  'setError(err.message || "Failed to fetch data"); toast.error(err.message || "Failed to fetch data");'
);

fs.writeFileSync('src/App.tsx', code);
