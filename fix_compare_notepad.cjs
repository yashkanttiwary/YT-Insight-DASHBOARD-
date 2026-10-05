const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /        const currentShortsCount = currentVids\.filter\([\s\S]*?        const currentLongsViews = currentViews - currentShortsViews;/g,
  `        const exactCurrentViews = currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0), 0);
        let currentShortsCount = currentVids.filter((v: any) => v._isShort).length;
        let currentLongsCount = currentVids.length - currentShortsCount;

        let currentShortsViews = currentVids
          .filter((v: any) => v._isShort)
          .reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );
        
        if (exactCurrentViews > 0 && currentViews > exactCurrentViews) {
           const scale = currentViews / exactCurrentViews;
           currentShortsViews = Math.round(currentShortsViews * scale);
           
           const exactUploads = currentVids.length;
           const scaleUploads = exactUploads > 0 ? currentUploads / exactUploads : 1;
           currentShortsCount = Math.round(currentShortsCount * scaleUploads);
           currentLongsCount = currentUploads - currentShortsCount;
        } else if (compareTimeframe === "lifetime") {
           // Use approximate ratios for lifetime
           const scale = exactCurrentViews > 0 ? currentViews / exactCurrentViews : 1;
           currentShortsViews = Math.round(currentShortsViews * scale);
           
           const exactUploads = currentVids.length;
           const scaleUploads = exactUploads > 0 ? currentUploads / exactUploads : 1;
           currentShortsCount = Math.round(currentShortsCount * scaleUploads);
           currentLongsCount = currentUploads - currentShortsCount;
        }
        
        const currentLongsViews = currentViews - currentShortsViews;`
);

fs.writeFileSync('src/App.tsx', code);
