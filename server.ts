import { GoogleGenAI } from "@google/genai";
import express from "express";
import path from "path";
import fs from "fs";

const app = express();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.use(express.json({ limit: '50mb' }));

const ID_STORAGE_FILE = path.join(process.cwd(), "id_videos_store.json");
const YT_CACHE_FILE = path.join(process.cwd(), "youtube_cache_store.json");

// In-memory + disk persistent stores
let serverYouTubeCache = new Map<string, any>();
let serverVideoIdCache = new Map<string, any>();
let serverChannelCache = new Map<string, any>();
let serverIdVideosStore: { idVideos: any[]; hydratedVideos: any[]; lastSaved: string } = {
  idVideos: [],
  hydratedVideos: [],
  lastSaved: "",
};

// Load existing disk caches on startup
try {
  if (fs.existsSync(ID_STORAGE_FILE)) {
    const raw = fs.readFileSync(ID_STORAGE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.idVideos)) {
      serverIdVideosStore = parsed;
      console.log(`[Storage] Loaded ${serverIdVideosStore.idVideos.length} ID videos and ${serverIdVideosStore.hydratedVideos?.length || 0} hydrated items from disk.`);
    }
  }
} catch (e) {
  console.warn("Could not read ID storage file from disk", e);
}

try {
  if (fs.existsSync(YT_CACHE_FILE)) {
    const raw = fs.readFileSync(YT_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.channelsCache) {
      serverYouTubeCache = new Map(Object.entries(parsed.channelsCache));
    }
    if (parsed?.videoIdsCache) {
      serverVideoIdCache = new Map(Object.entries(parsed.videoIdsCache));
    }
    if (parsed?.channelMetadataCache) {
      serverChannelCache = new Map(Object.entries(parsed.channelMetadataCache));
    }
    console.log(`[Storage] Loaded ${serverVideoIdCache.size} video IDs cache and ${serverChannelCache.size} channels cache from disk.`);
  }
} catch (e) {
  console.warn("Could not read YouTube cache file from disk", e);
}

function persistIdVideosToDisk() {
  try {
    const tmp = ID_STORAGE_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(serverIdVideosStore), "utf-8");
    fs.renameSync(tmp, ID_STORAGE_FILE);
  } catch (e) {
    console.error("Failed to write ID storage to disk", e);
  }
}

