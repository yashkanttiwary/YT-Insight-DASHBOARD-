const channelList = [
  { channel_id: "UCg6n0KpFmhje8kjjBOCRtGg" },
  { channel_id: "https://www.youtube.com/channel/UC-59uyQUy8SeGlCNlfiDweQ" },
  { channel_id: "https://youtube.com/@mkbhd" },
  { channel_id: "mkbhd" },
  { channel_id: "@MrBeast" },
  { channel_id: "https://www.youtube.com/c/PewDiePie" }
];

const validIds = [];
const handles = [];

for (const c of channelList) {
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

  // Strip query parameters if any (in case they pasted ID with ?app=desktop)
  rawId = rawId.split("?")[0].split("&")[0].split("/")[0];

  if (rawId.startsWith("UC")) {
    validIds.push(rawId);
  } else if (rawId.startsWith("@")) {
    handles.push(rawId);
  } else {
    // If they just typed "mkbhd", treat it as a handle first
    handles.push("@" + rawId);
  }
}
console.log("validIds:", validIds);
console.log("handles:", handles);
