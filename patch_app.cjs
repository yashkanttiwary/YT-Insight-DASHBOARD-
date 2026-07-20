const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(/const stored = localStorage\.getItem\("custom_community_posts"\);/g, 'const stored = null; /* localStorage removed, loaded async below */');
appCode = appCode.replace(/const stored = localStorage\.getItem\("community_user_votes"\);/g, 'const stored = null; /* localStorage removed, loaded async below */');
appCode = appCode.replace(/const stored = localStorage\.getItem\("community_post_comments"\);/g, 'const stored = null; /* localStorage removed, loaded async below */');

// We need to inject a useAsyncEffect or similar to load data.
// Let's just find the `import { SettingsPanel }` and add `import { storage } from "./lib/storage";`
appCode = appCode.replace(/import \{ SettingsPanel \} from "\.\/components\/SettingsPanel";/g, 'import { SettingsPanel } from "./components/SettingsPanel";\nimport { storage } from "./lib/storage";');

appCode = appCode.replace(/localStorage\.setItem\("custom_community_posts", JSON\.stringify\(customCommunityPosts\)\);/g, 'storage.set("custom_community_posts", JSON.stringify(customCommunityPosts));');
appCode = appCode.replace(/localStorage\.setItem\("community_user_votes", JSON\.stringify\(userVotes\)\);/g, 'storage.set("community_user_votes", JSON.stringify(userVotes));');
appCode = appCode.replace(/localStorage\.setItem\("community_post_comments", JSON\.stringify\(postComments\)\);/g, 'storage.set("community_post_comments", JSON.stringify(postComments));');

// display = localStorage.getItem("f1_displayConfig");
appCode = appCode.replace(/const display = localStorage\.getItem\("f1_displayConfig"\);/g, 'const display = null; /* async loaded */');

// const geminiKey = localStorage.getItem("f1_geminiKey") || "";
appCode = appCode.replace(/const geminiKey = localStorage\.getItem\("f1_geminiKey"\) \|\| "";/g, 'const geminiKey = (await storage.get("f1_geminiKey")) || "";');

fs.writeFileSync('src/App.tsx', appCode);
