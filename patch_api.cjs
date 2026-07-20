const fs = require('fs');

let apiCode = fs.readFileSync('src/api.ts', 'utf8');

apiCode = apiCode.replace(/function getKeysFromStorage\(\): DashboardKeys \{/g, 'export async function getKeysFromStorage(): Promise<DashboardKeys> {\n  const { storage } = await import("./lib/storage");');

apiCode = apiCode.replace(/const ytKey = localStorage.getItem\("f1_youtubeKey"\);/g, 'const ytKey = await storage.get("f1_youtubeKey");');
apiCode = apiCode.replace(/const ytChannels = localStorage.getItem\("f1_youtubeChannels"\);/g, 'const ytChannels = await storage.get("f1_youtubeChannels");');
apiCode = apiCode.replace(/const ytCompetitors = localStorage.getItem\("f1_youtubeCompetitors"\);/g, 'const ytCompetitors = await storage.get("f1_youtubeCompetitors");');
apiCode = apiCode.replace(/const igKey = localStorage.getItem\("f1_instagramKey"\);/g, 'const igKey = await storage.get("f1_instagramKey");');
apiCode = apiCode.replace(/const igAccounts = localStorage.getItem\("f1_instagramAccounts"\);/g, 'const igAccounts = await storage.get("f1_instagramAccounts");');
apiCode = apiCode.replace(/const displayStr = localStorage.getItem\("f1_displayConfig"\);/g, 'const displayStr = await storage.get("f1_displayConfig");');
apiCode = apiCode.replace(/const geminiKey = localStorage.getItem\("f1_geminiKey"\);/g, 'const geminiKey = await storage.get("f1_geminiKey");');

apiCode = apiCode.replace(/const keys = providedKeys \|\| getKeysFromStorage\(\);/g, 'const keys = providedKeys || await getKeysFromStorage();');

fs.writeFileSync('src/api.ts', apiCode);
