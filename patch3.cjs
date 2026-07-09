const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `<td className="p-3 border-b border-gray-200 dark:border-white/10 text-center font-mono text-sm font-bold text-[#00b300] dark:text-[#00ff00]">
                                {p.estSubs > 0 ? \`+\${p.estSubs.toLocaleString()}\` : '-'}
                              </td>`;

const replacement = `<td className="p-3 border-b border-gray-200 dark:border-white/10 text-center font-mono text-sm font-bold text-[#00b300] dark:text-[#00ff00]">
                                {p.estSubs > 0 ? \`+\${p.estSubs.toLocaleString()}\` : '-'}
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className="font-mono text-xs">{p.engagementRate > 0 ? p.engagementRate.toFixed(2) + '%' : '-'}</div>
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className="font-mono text-xs">{p.avgVelocity > 0 ? p.avgVelocity.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}</div>
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-500 text-[10px]">
                                {p.topTypes || '-'}
                              </td>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('App.tsx tds patched successfully');
} else {
  console.log('Target not found in App.tsx');
}
