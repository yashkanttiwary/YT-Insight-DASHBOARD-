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
  
  try {
    const res = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtubeKey: keys.youtubeKey || "",
        youtubeChannels: keys.youtubeChannels || [],
        instagramKey: keys.instagramKey || "",
        instagramAccounts: keys.instagramAccounts || []
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.error("Failed to fetch status from backend", e);
  }

  return {
    configured: {
      youtube: !!(keys.youtubeKey && keys.youtubeChannels && keys.youtubeChannels.length > 0),
      instagram: !!(keys.instagramKey && keys.instagramAccounts && keys.instagramAccounts.length > 0),
    }
  };
}

export async function fetchYouTubeData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  const res = await fetch("/api/youtube", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      youtubeKey: keys.youtubeKey || "",
      youtubeChannels: keys.youtubeChannels || [],
      displayConfig: keys.display || {}
    })
  });

  if (!res.ok) {
     let errorMessage = "Failed to fetch YouTube data";
     try {
       const data = await res.json();
       if (data.error) errorMessage = data.error;
     } catch (e) {}
     throw new Error(errorMessage);
  }
  return res.json();
}

export async function fetchYouTubeCompetitors(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  const res = await fetch("/api/youtube-competitors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      youtubeKey: keys.youtubeKey || "",
      youtubeCompetitors: keys.youtubeCompetitors || [],
      displayConfig: keys.display || {}
    })
  });

  if (!res.ok) {
     let errorMessage = "Failed to fetch YouTube competitors data";
     try {
       const data = await res.json();
       if (data.error) errorMessage = data.error;
     } catch (e) {}
     throw new Error(errorMessage);
  }
  return res.json();
}

export async function fetchInstagramData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  const res = await fetch("/api/instagram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instagramKey: keys.instagramKey || "",
      instagramAccounts: keys.instagramAccounts || []
    })
  });

  if (!res.ok) {
     let errorMessage = "Failed to fetch Instagram data";
     try {
       const data = await res.json();
       if (data.error) errorMessage = data.error;
     } catch (e) {}
     throw new Error(errorMessage);
  }
  return res.json();
}

export async function fetchAIInsights(videos: any[], channels: any[], providedKeys?: DashboardKeys, selectedChannelId?: string) {
  const keys = providedKeys || getKeysFromStorage();
  
  const headers: any = { "Content-Type": "application/json" };
  
  const res = await fetch("/api/ai-insights", {
    method: "POST",
    headers,
    body: JSON.stringify({ videos, channels, selectedChannelId, geminiKey: keys.geminiKey || "" })
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

  const res = await fetch(`/api/youtube-comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      youtubeKey: keys.youtubeKey,
      videoId
    })
  });

  if (!res.ok) {
     let errorMessage = "Failed to fetch comments";
     try {
       const data = await res.json();
       if (data.error) errorMessage = data.error;
     } catch (e) {}
     throw new Error(errorMessage);
  }
  const data = await res.json();
  return data.comments || [];
}

export async function analyzeComments(comments: string[], providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  const headers: any = { "Content-Type": "application/json" };
  
  const res = await fetch("/api/ai-analyze-comments", {
    method: "POST",
    headers,
    body: JSON.stringify({ comments, geminiKey: keys.geminiKey || "" })
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
