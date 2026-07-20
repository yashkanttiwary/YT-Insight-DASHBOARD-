const fs = require('fs');

let code = fs.readFileSync('src/main.tsx', 'utf8');
code = code.replace(/import \{ Toaster \} from 'react-hot-toast';/, "import { Toaster } from 'react-hot-toast';\nimport { storage } from './lib/storage';");

code = code.replace(/try \{\n  const displayConfigStr = localStorage\.getItem\("f1_displayConfig"\);[^]*?\}\n\ncreateRoot/m, `
async function initTheme() {
  try {
    const displayConfigStr = await storage.get("f1_displayConfig");
    if (displayConfigStr) {
      const displayConfig = JSON.parse(displayConfigStr);
      if (displayConfig.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (displayConfig.theme === 'light') {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.add('dark'); // default
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
}
initTheme();

createRoot`);

fs.writeFileSync('src/main.tsx', code);
