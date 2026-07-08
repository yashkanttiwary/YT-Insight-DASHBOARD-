const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { regex: /bg-\[\#0a0a0a\]/g, replacement: 'bg-gray-50 dark:bg-[#0a0a0a]' },
  { regex: /\btext-white\b/g, replacement: 'text-gray-900 dark:text-white' },
  { regex: /bg-white\/5/g, replacement: 'bg-white dark:bg-white/5' },
  { regex: /border-white\/10/g, replacement: 'border-gray-200 dark:border-white/10' },
  { regex: /border-white\/20/g, replacement: 'border-gray-300 dark:border-white/20' },
  { regex: /border-white\/5/g, replacement: 'border-gray-200 dark:border-white/5' },
  { regex: /bg-black\/50/g, replacement: 'bg-white dark:bg-black/50' },
  { regex: /bg-black\/40/g, replacement: 'bg-white dark:bg-black/40' },
  { regex: /bg-black\/60/g, replacement: 'bg-white dark:bg-black/60' },
  { regex: /bg-black\/80/g, replacement: 'bg-gray-800 dark:bg-black/80' },
  { regex: /text-gray-400/g, replacement: 'text-gray-600 dark:text-gray-400' },
  { regex: /text-gray-300/g, replacement: 'text-gray-700 dark:text-gray-300' },
  { regex: /text-\[\#00ff00\]/g, replacement: 'text-[#00b300] dark:text-[#00ff00]' },
  { regex: /border-\[\#00ff00\]/g, replacement: 'border-[#00b300] dark:border-[#00ff00]' },
  { regex: /bg-\[\#00ff00\]/g, replacement: 'bg-[#00b300] dark:bg-[#00ff00]' },
  { regex: /hover:text-white/g, replacement: 'hover:text-gray-900 dark:hover:text-white' },
  { regex: /text-gray-500 hover:text-gray-300/g, replacement: 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300' },
];

for (const { regex, replacement } of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync('src/App.tsx', content);

let settingsContent = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');
for (const { regex, replacement } of replacements) {
  settingsContent = settingsContent.replace(regex, replacement);
}
fs.writeFileSync('src/components/SettingsPanel.tsx', settingsContent);

console.log('Classes updated');
