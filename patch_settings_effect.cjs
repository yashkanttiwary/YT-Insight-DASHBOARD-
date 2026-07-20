const fs = require('fs');

let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

// The file still uses localStorage inside the useEffect!
code = code.replace(/localStorage\.getItem\(/g, 'await storage.get(');
code = code.replace(/useEffect\(\(\) => \{/g, 'useEffect(() => {\n  async function loadData() {');
code = code.replace(/if \(isOpen\) \{/g, 'if (isOpen) {');
code = code.replace(/setYoutubeKey\(await storage\.get\("f1_youtubeKey"\) \|\| ""\);/g, 'setYoutubeKey((await storage.get("f1_youtubeKey")) || "");');
code = code.replace(/setInstagramKey\(await storage\.get\("f1_instagramKey"\) \|\| ""\);/g, 'setInstagramKey((await storage.get("f1_instagramKey")) || "");');
code = code.replace(/setGeminiKey\(await storage\.get\("f1_geminiKey"\) \|\| ""\);/g, 'setGeminiKey((await storage.get("f1_geminiKey")) || "");');

// Because useEffect callback can't be async, we added loadData. Now call it at the end of useEffect
code = code.replace(/  \}, \[isOpen\]\);/g, '  }\n  loadData();\n  }, [isOpen]);');

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
