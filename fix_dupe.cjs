const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const exactCurrentViews = currentVids\.reduce\(\(sum: number, v: any\) => sum \+ Number\(v\.statistics\?\.viewCount \|\| 0\), 0\);\n        let currentShortsCount/g,
  `const exactCurrentViewsForRatios = currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0), 0);
        let currentShortsCount`
);
code = code.replace(/exactCurrentViews > 0 && currentViews > exactCurrentViews/g, 'exactCurrentViewsForRatios > 0 && currentViews > exactCurrentViewsForRatios');
code = code.replace(/scale = currentViews \/ exactCurrentViews;/g, 'scale = currentViews / exactCurrentViewsForRatios;');
code = code.replace(/exactCurrentViews > 0 \? currentViews \/ exactCurrentViews : 1/g, 'exactCurrentViewsForRatios > 0 ? currentViews / exactCurrentViewsForRatios : 1');

fs.writeFileSync('src/App.tsx', code);
