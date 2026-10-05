const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update Compare Notepad stats calculation
code = code.replace(
  /const previousVids = compareTimeframe === "lifetime" \? \[\] : channelVids\.filter[\s\S]*?const previousViewToSubRatio = Number\(channel\.statistics\.subscriberCount\) > 0 \? \(previousAvgViews \/ Number\(channel\.statistics\.subscriberCount\)\) \* 100 : 0;/g,
  `const previousVids = compareTimeframe === "lifetime" ? [] : channelVids.filter((v: any) => {
          const diff = now - new Date(v.snippet.publishedAt).getTime();
          return diff > currentRangeMs && diff <= previousRangeMs;
        });

        let currentViews = 0;
        let previousViews = 0;
        let currentUploads = 0;
        let previousUploads = 0;
        let currentLikes = 0;
        let previousLikes = 0;
        let currentComments = 0;
        let previousComments = 0;
        
        const channelAgeMs = Math.max(1, now - new Date(channel.snippet.publishedAt).getTime());
        const lifetimeViews = Number(channel.statistics?.viewCount || 0);
        const lifetimeUploads = Number(channel.statistics?.videoCount || 0);
        const dailyViewsAvg = lifetimeViews / (channelAgeMs / (1000 * 60 * 60 * 24));
        const dailyUploadsAvg = lifetimeUploads / (channelAgeMs / (1000 * 60 * 60 * 24));
        
        const earliestFetchedDate = channelVids.length > 0 
          ? new Date(channelVids[channelVids.length - 1].snippet.publishedAt).getTime()
          : now;

        if (compareTimeframe === "lifetime") {
          currentViews = lifetimeViews;
          currentUploads = lifetimeUploads;
          // Approximate likes and comments based on fetched sample ratio
          const fetchedViews = currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0), 0);
          const scale = fetchedViews > 0 && currentViews > fetchedViews ? currentViews / fetchedViews : 1;
          currentLikes = Math.round(currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.likeCount || 0), 0) * scale);
          currentComments = Math.round(currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.commentCount || 0), 0) * scale);
        } else {
          // Current period
          const exactCurrentViews = currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0), 0);
          const exactCurrentUploads = currentVids.length;
          const currentStart = now - currentRangeMs;
          if (earliestFetchedDate > currentStart) {
            const missingDays = Math.max(0, (earliestFetchedDate - currentStart) / (1000 * 60 * 60 * 24));
            currentViews = Math.round(exactCurrentViews + missingDays * dailyViewsAvg);
            currentUploads = Math.round(exactCurrentUploads + missingDays * dailyUploadsAvg);
          } else {
            currentViews = exactCurrentViews;
            currentUploads = exactCurrentUploads;
          }
          currentLikes = currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.likeCount || 0), 0);
          currentComments = currentVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.commentCount || 0), 0);
          
          // Previous period
          const exactPreviousViews = previousVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0), 0);
          const exactPreviousUploads = previousVids.length;
          const previousStart = now - previousRangeMs;
          if (earliestFetchedDate > previousStart) {
            const missingDays = Math.max(0, (Math.min(earliestFetchedDate, currentStart) - previousStart) / (1000 * 60 * 60 * 24));
            previousViews = Math.round(exactPreviousViews + missingDays * dailyViewsAvg);
            previousUploads = Math.round(exactPreviousUploads + missingDays * dailyUploadsAvg);
          } else {
            previousViews = exactPreviousViews;
            previousUploads = exactPreviousUploads;
          }
          previousLikes = previousVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.likeCount || 0), 0);
          previousComments = previousVids.reduce((sum: number, v: any) => sum + Number(v.statistics?.commentCount || 0), 0);
        }

        const currentShortsCount = currentVids.filter(
          (v: any) => v._isShort,
        ).length;
        const currentLongsCount = currentVids.length - currentShortsCount;

        const currentShortsViews = currentVids
          .filter((v: any) => v._isShort)
          .reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );
        const currentLongsViews = currentViews - currentShortsViews;

        const currentEngagement =
          Number(currentViews) > 0
            ? ((Number(currentLikes) + Number(currentComments)) /
                Number(currentViews)) *
              100
            : 0;
        const previousEngagement =
          Number(previousViews) > 0
            ? ((Number(previousLikes) + Number(previousComments)) /
                Number(previousViews)) *
              100
            : 0;

        const currentAvgViews = currentUploads > 0 ? currentViews / currentUploads : 0;
        const currentViewToSubRatio = Number(channel.statistics?.subscriberCount) > 0 ? (currentAvgViews / Number(channel.statistics.subscriberCount)) * 100 : 0;
        const previousAvgViews = previousUploads > 0 ? previousViews / previousUploads : 0;
        const previousViewToSubRatio = Number(channel.statistics?.subscriberCount) > 0 ? (previousAvgViews / Number(channel.statistics.subscriberCount)) * 100 : 0;`
);

fs.writeFileSync('src/App.tsx', code);
