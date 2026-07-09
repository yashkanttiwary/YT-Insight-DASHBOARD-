import fs from "fs";

let content = fs.readFileSync("src/api.ts", "utf8");

content = content.replace(
  `export async function checkStatus(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  return {
    configured: {
      youtube: !!(keys.youtubeKey && keys.youtubeChannels && keys.youtubeChannels.length > 0),
      instagram: !!(keys.instagramKey && keys.instagramAccounts && keys.instagramAccounts.length > 0),
    }
  };
}`,
  `export async function checkStatus(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  try {
    const res = await fetch("/api/status", {
      headers: {
        "x-youtube-key": keys.youtubeKey || "",
        "x-youtube-channels": JSON.stringify(keys.youtubeChannels || []),
        "x-instagram-key": keys.instagramKey || "",
        "x-instagram-accounts": JSON.stringify(keys.instagramAccounts || [])
      }
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
}`
);

content = content.replace(
  `export async function fetchYouTubeData(providedKeys?: DashboardKeys) {
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
  });`,
  `export async function fetchYouTubeData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  const res = await fetch("/api/youtube", {
    headers: {
      "x-youtube-key": keys.youtubeKey || "",
      "x-youtube-channels": JSON.stringify(keys.youtubeChannels || []),
      "x-display-config": JSON.stringify(keys.display || {})
    }
  });`
);

content = content.replace(
  `export async function fetchInstagramData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  if (!keys.instagramKey || !keys.instagramAccounts || keys.instagramAccounts.length === 0) {
    throw new Error("Configuration missing");
  }

  const res = await fetch("/api/instagram", {
    headers: {
      "x-instagram-key": keys.instagramKey,
      "x-instagram-accounts": JSON.stringify(keys.instagramAccounts)
    }
  });`,
  `export async function fetchInstagramData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  const res = await fetch("/api/instagram", {
    headers: {
      "x-instagram-key": keys.instagramKey || "",
      "x-instagram-accounts": JSON.stringify(keys.instagramAccounts || [])
    }
  });`
);

content = content.replace(
  `export async function fetchYouTubeCompetitors(providedKeys?: DashboardKeys) {
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
  });`,
  `export async function fetchYouTubeCompetitors(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  const res = await fetch("/api/youtube-competitors", {
    headers: {
      "x-youtube-key": keys.youtubeKey || "",
      "x-youtube-competitors": JSON.stringify(keys.youtubeCompetitors || []),
      "x-display-config": JSON.stringify(keys.display || {})
    }
  });`
);

fs.writeFileSync("src/api.ts", content);
