const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `                              <td className="p-3 border-gray-200 dark:border-white/10 text-center font-mono text-sm text-[#00b300] dark:text-[#00ff00]">
                                {totalSubs > 0 ? \`+\${totalSubs.toLocaleString()}\` : '-'}
                              </td>
                              <td className="p-3 border-r border-gray-200 dark:border-white/10 text-center">-</td>`;

const replacement = `                              <td className="p-3 border-gray-200 dark:border-white/10 text-center font-mono text-sm text-[#00b300] dark:text-[#00ff00]">
                                {totalSubs > 0 ? \`+\${totalSubs.toLocaleString()}\` : '-'}
                              </td>
                              <td className="p-3 border-gray-200 dark:border-white/10 text-center">-</td>
                              <td className="p-3 border-gray-200 dark:border-white/10 text-center">-</td>
                              <td className="p-3 border-gray-200 dark:border-white/10 text-center">-</td>
                              <td className="p-3 border-r border-gray-200 dark:border-white/10 text-center">-</td>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('App.tsx footer patched successfully');
} else {
  console.log('Target not found in App.tsx');
}
