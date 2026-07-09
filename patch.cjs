const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `        const estSubs = Math.round(views * 0.005);
        
        const topVideo = vids.length > 0 ? vids.reduce((prev: any, current: any) => (Number(prev.statistics?.viewCount || 0) > Number(current.statistics?.viewCount || 0)) ? prev : current) : null;

        return { name: p.name, views, shortsViews, longsViews, uploads, shortsUploads, longsUploads, estSubs, videos: vids, topVideo };`;

const replacement = `        const estSubs = Math.round(views * 0.005);
        
        const topVideo = vids.length > 0 ? vids.reduce((prev: any, current: any) => (Number(prev.statistics?.viewCount || 0) > Number(current.statistics?.viewCount || 0)) ? prev : current) : null;

        const likes = vids.reduce((sum: number, v: any) => sum + Number(v.statistics?.likeCount || 0), 0);
        const comments = vids.reduce((sum: number, v: any) => sum + Number(v.statistics?.commentCount || 0), 0);
        const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;
        
        const avgVelocity = vids.length > 0 ? vids.reduce((sum: number, v: any) => {
          const publishedAt = new Date(v.snippet.publishedAt).getTime();
          const nowMs = new Date().getTime();
          const hoursSincePublish = Math.max(1, (nowMs - publishedAt) / (1000 * 60 * 60));
          return sum + (Number(v.statistics?.viewCount || 0) / hoursSincePublish);
        }, 0) / vids.length : 0;

        const typesCount: Record<string, number> = {};
        vids.forEach((v: any) => {
          const title = v.snippet.title.toLowerCase();
          const tags = (v.snippet.tags || []).join(' ').toLowerCase();
          const combined = \`\${title} \${tags}\`;
          
          let type = 'Other';
          if (combined.match(/how to|tutorial|guide|learn|explain|what is/)) type = 'Educational';
          else if (combined.match(/vlog|day in the life|behind the scenes/)) type = 'Vlog';
          else if (combined.match(/review|unboxing|vs|comparison/)) type = 'Review';
          else if (combined.match(/news|update|announcement/)) type = 'News';
          else if (combined.match(/funny|comedy|challenge|prank|reaction/)) type = 'Entertainment';
          else if (combined.match(/podcast|interview|talk/)) type = 'Podcast';
          
          typesCount[type] = (typesCount[type] || 0) + 1;
        });
        
        const topTypes = Object.entries(typesCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([type, count]) => \`\${type}(\${count})\`).join(', ') || '-';

        return { name: p.name, views, shortsViews, longsViews, uploads, shortsUploads, longsUploads, estSubs, videos: vids, topVideo, engagementRate, avgVelocity, topTypes };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content);
  console.log('App.tsx patched successfully');
} else {
  console.log('Target not found in App.tsx');
}
