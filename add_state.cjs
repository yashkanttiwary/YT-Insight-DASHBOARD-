const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const stateTarget = `  const [compareTimeframe, setCompareTimeframe] = useState<"week" | "month">("week");`;
const stateReplacement = `  const [compareTimeframe, setCompareTimeframe] = useState<"week" | "month">("week");
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [aiCategoriesMap, setAiCategoriesMap] = useState<Record<string, string>>({});
  
  const generateAiCategories = async () => {
    setAiCategorizing(true);
    try {
      const allVideos = [...(youtubeData?.videos || []), ...(competitorData?.videos || [])];
      
      const response = await fetch('/api/ai-categorize-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: allVideos.map((v: any) => ({ id: v.id, title: v.snippet?.title, tags: v.snippet?.tags })) })
      });
      
      if (!response.ok) {
        throw new Error('Failed to categorize videos');
      }
      
      const data = await response.json();
      setAiCategoriesMap(data);
    } catch (error) {
      console.error('Error generating AI categories:', error);
      alert('Failed to generate AI categories. Please ensure your Gemini API key is configured.');
    } finally {
      setAiCategorizing(false);
    }
  };`;

content = content.replace(stateTarget, stateReplacement);

const buttonTarget = `                  <div className="flex items-center gap-2">
                     <button onClick={() => setReportTimeframe("weekly")} className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "weekly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}>Weekly</button>
                     <button onClick={() => setReportTimeframe("monthly")} className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "monthly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}>Monthly</button>
                  </div>`;
const buttonReplacement = `                  <div className="flex items-center gap-2">
                     <button 
                       onClick={generateAiCategories} 
                       disabled={aiCategorizing}
                       className="px-3 py-1 mr-4 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-1 disabled:opacity-50"
                     >
                       <Sparkles className="w-3 h-3" />
                       {aiCategorizing ? "Categorizing..." : "AI Categorize"}
                     </button>
                     <button onClick={() => setReportTimeframe("weekly")} className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "weekly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}>Weekly</button>
                     <button onClick={() => setReportTimeframe("monthly")} className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${reportTimeframe === "monthly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}\`}>Monthly</button>
                  </div>`;

content = content.replace(buttonTarget, buttonReplacement);
fs.writeFileSync(filePath, content);
console.log('State and button added');
