const fs = require('fs');

let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

// Ensure import { storage } is there
if (!code.includes('import { storage }')) {
  code = code.replace(/import React, \{ useState, useEffect \} from "react";/, 'import React, { useState, useEffect } from "react";\nimport { storage } from "../lib/storage";');
}

// Remove the broken useEffect that got double-injected:
// const [errorMsg, setErrorMsg] = useState("");
// useEffect(() => { ... }, []);
const brokenEffectStart = code.indexOf('useEffect(() => {\n  async function loadData() {\n    async function loadSettings() {');
if (brokenEffectStart !== -1) {
  const brokenEffectEnd = code.indexOf('}, []);', brokenEffectStart) + 7;
  code = code.substring(0, brokenEffectStart) + code.substring(brokenEffectEnd);
}

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
