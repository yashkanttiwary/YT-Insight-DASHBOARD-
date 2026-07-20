const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Add a useEffect to load initial data
const initCode = `
  useEffect(() => {
    async function loadData() {
      const postsStr = await storage.get("custom_community_posts");
      if (postsStr) setCustomCommunityPosts(JSON.parse(postsStr));
      
      const votesStr = await storage.get("community_user_votes");
      if (votesStr) setUserVotes(JSON.parse(votesStr));
      
      const commentsStr = await storage.get("community_post_comments");
      if (commentsStr) setPostComments(JSON.parse(commentsStr));
      
      const displayStr = await storage.get("f1_displayConfig");
      if (displayStr) {
        try {
          const parsed = JSON.parse(displayStr);
          if (parsed?.timeRange) setTimeRange(parsed.timeRange);
        } catch(e) {}
      }
    }
    loadData();
  }, []);
`;

// Insert after `const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});`
appCode = appCode.replace(/const \[expandedComments, setExpandedComments\] = useState<Record<string, boolean>>\(\{\}\);/g, `const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});\n${initCode}`);

fs.writeFileSync('src/App.tsx', appCode);
