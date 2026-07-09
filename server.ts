import express from "express";
import path from "path";



const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.use(express.json({ limit: '50mb' }));

  // Helper to extract keys either from header (UI settings) or env var
  const getKeys = (req: express.Request) => {
    return {
      youtubeKey: req.headers["x-youtube-key"] || process.env.YOUTUBE_API_KEY,
      youtubeChannels: req.headers["x-youtube-channels"]
        ? JSON.parse(req.headers["x-youtube-channels"] as string)
        : process.env.YOUTUBE_CHANNELS_JSON
        ? JSON.parse(process.env.YOUTUBE_CHANNELS_JSON)
        : null,
      instagramKey: req.headers["x-instagram-key"] || process.env.INSTAGRAM_API_KEY,
      instagramAccounts: req.headers["x-instagram-accounts"]
        ? JSON.parse(req.headers["x-instagram-accounts"] as string)
        : process.env.INSTAGRAM_ACCOUNTS_JSON
        ? JSON.parse(process.env.INSTAGRAM_ACCOUNTS_JSON)
        : null,
    };
  };

  app.get("/api/status", (req, res) => {
    const keys = getKeys(req);
    res.json({
      configured: {
        youtube: !!(keys.youtubeKey && keys.youtubeChannels && keys.youtubeChannels.length > 0),
        instagram: !!(keys.instagramKey && keys.instagramAccounts && keys.instagramAccounts.length > 0),
      },
    });
  });

  app.post("/api/ai-insights", async (req, res) => {
    try {
      const { videos, channels, selectedChannelId } = req.body;
      const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey as string });
      
      let targetChannels = channels;
      let targetVideos = videos;

      if (selectedChannelId && selectedChannelId !== 'all') {
         targetChannels = channels.filter((c: any) => c.id === selectedChannelId);
         targetVideos = videos.filter((v: any) => v.snippet.channelId === selectedChannelId);
      }

      const prompt = `Analyze the following YouTube channel and video data to provide actionable insights for a creator dashboard.
      
      Channel Data: ${JSON.stringify(targetChannels)}
      Recent Videos: ${JSON.stringify(targetVideos?.slice(0, 30))}
      
      Provide a JSON object containing:
      {
         "healthScore": "0-100 score string",
         "healthSummary": "string describing overall channel health",
         "recommendations": [ { "topic": "string", "length": "string", "style": "string", "reasoning": "string" } ],
         "opportunities": [ { "topic": "string", "searchVolume": "High/Medium/Low", "competition": "High/Medium/Low", "alignment": "string" } ],
         "contentGaps": [ { "niche": "string", "description": "string" } ]
      }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      let rawText = response.text || "{}";
      // Strip markdown code blocks if the model wrapped the JSON
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      res.json(JSON.parse(rawText));
    } catch (error: any) {
      console.error("[AI Insights Error]", error.message);
      res.status(500).json({ error: `Failed to generate AI insights: ${error.message}` });
    }
  });

  app.post("/api/ai-analyze-comments", async (req, res) => {
    try {
      const { comments } = req.body;
      const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      }

      if (!comments || comments.length === 0) {
        return res.json({ sentiment: "Neutral", sentimentScore: 50, commonQuestions: [], summary: "No comments to analyze." });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey as string });
      
      const prompt = `Analyze the following top comments from a YouTube video:
      
      ${JSON.stringify(comments)}
      
      Provide a JSON object containing:
      {
         "sentimentScore": "number from 0 to 100",
         "sentiment": "Positive, Negative, or Neutral",
         "summary": "Overall summary of what people are saying, 1-2 sentences",
         "commonQuestions": ["list of string questions asked by viewers"]
      }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      let rawText = response.text || "{}";
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      res.json(JSON.parse(rawText));
    } catch (error: any) {
      console.error("[AI Comments Error]", error.message);
      res.status(500).json({ error: "Failed to generate comment analysis." });
    }
  });

  app.post("/api/youtube-shorts-check", async (req, res) => {
    try {
      const { videoIds } = req.body;
      if (!Array.isArray(videoIds)) return res.status(400).json({ error: "videoIds must be an array" });
      
      const results: Record<string, boolean> = {};
      
      await Promise.all(videoIds.map(async (id) => {
        try {
          const response = await fetch(`https://www.youtube.com/shorts/${id}`, {
            method: 'HEAD',
            redirect: 'manual'
          });
          results[id] = response.status === 200;
        } catch (err) {
          results[id] = false;
        }
      }));
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to check shorts" });
    }
  });

  
  app.get("/api/youtube-competitors", async (req, res) => {
    try {
      const keys = getKeys(req);
      const competitorsStr = req.headers["x-youtube-competitors"];
      const competitors = competitorsStr ? JSON.parse(competitorsStr as string) : [];
      
      if (!keys.youtubeKey || !competitors || competitors.length === 0) {
        return res.json({ channels: [], videos: [] });
      }

      const validIds = [];
      const handles = [];

      for (const c of competitors) {
        let rawId = (c.channel_id || "").trim();
        if (!rawId) continue;
        
        if (rawId.includes('youtube.com/') || rawId.includes('youtu.be/')) {
          const match = rawId.match(/(?:youtube\.com\/(?:@|c\/|user\/|channel\/)|youtu\.be\/)([^/?&]+)/);
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
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${chunk}&key=${keys.youtubeKey}`
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
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${cleanHandle}&key=${keys.youtubeKey}`
        );
        if (handleRes.ok) {
          const data = await handleRes.json();
          if (data.items && data.items.length > 0) {
            channelsDataItems.push(data.items[0]);
          } else {
            const userRes = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forUsername=${cleanHandle}&key=${keys.youtubeKey}`
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
           const display = JSON.parse(displayConfigStr as string);
           if (display.videoLimit) videoLimit = display.videoLimit;
        }
      } catch (e) {}

      let videoIds = [];

      await Promise.all(uploadsPlaylists.map(async (playlistId) => {
        let nextPageToken = "";
        let fetchedCount = 0;
        
        while (fetchedCount < videoLimit) {
          const fetchCount = Math.min(50, videoLimit - fetchedCount);
          const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : "";
          
          const playlistRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${fetchCount}&playlistId=${playlistId}&key=${keys.youtubeKey}${pageTokenParam}`
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
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${keys.youtubeKey}`
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
                  const response = await fetch(`https://www.youtube.com/shorts/${id}`, {
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
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&key=${keys.youtubeKey}`
      );
      if (!commentsRes.ok) {
        throw new Error(`Failed to fetch comments: ${commentsRes.statusText}`);
      }
      const data = await commentsRes.json();
      const comments = data.items?.map((item) => item.snippet.topLevelComment.snippet.textDisplay) || [];
      res.json({ comments });
    } catch (error) {
      console.error("[YouTube Comments API Error]", error.message);
      res.status(500).json({ error: "Failed to fetch YouTube comments" });
    }
  });

  app.get("/api/youtube", async (req, res) => {
    try {
      const keys = getKeys(req);
      if (!keys.youtubeKey || !keys.youtubeChannels || keys.youtubeChannels.length === 0) {
        return res.status(400).json({ error: "YouTube configuration missing" });
      }

      const channelIds = keys.youtubeChannels.map((c: any) => c.channel_id).join(",");
      
      const channelsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelIds}&key=${keys.youtubeKey}`
      );
      
      if (!channelsRes.ok) {
        throw new Error(`YouTube API Error: ${channelsRes.statusText}`);
      }

      const channelsData = await channelsRes.json();
      
      // Fetch videos from uploads playlists
      const uploadsPlaylists = channelsData.items?.map((item: any) => item.contentDetails?.relatedPlaylists?.uploads).filter(Boolean) || [];
      
      let videoLimit = 50;
      try {
        const displayConfigStr = req.headers["x-display-config"] as string;
        if (displayConfigStr) {
           const display = JSON.parse(displayConfigStr as string);
           if (display.videoLimit) videoLimit = display.videoLimit;
        }
      } catch (e) {
        // ignore JSON parse error
      }
      
      let videoIds: string[] = [];
      
      // Fetch playlist items for each channel
      await Promise.all(uploadsPlaylists.map(async (playlistId: string) => {
        let nextPageToken = "";
        let fetchedCount = 0;
        
        while (fetchedCount < videoLimit) {
          const fetchCount = Math.min(50, videoLimit - fetchedCount);
          const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : "";
          
          const playlistRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${fetchCount}&playlistId=${playlistId}&key=${keys.youtubeKey}${pageTokenParam}`
          );
          
          if (!playlistRes.ok) break;
          
          const playlistData = await playlistRes.json();
          const ids = playlistData.items?.map((item: any) => item.contentDetails?.videoId).filter(Boolean) || [];
          videoIds = videoIds.concat(ids);
          fetchedCount += ids.length;
          
          nextPageToken = playlistData.nextPageToken;
          if (!nextPageToken) break;
        }
      }));
      
      let videosData = { items: [] as any[] };
      if (videoIds.length > 0) {
        const chunkedIds = [];
        for (let i = 0; i < videoIds.length; i += 50) {
          chunkedIds.push(videoIds.slice(i, i + 50));
        }
        
        for (const chunk of chunkedIds) {
          const videosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${keys.youtubeKey}`
          );
          if (videosRes.ok) {
            const vData = await videosRes.json();
            videosData.items = videosData.items.concat(vData.items || []);
          }
        }
      }

      if (videosData.items.length > 0) {
         try {
           const ids = videosData.items.map((v: any) => v.id);
           const chunkedIds = [];
           for (let i = 0; i < ids.length; i += 50) {
             chunkedIds.push(ids.slice(i, i + 50));
           }
           
           let shortsMap: Record<string, boolean> = {};
           for (const chunk of chunkedIds) {
              const results: Record<string, boolean> = {};
              await Promise.all(chunk.map(async (id: string) => {
                try {
                  const response = await fetch(`https://www.youtube.com/shorts/${id}`, {
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
           
           videosData.items = videosData.items.map((v: any) => {
             v._isShort = shortsMap[v.id] || false;
             return v;
           });
         } catch (e) {
           console.error("Failed to check shorts", e);
         }
      }

      res.json({
        channels: channelsData.items || [],
        videos: videosData.items || []
      });
    } catch (error: any) {
      console.error("[YouTube API Error]", error.message);
      res.status(500).json({ error: "Failed to fetch YouTube data" });
    }
  });

  app.get("/api/instagram", async (req, res) => {
    try {
      const keys = getKeys(req);
      if (!keys.instagramKey || !keys.instagramAccounts || keys.instagramAccounts.length === 0) {
        return res.status(400).json({ error: "Instagram configuration missing" });
      }

      // Simplified IG fetch for demonstration (using first account)
      // Real app would fetch for all or specific accounts
      const accountId = keys.instagramAccounts[0].business_account_id;
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count,media_count,name,profile_picture_url&access_token=${keys.instagramKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Instagram API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Instagram API Error]", error.message);
      res.status(500).json({ error: "Failed to fetch Instagram data" });
    }
  });

  app.post("/api/ai-categorize-videos", async (req, res) => {
    try {
      const { videos } = req.body;
      const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      }
      if (!videos || videos.length === 0) {
        return res.json({});
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey as string });
      
      const prompt = `Analyze the following YouTube videos (title and tags) and categorize each into a very specific, precise niche or topic (e.g., instead of just "Gaming", use "Minecraft Survival Multiplayer", or instead of "Tech", use "Mechanical Keyboard Reviews"). Keep the category name to 1-4 words.

      Videos:
      ${JSON.stringify(videos.map((v: any) => ({ id: v.id, title: v.title, tags: v.tags })))}
      
      Provide a JSON object mapping the video ID to its specific category:
      {
         "video_id_1": "Specific Category Name",
         "video_id_2": "Another Specific Category"
      }`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      let rawText = response.text || "{}";
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      res.json(JSON.parse(rawText));
    } catch (error: any) {
      console.error("[AI Categorize Error]", error.message);
      res.status(500).json({ error: `Failed to categorize videos: ${error.message}` });
    }
  });

export default app;