function persistYtCacheToDisk() {
  try {
    const payload = {
      channelsCache: Object.fromEntries(serverYouTubeCache),
      videoIdsCache: Object.fromEntries(serverVideoIdCache),
      channelMetadataCache: Object.fromEntries(serverChannelCache),
    };
    const tmp = YT_CACHE_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(payload), "utf-8");
    fs.renameSync(tmp, YT_CACHE_FILE);
  } catch (e) {
    console.error("Failed to write YouTube cache to disk", e);
  }
}

  // Helper to extract keys either from header (UI settings) or env var
  const safeParse = (str: string | undefined | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error("JSON Parse error for", str);
      return null;
    }
  };

  const getKeys = (req: express.Request) => {
    const parseHeader = (header: string | string[] | undefined) => {
      if (!header || header === "[]") return null;
      const str = header as string;
      try {
        return JSON.parse(decodeURIComponent(str));
      } catch (e) {
        return safeParse(str);
      }
    };

    return {
      youtubeKey: req.body?.youtubeKey || req.headers["x-youtube-key"] || process.env.YOUTUBE_API_KEY,
      youtubeChannels: (req.body?.youtubeChannels && req.body.youtubeChannels.length > 0)
        ? req.body.youtubeChannels
        : parseHeader(req.headers["x-youtube-channels"]) || safeParse(process.env.YOUTUBE_CHANNELS_JSON),
      instagramKey: req.body?.instagramKey || req.headers["x-instagram-key"] || process.env.INSTAGRAM_API_KEY,
      instagramAccounts: (req.body?.instagramAccounts && req.body.instagramAccounts.length > 0)
        ? req.body.instagramAccounts
        : parseHeader(req.headers["x-instagram-accounts"]) || safeParse(process.env.INSTAGRAM_ACCOUNTS_JSON),
    };
  };

  app.all("/api/status", (req, res) => {
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
      const geminiKey = req.body?.geminiKey || req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      }
      
      
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
      const geminiKey = req.body?.geminiKey || req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      }

      if (!comments || comments.length === 0) {
        return res.json({ sentiment: "Neutral", sentimentScore: 50, commonQuestions: [], summary: "No comments to analyze." });
      }
      
      
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

  
  // Helper to convert ISO 8601 duration to seconds
  function durationToSeconds(durationStr: string): number {
    if (!durationStr) return 0;
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Robust helper to resolve YouTube channels from IDs or Handles/URLs in chunks
  async function resolveChannels(channelsList: any[], apiKey: string): Promise<any[]> {
    const validIds: string[] = [];
    const handles: string[] = [];

    for (const c of channelsList) {
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

    const initialChannels: any[] = [];
    if (validIds.length > 0) {
      for (let i = 0; i < validIds.length; i += 50) {
        const chunk = validIds.slice(i, i + 50).join(",");
        try {
          const channelsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${chunk}&key=${apiKey}`
          );
          if (channelsRes.ok) {
            const data = await channelsRes.json();
            if (data.items) {
              initialChannels.push(...data.items);
            }
          }
        } catch (e) {
          console.error(`Failed to fetch channel IDs chunk: ${chunk}`, e);
        }
      }
    }

    const resolvedHandles = await Promise.all(handles.map(async (handle) => {
      const cleanHandle = handle.replace("@", "");
      try {
        const handleRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${cleanHandle}&key=${apiKey}`
        );
        if (handleRes.ok) {
          const data = await handleRes.json();
          if (data.items && data.items.length > 0) {
            return data.items[0];
          }
        }
        
        const userRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forUsername=${cleanHandle}&key=${apiKey}`
        );
        if (userRes.ok) {
          const uData = await userRes.json();
          if (uData.items && uData.items.length > 0) {
            return uData.items[0];
          }
        }
      } catch (e) {
        console.error(`Failed to resolve handle ${handle}`, e);
      }
      return null;
    }));

    return initialChannels.concat(resolvedHandles.filter(Boolean));
  }

  app.all("/api/youtube-competitors", async (req, res) => {
    try {
      const keys = getKeys(req);
      const competitorsStr = req.headers["x-youtube-competitors"];
      let competitors = req.body?.youtubeCompetitors || [];
      if (competitors.length === 0 && competitorsStr) {
        try {
          competitors = JSON.parse(decodeURIComponent(competitorsStr as string));
        } catch (e) {
          competitors = JSON.parse(competitorsStr as string);
        }
      }
      
      if (!keys.youtubeKey || !competitors || competitors.length === 0) {
        return res.json({ channels: [], videos: [] });
      }

      const channelsDataItems = await resolveChannels(competitors, keys.youtubeKey);

      const uploadsPlaylists = channelsDataItems.map((item) => item.contentDetails?.relatedPlaylists?.uploads).filter(Boolean) || [];
      
      let videoLimit = 50;
      try {
        const displayConfigStr = req.headers["x-display-config"];
        if (req.body?.displayConfig) {
           if (req.body.displayConfig.videoLimit) videoLimit = req.body.displayConfig.videoLimit;
        } else if (displayConfigStr) {
           let display: any;
           try {
             display = JSON.parse(decodeURIComponent(displayConfigStr as string));
           } catch(e) {
             display = JSON.parse(displayConfigStr as string);
           }
           if (display.videoLimit) videoLimit = display.videoLimit;
        }
      } catch (e) {}

      // Fetch playlist items for each channel safely (no race conditions!)
      const playlistResults = await Promise.all(uploadsPlaylists.map(async (playlistId) => {
        try {
          let nextPageToken = "";
          let fetchedCount = 0;
          const channelVideoIds: string[] = [];
          
          while (fetchedCount < videoLimit) {
            const fetchCount = Math.min(50, videoLimit - fetchedCount);
            const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : "";
            
            const playlistRes = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${fetchCount}&playlistId=${playlistId}&key=${keys.youtubeKey}${pageTokenParam}`
            );
            
            if (!playlistRes.ok) break;
            
            const playlistData = await playlistRes.json();
            const ids = playlistData.items?.map((item: any) => item.contentDetails?.videoId).filter(Boolean) || [];
            channelVideoIds.push(...ids);
            fetchedCount += ids.length;
            
            nextPageToken = playlistData.nextPageToken;
            if (!nextPageToken) break;
          }
          return channelVideoIds;
        } catch (err) {
          console.error(`Error fetching playlist items for ${playlistId}`, err);
          return [];
        }
      }));

      const videoIds = playlistResults.flat();

      let videosData = { items: [] as any[] };

      if (videoIds.length > 0) {
        const chunkedIds = [];
        for (let i = 0; i < videoIds.length; i += 50) {
          chunkedIds.push(videoIds.slice(i, i + 50));
        }
        
        // Fetch chunks concurrently for faster performance
        const chunkResults = await Promise.all(chunkedIds.map(async (chunk) => {
          try {
            const videosRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${keys.youtubeKey}`
            );
            if (videosRes.ok) {
              const vData = await videosRes.json();
              return vData.items || [];
            }
          } catch (e) {
            console.error("Failed to fetch video details chunk", e);
          }
          return [];
        }));
        
        videosData.items = chunkResults.flat();
      }

      if (videosData.items.length > 0) {
         try {
           videosData.items = videosData.items.map((v: any) => {
             const durationSec = durationToSeconds(v.contentDetails?.duration || "");
             v._isShort = durationSec > 0 && durationSec <= 60;
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
    } catch (error: any) {
      console.error("[YouTube Competitors API Error]", error.message);
      res.status(500).json({ error: "Failed to fetch YouTube competitors data" });
    }
  });

  app.all("/api/youtube-comments", async (req, res) => {
    try {
      const keys = getKeys(req);
      const videoId = req.body?.videoId || req.query.videoId;
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

  app.all("/api/youtube", async (req, res) => {
    try {
      const keys = getKeys(req);
      if (!keys.youtubeKey || !keys.youtubeChannels || keys.youtubeChannels.length === 0) {
        return res.status(400).json({ error: "YouTube configuration missing" });
      }

      let videoLimit = 50;
      try {
        const displayConfigStr = req.headers["x-display-config"] as string;
        if (req.body?.displayConfig) {
           if (req.body.displayConfig.videoLimit) videoLimit = req.body.displayConfig.videoLimit;
        } else if (displayConfigStr) {
           let display: any;
           try {
             display = JSON.parse(decodeURIComponent(displayConfigStr));
           } catch (e) {
             display = JSON.parse(displayConfigStr);
           }
           if (display.videoLimit) videoLimit = display.videoLimit;
        }
      } catch (e) {
        // ignore JSON parse error
      }

      const forceRefresh = req.query.force === "true" || req.headers["x-force-refresh"] === "true" || req.body?.forceRefresh === true;
      const cacheKey = JSON.stringify(keys.youtubeChannels) + `_${videoLimit}`;
      const cached = serverYouTubeCache.get(cacheKey);

      // User instruction: Until user explicitly tells to refresh or delete, do NOT discard old fetch data!
      if (!forceRefresh && cached) {
        return res.json(cached);
      }

      const channelsDataItems = await resolveChannels(keys.youtubeChannels, keys.youtubeKey);
      
      // Fetch videos from uploads playlists
      const uploadsPlaylists = channelsDataItems.map((item: any) => item.contentDetails?.relatedPlaylists?.uploads).filter(Boolean) || [];
      
      // Fetch playlist items for each channel safely (no race conditions!)
      const playlistResults = await Promise.all(uploadsPlaylists.map(async (playlistId: string) => {
        try {
          let nextPageToken = "";
          let fetchedCount = 0;
          const channelVideoIds: string[] = [];
          
          while (fetchedCount < videoLimit) {
            const fetchCount = Math.min(50, videoLimit - fetchedCount);
            const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : "";
            
            const playlistRes = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${fetchCount}&playlistId=${playlistId}&key=${keys.youtubeKey}${pageTokenParam}`
            );
            
            if (!playlistRes.ok) break;
            
            const playlistData = await playlistRes.json();
            const ids = playlistData.items?.map((item: any) => item.contentDetails?.videoId).filter(Boolean) || [];
            channelVideoIds.push(...ids);
            fetchedCount += ids.length;
            
            nextPageToken = playlistData.nextPageToken;
            if (!nextPageToken) break;
          }
          return channelVideoIds;
        } catch (err) {
          console.error(`Error fetching playlist items for ${playlistId}`, err);
          return [];
        }
      }));
      
      const videoIds = playlistResults.flat();
      
      let videosData = { items: [] as any[] };
      if (videoIds.length > 0) {
        const chunkedIds = [];
        for (let i = 0; i < videoIds.length; i += 50) {
          chunkedIds.push(videoIds.slice(i, i + 50));
        }
        
        // Fetch chunks concurrently for faster performance
        const chunkResults = await Promise.all(chunkedIds.map(async (chunk) => {
          try {
            const videosRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${keys.youtubeKey}`
            );
            if (videosRes.ok) {
              const vData = await videosRes.json();
              return vData.items || [];
            }
          } catch (e) {
            console.error("Failed to fetch video details chunk", e);
          }
          return [];
        }));
        
        videosData.items = chunkResults.flat();
      }

      if (videosData.items.length > 0) {
        videosData.items = videosData.items.map((v: any) => {
          const durationSec = durationToSeconds(v.contentDetails?.duration || "");
          v._isShort = durationSec > 0 && durationSec <= 60;
          return v;
        });
      }

      const responsePayload = {
        channels: channelsDataItems || [],
        videos: videosData.items || []
      };
      serverYouTubeCache.set(cacheKey, responsePayload);
      persistYtCacheToDisk();

      res.json(responsePayload);
    } catch (error: any) {
      console.error("[YouTube API Error]", error.message);
      res.status(500).json({ error: "YouTube Error: " + error.message });
    }
  });

  app.post("/api/youtube-videos-by-id", async (req, res) => {
    try {
      const keys = getKeys(req);
      const { videoIds } = req.body;
      const apiKey = req.body?.youtubeKey || keys.youtubeKey;
      
      if (!apiKey) {
        return res.status(400).json({ error: "Missing YouTube API Key" });
      }

      if (!Array.isArray(videoIds) || videoIds.length === 0) {
        return res.json({ videos: [] });
      }

      // Deduplicate IDs and clean
      const uniqueIds = Array.from(new Set(videoIds.map((id: any) => String(id).trim()).filter(Boolean)));
      
      // Check in-memory server cache first for instant response
      const cachedResults: any[] = [];
      const uncachedIds: string[] = [];

      for (const id of uniqueIds) {
        if (serverVideoIdCache.has(id)) {
          cachedResults.push(serverVideoIdCache.get(id));
        } else {
          uncachedIds.push(id);
        }
      }

      // If all requested video IDs are already in cache, return immediately (0ms!)
      if (uncachedIds.length === 0) {
        return res.json({ videos: cachedResults });
      }

      const chunkedIds: string[][] = [];
      for (let i = 0; i < uncachedIds.length; i += 50) {
        chunkedIds.push(uncachedIds.slice(i, i + 50));
      }

      // Worker pool to limit concurrent requests to 4 at a time to prevent rate limits & memory bloat
      const concurrencyLimit = 4;
      let currentIndex = 0;
      const allResults: any[] = [];

      async function worker() {
        while (currentIndex < chunkedIds.length) {
          const chunk = chunkedIds[currentIndex++];
          try {
            const videosRes = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${apiKey}`,
              { signal: AbortSignal.timeout(6000) }
            );
            if (videosRes.ok) {
              const vData = await videosRes.json();
              const items = vData.items || [];
              for (const v of items) {
                const durationSec = durationToSeconds(v.contentDetails?.duration || "");
                const thumb =
                  v.snippet?.thumbnails?.medium?.url ||
                  v.snippet?.thumbnails?.default?.url ||
                  `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;
                // Lean payload stripped of huge unused descriptions to handle 10,000+ items smoothly
                const itemPayload = {
                  id: v.id,
                  snippet: {
                    title: v.snippet?.title || `Video ${v.id}`,
                    publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
                    channelId: v.snippet?.channelId || "",
                    channelTitle: v.snippet?.channelTitle || "",
                    thumbnails: {
                      default: { url: thumb },
                      medium: { url: thumb },
                    },
                  },
                  statistics: {
                    viewCount: v.statistics?.viewCount || "0",
                    likeCount: v.statistics?.likeCount || "0",
                    commentCount: v.statistics?.commentCount || "0",
                  },
                  contentDetails: {
                    duration: v.contentDetails?.duration || "",
                  },
                  _isShort: durationSec > 0 && durationSec <= 60,
                };
                serverVideoIdCache.set(v.id, itemPayload);
                allResults.push(itemPayload);
              }
            } else {
              const errTxt = await videosRes.text();
              console.error(`YouTube batch fetch failed for chunk: ${errTxt.substring(0, 150)}`);
            }
          } catch (e) {
            console.error("Failed to fetch video details chunk", e);
          }
        }
      }

      const workers = Array.from(
        { length: Math.min(concurrencyLimit, chunkedIds.length) },
        () => worker()
      );
      await Promise.all(workers);

      // Extract unique channel IDs from the videos to identify and resolve channel metadata
      const allFoundVideos = [...cachedResults, ...allResults];
      const channelIdsToFetch: string[] = [];
      const returnedChannelsMap = new Map<string, any>();

      for (const v of allFoundVideos) {
        const cId = v.snippet?.channelId;
        if (cId && cId.startsWith("UC")) {
          if (serverChannelCache.has(cId)) {
            returnedChannelsMap.set(cId, serverChannelCache.get(cId));
          } else if (!channelIdsToFetch.includes(cId)) {
            channelIdsToFetch.push(cId);
          }
        }
      }

      if (channelIdsToFetch.length > 0) {
        for (let i = 0; i < channelIdsToFetch.length; i += 50) {
          const chunk = channelIdsToFetch.slice(i, i + 50);
          try {
            const chRes = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${chunk.join(",")}&key=${apiKey}`,
              { signal: AbortSignal.timeout(6000) }
            );
            if (chRes.ok) {
              const chData = await chRes.json();
              for (const ch of chData.items || []) {
                serverChannelCache.set(ch.id, ch);
                returnedChannelsMap.set(ch.id, ch);
              }
            }
          } catch (e) {
            console.warn("Failed to fetch channel metadata batch", e);
          }
        }
      }

      // Persist new cache to disk so it survives server reboots/restarts
      persistYtCacheToDisk();

      res.json({
        videos: allFoundVideos,
        channels: Array.from(returnedChannelsMap.values()),
      });
    } catch (error: any) {
      console.error("[YouTube ID Videos Error]", error.message);
      res.status(500).json({ error: "Failed to fetch ID videos: " + error.message });
    }
  });

  app.post("/api/youtube-channels-by-id", async (req, res) => {
    try {
      const keys = getKeys(req);
      const { channelIds } = req.body;
      const apiKey = req.body?.youtubeKey || keys.youtubeKey;
      if (!apiKey) {
        return res.status(400).json({ error: "Missing YouTube API Key" });
      }
      if (!Array.isArray(channelIds) || channelIds.length === 0) {
        return res.json({ channels: [] });
      }
      const uniqueIds = Array.from(new Set(channelIds.map((id: any) => String(id).trim()).filter(Boolean)));
      const results: any[] = [];
      const uncached: string[] = [];
      for (const id of uniqueIds) {
        if (serverChannelCache.has(id)) {
          results.push(serverChannelCache.get(id));
        } else {
          uncached.push(id);
        }
      }
      if (uncached.length > 0) {
        for (let i = 0; i < uncached.length; i += 50) {
          const chunk = uncached.slice(i, i + 50);
          try {
            const chRes = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${chunk.join(",")}&key=${apiKey}`
            );
            if (chRes.ok) {
              const chData = await chRes.json();
              for (const ch of chData.items || []) {
                serverChannelCache.set(ch.id, ch);
                results.push(ch);
              }
            }
          } catch (e) {
            console.error("Failed to fetch channels chunk", e);
          }
        }
        persistYtCacheToDisk();
      }
      res.json({ channels: results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Endpoints for permanent ID Videos storage
  app.get("/api/id-videos", (req, res) => {
    res.json(serverIdVideosStore);
  });

  app.post("/api/id-videos", (req, res) => {
    try {
      const { idVideos, hydratedVideos } = req.body;
      if (Array.isArray(idVideos)) {
        serverIdVideosStore.idVideos = idVideos;
      }
      if (Array.isArray(hydratedVideos)) {
        serverIdVideosStore.hydratedVideos = hydratedVideos;
      }
      serverIdVideosStore.lastSaved = new Date().toISOString();
      persistIdVideosToDisk();
      res.json({
        success: true,
        idCount: serverIdVideosStore.idVideos.length,
        hydratedCount: serverIdVideosStore.hydratedVideos.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/id-videos/batch-hydrate", (req, res) => {
    try {
      const { batchVideos } = req.body;
      if (Array.isArray(batchVideos) && batchVideos.length > 0) {
        const existingMap = new Map<string, any>();
        serverIdVideosStore.hydratedVideos.forEach((v) => existingMap.set(v.id, v));
        batchVideos.forEach((v) => existingMap.set(v.id, v));
        serverIdVideosStore.hydratedVideos = Array.from(existingMap.values());
        serverIdVideosStore.lastSaved = new Date().toISOString();
        persistIdVideosToDisk();
      }
      res.json({
        success: true,
        hydratedCount: serverIdVideosStore.hydratedVideos.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/id-videos", (req, res) => {
    serverIdVideosStore = {
      idVideos: [],
      hydratedVideos: [],
      lastSaved: new Date().toISOString(),
    };
    persistIdVideosToDisk();
    res.json({ success: true });
  });

  app.all("/api/instagram", async (req, res) => {
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
      res.status(500).json({ error: "Instagram Error: " + error.message });
    }
  });

  app.post("/api/ai-categorize-videos", async (req, res) => {
    try {
      const { videos } = req.body;
      const geminiKey = req.body?.geminiKey || req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      }
      if (!videos || videos.length === 0) {
        return res.json({});
      }
      
      
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


  app.post("/api/niche-research", async (req, res) => {
    try {
      const { niche } = req.body;
      const keys = getKeys(req);
      const geminiKey = req.body?.geminiKey || req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;

      if (!keys.youtubeKey) return res.status(400).json({ error: "YouTube API key missing" });
      if (!geminiKey) return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      if (!niche) return res.status(400).json({ error: "Niche topic is required" });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const publishedAfter = thirtyDaysAgo.toISOString();

      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche)}&type=video&order=viewCount&publishedAfter=${publishedAfter}&maxResults=25&key=${keys.youtubeKey}`;
      const ytRes = await fetch(ytUrl);
      
      if (!ytRes.ok) {
        throw new Error(`YouTube Search API Error: ${ytRes.statusText}`);
      }
      
      const ytData = await ytRes.json();
      const searchResults = ytData.items.map((i: any) => ({
        title: i.snippet.title,
        channelTitle: i.snippet.channelTitle,
        publishedAt: i.snippet.publishedAt,
        videoId: i.id.videoId,
      }));

      const ai = new GoogleGenAI({ apiKey: geminiKey as string });
      const prompt = `You are an elite YouTube strategist and analyst.
Analyze these recent top-performing videos for the niche "${niche}":
${JSON.stringify(searchResults)}

Based strictly on this data, provide a JSON response containing:
1. "trendingTopics": an array of 3-5 specific trending sub-topics or keywords currently working in this niche.
2. "contentIdeas": an array of 3-5 specific video ideas. Each object should have:
   - "title" (string): A highly clickable title.
   - "format" (string): e.g., Tutorial, List, Story, Challenge.
   - "rationale" (string): Why it will work based on the current trends.
3. "discoveredCompetitors": an array of 3-5 channels from the data provided. Each object should have:
   - "channelName" (string)
   - "analysis" (string): What they seem to be doing right based on their titles.

Return ONLY a valid JSON object without markdown formatting.`;

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
      console.error("[Niche Research Error]", error.message);
      res.status(500).json({ error: `Research failed: ${error.message}` });
    }
  });

export default app;
