const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update Historical Report table stats calculation
code = code.replace(
  /          const views = vids\.reduce\([\s\S]*?            vids\.length > 0/g,
  `
          let views = vids.reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );
          
          let uploads = vids.length;

          const channelAgeMs = Math.max(1, Date.now() - new Date(channel.snippet.publishedAt).getTime());
          const lifetimeViews = Number(channel.statistics?.viewCount || 0);
          const lifetimeUploads = Number(channel.statistics?.videoCount || 0);
          const dailyViewsAvg = lifetimeViews / (channelAgeMs / (1000 * 60 * 60 * 24));
          const dailyUploadsAvg = lifetimeUploads / (channelAgeMs / (1000 * 60 * 60 * 24));
          
          const earliestFetchedDate = channelVideos.length > 0 
            ? new Date(channelVideos[channelVideos.length - 1].snippet.publishedAt).getTime()
            : Date.now();

          if (p.name === "Lifetime") {
             views = lifetimeViews;
             uploads = lifetimeUploads;
          } else {
             if (earliestFetchedDate > p.start.getTime()) {
                const missingStart = p.start.getTime();
                const missingEnd = Math.min(p.end.getTime(), earliestFetchedDate);
                const missingDays = Math.max(0, (missingEnd - missingStart) / (1000 * 60 * 60 * 24));
                
                views = Math.round(views + missingDays * dailyViewsAvg);
                uploads = Math.round(uploads + missingDays * dailyUploadsAvg);
             }
          }

          const shortsViews = shorts.reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );
          const longsViews = longs.reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );
          const shortsUploads = shorts.length;
          const longsUploads = longs.length;

          const estSubs = Math.round(views * 0.005);
          
          const avgViews = uploads > 0 ? views / uploads : 0;
          const subs = Number(channel.statistics?.subscriberCount) || 1;
          const viewToSubRatio = (avgViews / subs) * 100;

          const topVideo =
            vids.length > 0`
);

fs.writeFileSync('src/App.tsx', code);
