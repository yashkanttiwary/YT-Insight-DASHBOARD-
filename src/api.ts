import { DashboardKeys, YouTubeStats, InstagramStats } from "./types";

function getKeysFromStorage(): DashboardKeys {
  const keys: DashboardKeys = {
    youtubeKey: "AIzaSyAkNHRr0C0wYbKK5pJVytMwBnRSDau_GMs",
    youtubeChannels: [
      { channel_id: "UCUikVoPsty2bGOCi2fZ_xZw", name: "PW IOI" }
    ],
    youtubeCompetitors: [
      { channel_id: "UCg6n0KpFmhje8kjjBOCRtGg", name: "Kalvium" },
      { channel_id: "UC-59uyQUy8SeGlCN1fiDweQ", name: "Scaler School of Technology" },
      { channel_id: "UCqmlyuni9n40AjTnFnlvGBQ", name: "NST" },
      { channel_id: "UCyPECBwmgdkS1Jv1WEtPeAg", name: "BST" },
      { channel_id: "UCh74gkhPCTm0wOMP1MeW36A", name: "uGSOT" }
    ],
    instagramKey: "",
    instagramAccounts: [],
    geminiKey: "",
  };
  try {
    const igKey = localStorage.getItem("f1_instagramKey");
    const igAccounts = localStorage.getItem("f1_instagramAccounts");
    const displayStr = localStorage.getItem("f1_displayConfig");
    const geminiKey = localStorage.getItem("f1_geminiKey");

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

  const res = await fetch("/api/youtube", {
    headers: {
      "x-youtube-key": keys.youtubeKey,
      "x-youtube-channels": JSON.stringify(keys.youtubeChannels),
      "x-display-config": JSON.stringify(keys.display || {})
    }
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
  if (!keys.youtubeKey || !keys.youtubeCompetitors || keys.youtubeCompetitors.length === 0) {
    return { channels: [], videos: [] };
  }

  const res = await fetch("/api/youtube-competitors", {
    headers: {
      "x-youtube-key": keys.youtubeKey,
      "x-youtube-competitors": JSON.stringify(keys.youtubeCompetitors),
      "x-display-config": JSON.stringify(keys.display || {})
    }
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
  
  if (!keys.instagramKey || !keys.instagramAccounts || keys.instagramAccounts.length === 0) {
    throw new Error("Configuration missing");
  }

  const res = await fetch("/api/instagram", {
    headers: {
      "x-instagram-key": keys.instagramKey,
      "x-instagram-accounts": JSON.stringify(keys.instagramAccounts)
    }
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

  const res = await fetch(`/api/youtube-comments?videoId=${videoId}`, {
    headers: {
      "x-youtube-key": keys.youtubeKey
    }
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
