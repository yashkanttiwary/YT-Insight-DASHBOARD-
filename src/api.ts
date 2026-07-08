import { DashboardKeys, YouTubeStats, InstagramStats } from "./types";

function getKeysFromStorage(): DashboardKeys {
  const keys: DashboardKeys = {
    youtubeKey: "",
    youtubeChannels: [],
    instagramKey: "",
    instagramAccounts: [],
    geminiKey: "",
  };

  try {
    const ytKey = localStorage.getItem("f1_youtubeKey");
    const ytChannels = localStorage.getItem("f1_youtubeChannels");
    const ytCompetitors = localStorage.getItem("f1_youtubeCompetitors");
    const igKey = localStorage.getItem("f1_instagramKey");
    const igAccounts = localStorage.getItem("f1_instagramAccounts");
    const displayStr = localStorage.getItem("f1_displayConfig");
    const geminiKey = localStorage.getItem("f1_geminiKey");

    if (ytKey) keys.youtubeKey = ytKey;
    if (ytChannels) keys.youtubeChannels = JSON.parse(ytChannels);
    if (ytCompetitors) keys.youtubeCompetitors = JSON.parse(ytCompetitors);
    if (igKey) keys.instagramKey = igKey;
    if (igAccounts) keys.instagramAccounts = JSON.parse(igAccounts);
    if (displayStr) keys.display = JSON.parse(displayStr);
    if (geminiKey) keys.geminiKey = geminiKey;
  } catch (e) {
    // Ignore parse errors
  }

  return keys;
}

export async function checkStatus(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  return {
    configured: {
      youtube: !!(keys.youtubeKey && keys.youtubeChannels && keys.youtubeChannels.length > 0),
      instagram: !!(keys.instagramKey && keys.instagramAccounts && keys.instagramAccounts.length > 0),
    }
  };
}

export async function fetchYouTubeData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  if (!keys.youtubeKey || !keys.youtubeChannels || keys.youtubeChannels.length === 0) {
    throw new Error("Configuration missing");
  }

    // Separate channels into IDs and Handles
  const validIds = [];
  const handles = [];
  for (const c of keys.youtubeChannels) {
    let rawId = (c.channel_id || "").trim();
    if (!rawId) continue;
    
    // Parse URL
    if (rawId.includes('youtube.com/') || rawId.includes('youtu.be/')) {
      const match = rawId.match(/(?:youtube\.com\/(?:@|c\/|user\/|channel\/)|youtu\.be\/)([^/?&]+)/);
      if (match) {
        if (rawId.includes('/channel/')) {
          rawId = match[1];
        } else if (rawId.includes('/@') || rawId.includes('.com/@')) {
          rawId = '@' + match[1];
        } else {
          rawId = match[1]; // fallback could be username or custom id, handle it as username/handle
          if (!rawId.startsWith('UC') && !rawId.startsWith('@')) {
            rawId = '@' + rawId; // mostly custom URLs map to handles these days
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

  // 1. Fetch by IDs (batch up to 50)
  if (validIds.length > 0) {
    for (let i = 0; i < validIds.length; i += 50) {
      const chunk = validIds.slice(i, i + 50).join(",");
      const channelsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${chunk}&key=${keys.youtubeKey}`
      );
      if (!channelsRes.ok) {
        let errorMsg = channelsRes.statusText;
        try {
          const errData = await channelsRes.json();
          if (errData.error?.message) errorMsg = errData.error.message;
        } catch(e) {}
        throw new Error(`YouTube API Error: ${errorMsg}`);
      }
      const data = await channelsRes.json();
      if (data.items) {
        channelsDataItems = channelsDataItems.concat(data.items);
      }
    }
  }

  // 2. Fetch by Handles (one by one, as forHandle doesn't support comma-separated list)
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
        // Fallback for legacy usernames
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
  
  let videoLimit = keys.display?.videoLimit || 50;
  let videoIds: string[] = [];

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

  return {
    channels: channelsDataItems || [],
    videos: videosData.items || []
  };
}

export async function fetchYouTubeCompetitors(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  if (!keys.youtubeKey || !keys.youtubeCompetitors || keys.youtubeCompetitors.length === 0) {
    return { channels: [], videos: [] };
  }

  const validIds = [];
  const handles = [];
  for (const c of keys.youtubeCompetitors) {
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
  
  let videoLimit = keys.display?.videoLimit || 50;
  let videoIds: string[] = [];

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

  return {
    channels: channelsDataItems || [],
    videos: videosData.items || []
  };
}

export async function fetchInstagramData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  if (!keys.instagramKey || !keys.instagramAccounts || keys.instagramAccounts.length === 0) {
    throw new Error("Configuration missing");
  }

  const accountId = keys.instagramAccounts[0].business_account_id;
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count,media_count,name,profile_picture_url&access_token=${keys.instagramKey}`
  );
  
  if (!response.ok) {
    let errorMsg = response.statusText;
  try {
    const errData = await response.json();
    if (errData.error?.message) errorMsg = errData.error.message;
  } catch(e) {}
  throw new Error(`Instagram API Error: ${errorMsg}`);
  }
  
  return await response.json();
}

export async function fetchAIInsights(videos: any[], channels: any[], providedKeys?: DashboardKeys, selectedChannelId?: string) {
  const keys = providedKeys || getKeysFromStorage();
  
  const headers: any = { "Content-Type": "application/json" };
  if (keys.geminiKey) {
    headers["x-gemini-key"] = keys.geminiKey;
  }
  
  const res = await fetch("/api/ai-insights", {
    method: "POST",
    headers,
    body: JSON.stringify({ videos, channels, selectedChannelId })
  });
  if (!res.ok) {
     let errorMessage = "Failed to fetch AI insights";
     try {
       const data = await res.json();
       if (data.error) errorMessage = data.error;
     } catch (e) {
       errorMessage = `Server error ${res.status}: ${res.statusText}`;
     }
     throw new Error(errorMessage);
  }
  return res.json();
}

export async function fetchVideoComments(videoId: string, providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  if (!keys.youtubeKey) throw new Error("YouTube API key missing");

  const commentsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&key=${keys.youtubeKey}`
  );

  if (!commentsRes.ok) {
    throw new Error(`Failed to fetch comments: ${commentsRes.statusText}`);
  }

  const data = await commentsRes.json();
  return data.items?.map((item: any) => item.snippet.topLevelComment.snippet.textDisplay) || [];
}

export async function analyzeComments(comments: string[], providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  const headers: any = { "Content-Type": "application/json" };
  if (keys.geminiKey) {
    headers["x-gemini-key"] = keys.geminiKey;
  }
  
  const res = await fetch("/api/ai-analyze-comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ comments })
  });
  if (!res.ok) {
     let errorMessage = "Failed to analyze comments";
     try {
       const data = await res.json();
       if (data.error) errorMessage = data.error;
     } catch (e) {}
     throw new Error(errorMessage);
  }
  return res.json();
}
