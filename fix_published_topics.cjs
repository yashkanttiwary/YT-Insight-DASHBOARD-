const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /Published Topics \(\{currentUploads\}\)/g,
  `Published Topics ({currentVids.length})`
);

fs.writeFileSync('src/App.tsx', code);
