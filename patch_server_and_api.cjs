const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.ts');
let serverContent = fs.readFileSync(serverFile, 'utf8');

// We need to add /api/youtube-competitors and /api/youtube-comments

const competitorsEndpoint = `
  app.get("/api/youtube-competitors", async (req, res) => {
    try {
      const keys = getKeys(req);
      const competitorsStr = req.headers["x-youtube-competitors"];
      const competitors = competitorsStr ? JSON.parse(competitorsStr) : [];
      
      if (!keys.youtubeKey || !competitors || competitors.length === 0) {
        return res.json({ channels: [], videos: [] });
      }

      const validIds = [];
      const handles = [];

      for (const c of competitors) {
        let rawId = (c.channel_id || "").trim();
        if (!rawId) continue;
        
        if (rawId.includes('youtube.com/') || rawId.includes('youtu.be/')) {
          const match = rawId.match(/(?:youtube\\.com\\/(?:@|c\\/|user\\/|channel\\/)|youtu\\.be\\/)([^/?&]+)/);
          if (match) {
            if (rawId.includes('/channel/')) {
              rawId = match[1];
            } else if (rawId.includes('/@') || rawId.includes('.com/@')) {
              rawId = '@' + match[1];
            } else {
              rawId = match[1];
               if (!rawId.startsWith('UC') && !rawId.startsWith('@')) {
                rawId = '@' + rawId;
              }
            }
          }
        }

        if (rawId.startsWith("@")) {
          handles.push(rawId);
        } else {
          validIds.push(rawId);
        }
      }

      let channelsDataItems = [];

      if (validIds.length > 0) {
        for (let i = 0; i < validIds.length; i += 50) {
          const chunk = validIds.slice(i, i + 50).join(",");
          const channelsRes = await fetch(
            \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=\${chunk}&key=\${keys.youtubeKey}\`
          );
          if (channelsRes.ok) {
            const data = await channelsRes.json();
            if (data.items) {
              channelsDataItems = channelsDataItems.concat(data.items);
            }
          }
        }
      }

      for (const handle of handles) {
        const cleanHandle = handle.replace("@", "");
        const handleRes = await fetch(
          \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=\${cleanHandle}&key=\${keys.youtubeKey}\`
        );
        if (handleRes.ok) {
          const data = await handleRes.json();
          if (data.items && data.items.length > 0) {
            channelsDataItems.push(data.items[0]);
          } else {
            const userRes = await fetch(
              \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forUsername=\${cleanHandle}&key=\${keys.youtubeKey}\`
            );
            if (userRes.ok) {
               const uData = await userRes.json();
               if (uData.items && uData.items.length > 0) {
                 channelsDataItems.push(uData.items[0]);
               }
            }
          }
        }
      }

      const uploadsPlaylists = channelsDataItems.map((item) => item.contentDetails?.relatedPlaylists?.uploads).filter(Boolean) || [];
      
      let videoLimit = 50;
      try {
        const displayConfigStr = req.headers["x-display-config"];
        if (displayConfigStr) {
           const display = JSON.parse(displayConfigStr);
           if (display.videoLimit) videoLimit = display.videoLimit;
        }
      } catch (e) {}

      let videoIds = [];

      await Promise.all(uploadsPlaylists.map(async (playlistId) => {
        let nextPageToken = "";
        let fetchedCount = 0;
        
        while (fetchedCount < videoLimit) {
          const fetchCount = Math.min(50, videoLimit - fetchedCount);
          const pageTokenParam = nextPageToken ? \`&pageToken=\${nextPageToken}\` : "";
          
          const playlistRes = await fetch(
            \`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=\${fetchCount}&playlistId=\${playlistId}&key=\${keys.youtubeKey}\${pageTokenParam}\`
          );
          
          if (!playlistRes.ok) break;
          
          const playlistData = await playlistRes.json();
          const ids = playlistData.items?.map((item) => item.contentDetails?.videoId).filter(Boolean) || [];
          videoIds = videoIds.concat(ids);
          fetchedCount += ids.length;
          
          nextPageToken = playlistData.nextPageToken;
          if (!nextPageToken) break;
        }
      }));

      let videosData = { items: [] };

      if (videoIds.length > 0) {
        const chunkedIds = [];
        for (let i = 0; i < videoIds.length; i += 50) {
          chunkedIds.push(videoIds.slice(i, i + 50));
        }
        
        for (const chunk of chunkedIds) {
          const videosRes = await fetch(
            \`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=\${chunk.join(',')}&key=\${keys.youtubeKey}\`
          );
          if (videosRes.ok) {
            const vData = await videosRes.json();
            videosData.items = videosData.items.concat(vData.items || []);
          }
        }
      }

      if (videosData.items.length > 0) {
         try {
           const ids = videosData.items.map((v) => v.id);
           const chunkedIds = [];
           for (let i = 0; i < ids.length; i += 50) {
             chunkedIds.push(ids.slice(i, i + 50));
           }
           
           let shortsMap = {};
           for (const chunk of chunkedIds) {
              const results = {};
              await Promise.all(chunk.map(async (id) => {
                try {
                  const response = await fetch(\`https://www.youtube.com/shorts/\${id}\`, {
                    method: 'HEAD',
                    redirect: 'manual'
                  });
                  results[id] = response.status === 200;
                } catch (err) {
                  results[id] = false;
                }
              }));
              shortsMap = { ...shortsMap, ...results };
           }
           
           videosData.items = videosData.items.map((v) => {
             v._isShort = shortsMap[v.id] || false;
             return v;
           });
         } catch (e) {
           console.error("Failed to check shorts", e);
         }
      }

      res.json({
        channels: channelsDataItems || [],
        videos: videosData.items || []
      });
    } catch (error) {
      console.error("[YouTube Competitors API Error]", error.message);
      res.status(500).json({ error: "Failed to fetch YouTube competitors data" });
    }
  });

  app.get("/api/youtube-comments", async (req, res) => {
    try {
      const keys = getKeys(req);
      const videoId = req.query.videoId;
      if (!keys.youtubeKey || !videoId) {
        return res.status(400).json({ error: "Missing YouTube Key or videoId" });
      }
      
      const commentsRes = await fetch(
        \`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=\${videoId}&maxResults=100&key=\${keys.youtubeKey}\`
      );
      if (!commentsRes.ok) {
        throw new Error(\`Failed to fetch comments: \${commentsRes.statusText}\`);
      }
      const data = await commentsRes.json();
      const comments = data.items?.map((item) => item.snippet.topLevelComment.snippet.textDisplay) || [];
      res.json({ comments });
    } catch (error) {
      console.error("[YouTube Comments API Error]", error.message);
      res.status(500).json({ error: "Failed to fetch YouTube comments" });
    }
  });
`;

if (!serverContent.includes("/api/youtube-competitors")) {
  serverContent = serverContent.replace('app.get("/api/youtube",', competitorsEndpoint + '\\n  app.get("/api/youtube",');
  fs.writeFileSync(serverFile, serverContent);
  console.log('server.ts patched with new endpoints');
} else {
  console.log('server.ts already has new endpoints');
}
