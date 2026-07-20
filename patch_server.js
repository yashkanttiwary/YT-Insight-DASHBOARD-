import fs from "fs";
let content = fs.readFileSync("server.ts", "utf8");

content = content.replace(
  `youtubeChannels: req.headers["x-youtube-channels"]
        ? JSON.parse(req.headers["x-youtube-channels"] as string)
        : process.env.YOUTUBE_CHANNELS_JSON
        ? JSON.parse(process.env.YOUTUBE_CHANNELS_JSON)
        : null`,
  `youtubeChannels: (req.headers["x-youtube-channels"] && req.headers["x-youtube-channels"] !== "[]")
        ? JSON.parse(req.headers["x-youtube-channels"] as string)
        : process.env.YOUTUBE_CHANNELS_JSON
        ? JSON.parse(process.env.YOUTUBE_CHANNELS_JSON)
        : null`
);

content = content.replace(
  `youtubeCompetitors: req.headers["x-youtube-competitors"]
        ? JSON.parse(req.headers["x-youtube-competitors"] as string)
        : process.env.YOUTUBE_COMPETITORS_JSON
        ? JSON.parse(process.env.YOUTUBE_COMPETITORS_JSON)
        : null`,
  `youtubeCompetitors: (req.headers["x-youtube-competitors"] && req.headers["x-youtube-competitors"] !== "[]")
        ? JSON.parse(req.headers["x-youtube-competitors"] as string)
        : process.env.YOUTUBE_COMPETITORS_JSON
        ? JSON.parse(process.env.YOUTUBE_COMPETITORS_JSON)
        : null`
);

content = content.replace(
  `instagramAccounts: req.headers["x-instagram-accounts"]
        ? JSON.parse(req.headers["x-instagram-accounts"] as string)
        : process.env.INSTAGRAM_ACCOUNTS_JSON
        ? JSON.parse(process.env.INSTAGRAM_ACCOUNTS_JSON)
        : null`,
  `instagramAccounts: (req.headers["x-instagram-accounts"] && req.headers["x-instagram-accounts"] !== "[]")
        ? JSON.parse(req.headers["x-instagram-accounts"] as string)
        : process.env.INSTAGRAM_ACCOUNTS_JSON
        ? JSON.parse(process.env.INSTAGRAM_ACCOUNTS_JSON)
        : null`
);

fs.writeFileSync("server.ts", content);
