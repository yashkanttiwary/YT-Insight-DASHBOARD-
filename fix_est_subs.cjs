const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const estSubs = Math\.round\(views \* 0\.005\);/g,
  `          let estSubs = 0;
          if (p.name === "Lifetime") {
            estSubs = Number(channel.statistics?.subscriberCount) || 0;
          } else {
            const totalSubs = Number(channel.statistics?.subscriberCount) || 0;
            const totalViews = Number(channel.statistics?.viewCount) || 1;
            estSubs = Math.round((views / totalViews) * totalSubs);
          }`
);

fs.writeFileSync('src/App.tsx', code);
