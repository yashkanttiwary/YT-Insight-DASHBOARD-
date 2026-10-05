const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /if \(videosData\.items\.length > 0\) \{\s*try \{\s*\/\/ Only HEAD check potential Shorts[\s\S]*?console\.error\("Failed to check shorts", e\);\s*\}\s*\}/;

const replacement = `if (videosData.items.length > 0) {
         try {
           videosData.items = videosData.items.map((v: any) => {
             const durationSec = durationToSeconds(v.contentDetails?.duration || "");
             v._isShort = durationSec > 0 && durationSec <= 60;
             return v;
           });
         } catch (e) {
           console.error("Failed to check shorts", e);
         }
      }`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
