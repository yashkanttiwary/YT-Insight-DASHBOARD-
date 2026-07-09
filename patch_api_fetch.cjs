const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/api.ts');
let content = fs.readFileSync(filePath, 'utf8');

const targetYT = `export async function fetchYouTubeData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  if (!keys.youtubeKey || !keys.youtubeChannels || keys.youtubeChannels.length === 0) {
    throw new Error("Configuration missing");
  }

  const channelIds = keys.youtubeChannels.map((c) => c.channel_id).join(",");

  const channelsRes = await fetch(
    \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=\${channelIds}&key=\${keys.youtubeKey}\`
  );`;

// Wait, the whole fetchYouTubeData is long. I will just replace the whole function using regex or matching to `export async function fetchInstagramData`
