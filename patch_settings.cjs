const fs = require('fs');

let settingsCode = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

settingsCode = settingsCode.replace(/import React, \{ useState \} from "react";/g, 'import React, { useState, useEffect } from "react";\nimport { storage } from "../lib/storage";');

// Replace synchronous getItems with async load
const initCode = `
  useEffect(() => {
    async function loadSettings() {
      setYoutubeKey((await storage.get("f1_youtubeKey")) || "");
      const yt = await storage.get("f1_youtubeChannels");
      if (yt) setYoutubeChannels(JSON.parse(yt));
      const ytc = await storage.get("f1_youtubeCompetitors");
      if (ytc) setYouTubeCompetitors(JSON.parse(ytc));
      setInstagramKey((await storage.get("f1_instagramKey")) || "");
      const ig = await storage.get("f1_instagramAccounts");
      if (ig) setInstagramAccounts(JSON.parse(ig));
      setGeminiKey((await storage.get("f1_geminiKey")) || "");
      const display = await storage.get("f1_displayConfig");
      if (display) setDisplayConfig(JSON.parse(display));
    }
    loadSettings();
  }, []);
`;

// we can just strip the old init logic and use the effect.
// Let's replace the useState initializers.
settingsCode = settingsCode.replace(/useState<string>\(\(\) => \{[^]*?\}\);/g, 'useState<string>("");');
settingsCode = settingsCode.replace(/useState<any\[\]>\(\(\) => \{[^]*?\}\);/g, 'useState<any[]>([]);');
settingsCode = settingsCode.replace(/useState<any>\(\(\) => \{[^]*?\}\);/g, 'useState<any>({});');

// Replace `localStorage.setItem` in `handleSave`
settingsCode = settingsCode.replace(/localStorage\.setItem\(/g, 'await storage.set(');

// Add the useEffect inside the component body, e.g. after `const [errorMsg, setErrorMsg] = useState("");`
settingsCode = settingsCode.replace(/const \[errorMsg, setErrorMsg\] = useState\(""\);/g, `const [errorMsg, setErrorMsg] = useState("");\n${initCode}`);

// Make handleSave async
settingsCode = settingsCode.replace(/const handleSave = \(\) => \{/g, 'const handleSave = async () => {');

fs.writeFileSync('src/components/SettingsPanel.tsx', settingsCode);
