const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `app.listen(PORT`;

const endpoint = `  app.post("/api/ai-categorize-videos", async (req, res) => {
    try {
      const { videos } = req.body;
      const geminiKey = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured on the server, and no key was provided in settings." });
      }
      if (!videos || videos.length === 0) {
        return res.json({ categories: {} });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: geminiKey as string });
      
      const prompt = \`Analyze the following YouTube videos (title and tags) and categorize each into a very specific, precise niche or topic (e.g., instead of just "Gaming", use "Minecraft Survival Multiplayer", or instead of "Tech", use "Mechanical Keyboard Reviews"). Keep the category name to 1-4 words.

      Videos:
      \${JSON.stringify(videos.map((v: any) => ({ id: v.id, title: v.title, tags: v.tags })))}
      
      Provide a JSON object mapping the video ID to its specific category:
      {
         "video_id_1": "Specific Category Name",
         "video_id_2": "Another Specific Category"
      }\`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      
      let rawText = response.text || "{}";
      rawText = rawText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
      
      res.json(JSON.parse(rawText));
    } catch (error: any) {
      console.error("[AI Categorize Error]", error.message);
      res.status(500).json({ error: "Failed to categorize videos." });
    }
  });

  `;

content = content.replace(target, endpoint + target);
fs.writeFileSync(filePath, content);
console.log('server.ts endpoint added');
