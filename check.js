const fs = require('fs');
const content = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');
let openBraces = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') openBraces++;
  if (content[i] === '}') openBraces--;
}
console.log('Open braces:', openBraces);
