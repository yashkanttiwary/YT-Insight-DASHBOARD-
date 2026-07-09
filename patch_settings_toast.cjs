const fs = require('fs');
let c = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

if (!c.includes('import toast')) {
  c = `import toast from 'react-hot-toast';\n` + c;
}

c = c.replace(/onSave\(\);/g, "onSave();\n    toast.success('Configuration saved successfully');");

fs.writeFileSync('src/components/SettingsPanel.tsx', c);
