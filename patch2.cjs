const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace colSpan={4} with colSpan={7}
content = content.replace(/colSpan=\{4\}/g, 'colSpan={7}');

// Add table headers
const oldHeaders = `<th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">Est. Subs</th>
                            <th className="p-2 border-b border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">Top Video</th>`;
const newHeaders = `<th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">Est. Subs</th>
                            <th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center" title="Engagement Rate (Likes + Comments) / Views">Eng. Rate</th>
                            <th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center" title="Avg Views Per Hour">Avg VPH</th>
                            <th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">Content Mix</th>
                            <th className="p-2 border-b border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">Top Video</th>`;

content = content.replace(oldHeaders, newHeaders);

fs.writeFileSync(filePath, content);
console.log('App.tsx headers patched successfully');
