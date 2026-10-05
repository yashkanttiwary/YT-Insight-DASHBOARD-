const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /        return \{\n          channel,\n          currentVids,\n          previousVids,\n          currentViews,\n          previousViews,/g,
  `        return {
          channel,
          currentVids,
          previousVids,
          currentViews,
          previousViews,
          currentUploads,
          previousUploads,`
);

code = code.replace(
  /                        currentViews,\n                        previousViews,/g,
  `                        currentViews,
                        previousViews,
                        currentUploads,
                        previousUploads,`
);

code = code.replace(
  /\{currentVids\.length\}\{" "\}/g,
  `{currentUploads}{" "}`
);

fs.writeFileSync('src/App.tsx', code);
