import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      const { videos, channels } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze the following YouTube channel and video data to provide actionable insights for a creator dashboard.
      
      Channel Data: ${JSON.stringify(channels)}
      Recent Videos: ${JSON.stringify(videos?.slice(0, 30))}
      
      Provide a JSON object containing:
      {
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
      res.status(500).json({ error: "Failed to generate AI insights. Please make sure the GEMINI_API_KEY is valid." });
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
           const display = JSON.parse(displayConfigStr);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
