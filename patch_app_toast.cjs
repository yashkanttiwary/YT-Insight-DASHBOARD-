const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = `import toast from 'react-hot-toast';\n` + c;

c = c.replace(/const saveConfig = \(\) => \{([^}]+)\};/m, (match, body) => {
  if (body.includes('localStorage.setItem')) {
     return `const saveConfig = () => {${body}  toast.success('Configuration saved successfully');\n};`;
  }
  return match;
});

c = c.replace(/const handleGetInsights = async \(\) => \{[\s\S]*?finally \{/m, (match) => {
  return match.replace(/setAiInsights\(data\);/g, "setAiInsights(data);\n      toast.success('AI insights generated successfully');");
});

c = c.replace(/const refreshData = async \(\) => \{[\s\S]*?finally \{/m, (match) => {
  return match.replace(/setYoutubeData\(ytData\);/g, "setYoutubeData(ytData);\n      toast.success('Dashboard data refreshed successfully');");
});

fs.writeFileSync('src/App.tsx', c);
