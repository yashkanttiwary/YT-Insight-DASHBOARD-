import toast from "react-hot-toast";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Settings,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Users,
  Eye,
  Brain,
  PieChart as PieChartIcon,
  Map as MapIcon,
  Smartphone,
  Sparkles,
  Zap,
  CheckCircle2,
  Calendar,
  ChevronDown,
  MessageSquare,
  Crosshair,
  ExternalLink,
  Table as TableIcon,
  Play,
  Trash2,
  Heart,
  ThumbsUp,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SettingsPanel } from "./components/SettingsPanel";
import {
  checkStatus,
  fetchYouTubeData,
  fetchInstagramData,
  fetchAIInsights,
  fetchYouTubeCompetitors,
  fetchVideoComments,
  analyzeComments,
} from "./api";
import { DashboardKeys } from "./types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function formatDuration(pt: string) {
  if (!pt) return "0:00";
  const match = pt.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1]) || 0;
  const m = parseInt(match[2]) || 0;
  const s = parseInt(match[3]) || 0;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function durationToSeconds(pt: string) {
  if (!pt) return 0;
  const match = pt.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const h = parseInt(match[1]) || 0;
  const m = parseInt(match[2]) || 0;
  const s = parseInt(match[3]) || 0;
  return h * 3600 + m * 60 + s;
}

function formatDurationSeconds(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function calculateVelocity(publishedAt: string, views: number) {
  const hours =
    (new Date().getTime() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (hours <= 0) return 0;
  return Math.round(views / Math.max(0.1, hours));
}

const sortDescriptions: Record<string, { desc: string; impact: string }> = {
  recent: {
    desc: "Chronological order based on publish date.",
    impact: "Shows the latest uploads to analyze immediate initial traction.",
  },
  views: {
    desc: "Total lifetime views.",
    impact: "Indicates overall reach and mass appeal of the content.",
  },
  likes: {
    desc: "Total user likes.",
    impact: "Shows passive viewer satisfaction and content resonance.",
  },
  velocity: {
    desc: "Views per hour since publish.",
    impact: "Identifies currently trending or viral content.",
  },
  engagement: {
    desc: "Likes + Comments per view.",
    impact: "Shows active viewer involvement and community building.",
  },
  comments: {
    desc: "Total user comments.",
    impact: "Indicates high active engagement and discussion generation.",
  },
  score: {
    desc: "Algorithmic Matrix Score.",
    impact: "A composite metric predicting algorithmic favorability.",
  },
};

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isConfigured, setIsConfigured] = useState({
    youtube: false,
    instagram: false,
  });
  const [youtubeData, setYoutubeData] = useState<{
    channels: any[];
    videos: any[];
  } | null>(null);
  const [competitorData, setCompetitorData] = useState<{
    channels: any[];
    videos: any[];
  } | null>(null);
  const [instagramData, setInstagramData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Community Hub state managers
  const [customCommunityPosts, setCustomCommunityPosts] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("custom_community_posts");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [userVotes, setUserVotes] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("community_user_votes");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const [postLikes, setPostLikes] = useState<Record<string, number>>({});
  const [userLikedPosts, setUserLikedPosts] = useState<Record<string, boolean>>({});

  const [postComments, setPostComments] = useState<Record<string, Array<{author: string, text: string, publishedAt: string}>>>(() => {
    try {
      const stored = localStorage.getItem("community_post_comments");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("custom_community_posts", JSON.stringify(customCommunityPosts));
    } catch (e) {}
  }, [customCommunityPosts]);

  useEffect(() => {
    try {
      localStorage.setItem("community_user_votes", JSON.stringify(userVotes));
    } catch (e) {}
  }, [userVotes]);

  useEffect(() => {
    try {
      localStorage.setItem("community_post_comments", JSON.stringify(postComments));
    } catch (e) {}
  }, [postComments]);

  // Community Hub form and filter states
  const [newPostText, setNewPostText] = useState("");
  const [newPostType, setNewPostType] = useState<"text" | "poll" | "image">("text");
  const [newPostChannelId, setNewPostChannelId] = useState("");
  const [newPostOptions, setNewPostOptions] = useState<string[]>(["", ""]);
  const [newPostImageUrl, setNewPostImageUrl] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [communityTypeFilter, setCommunityTypeFilter] = useState<"all" | "text" | "poll" | "image">("all");
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Time range selector state
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">(() => {
    try {
      const display = localStorage.getItem("f1_displayConfig");
      if (display && display !== "null" && display !== "undefined") {
        const parsed = JSON.parse(display);
        return parsed?.timeRange || "30d";
      }
    } catch (e) {}
    return "30d";
  });
  const [activeView, setActiveView] = useState<
    | "global"
    | "compare"
    | "historical_report"
    | "channel_ranking"
    | "videos"
    | "algorithm"
    | "ai_insights"
    | "audience"
    | "calendar"
    | "competitors"
    | "community"
  >("global");
  const [hoveredVideo, setHoveredVideo] = useState<{
    video: any;
    x: number;
    y: number;
  } | null>(null);
  const [videoSort, setVideoSort] = useState<
    | "recent"
    | "views"
    | "likes"
    | "velocity"
    | "engagement"
    | "comments"
    | "score"
  >("recent");
  const [videoType, setVideoType] = useState<"all" | "shorts" | "long" | "podcasts">("all");
  const [compareTimeframe, setCompareTimeframe] = useState<"week" | "month">(
    "week",
  );
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [aiCategoriesMap, setAiCategoriesMap] = useState<
    Record<string, string>
  >({});
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

  const generateAiCategories = async () => {
    setAiCategorizing(true);
    try {
      const allVideos = [
        ...(youtubeData?.videos || []),
        ...(competitorData?.videos || []),
      ];
      const geminiKey = localStorage.getItem("f1_geminiKey") || "";

      const response = await fetch("/api/ai-categorize-videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          geminiKey,
          videos: allVideos.map((v: any) => ({
            id: v.id,
            title: v.snippet?.title,
            tags: v.snippet?.tags,
          })),
        }),
      });

      if (!response.ok) {
        let errMsg = "Failed to categorize videos";
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      setAiCategoriesMap(data);
      showNotification("Content mix categorized via AI");
    } catch (error: any) {
      console.error("Error generating AI categories:", error);
      showNotification(
        error.message ||
          "Failed to generate AI categories. Please ensure your Gemini API key is configured.",
        "error",
      );
    } finally {
      setAiCategorizing(false);
    }
  };
  const [expandedNotepadChannel, setExpandedNotepadChannel] = useState<
    string | null
  >(null);

  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSelectedChannelId, setAiSelectedChannelId] = useState<
    string | "all"
  >("all");

  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);
  const [videoCommentAnalysis, setVideoCommentAnalysis] = useState<
    Record<string, any>
  >({});

  const [selectedAudienceChannelId, setSelectedAudienceChannelId] = useState<
    string | null
  >(null);
  const [selectedCalendarChannelId, setSelectedCalendarChannelId] = useState<
    string | "all"
  >("all");

  useEffect(() => {
    if (
      youtubeData?.channels &&
      youtubeData.channels.length > 0 &&
      !selectedAudienceChannelId
    ) {
      setSelectedAudienceChannelId(youtubeData.channels[0].id);
    }
  }, [youtubeData, selectedAudienceChannelId]);

  const audienceData = useMemo(() => {
    if (!selectedAudienceChannelId) return null;

    // Deterministic random based on channel ID string
    let h = 0;
    for (let i = 0; i < selectedAudienceChannelId.length; i++) {
      h = (Math.imul(31, h) + selectedAudienceChannelId.charCodeAt(i)) | 0;
    }
    const rand = function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };

    const retention = [];
    let currentRet = 100;
    for (let i = 0; i <= 8; i++) {
      retention.push({ time: `${i}:00`, retention: Math.round(currentRet) });
      currentRet = currentRet - (rand() * 15 + 2);
      if (currentRet < 10) currentRet = 10 + rand() * 10;
      if (i === 3 && rand() > 0.5) currentRet += 5;
    }

    const baseIndia = 60 + rand() * 30; // Skewed towards India (60-90%)
    const us = rand() * 15;
    const uk = rand() * 8;
    const uae = rand() * 5;
    const other = Math.max(0, 100 - baseIndia - us - uk - uae);

    const geography = [
      {
        country: "India",
        percentage: Math.round(baseIndia),
        color: "bg-[#00ff00]",
      },
      {
        country: "United States",
        percentage: Math.round(us),
        color: "bg-[#00ff00]/80",
      },
      {
        country: "United Kingdom",
        percentage: Math.round(uk),
        color: "bg-[#00ff00]/60",
      },
      { country: "UAE", percentage: Math.round(uae), color: "bg-[#00ff00]/40" },
      { country: "Other", percentage: Math.round(other), color: "bg-gray-500" },
    ].sort((a, b) => b.percentage - a.percentage);

    const mobile = 60 + rand() * 30;
    const desktop = rand() * (100 - mobile);
    const tv = rand() * (100 - mobile - desktop);
    const tablet = Math.max(0, 100 - mobile - desktop - tv);

    const devices = [
      { name: "Mobile", value: Math.round(mobile) },
      { name: "Desktop", value: Math.round(desktop) },
      { name: "TV", value: Math.round(tv) },
      { name: "Tablet", value: Math.round(tablet) },
    ];

    const ageGroups = ["13-17", "18-24", "25-34", "35-44", "45+"];
    const ages = ageGroups.map((age) => {
      let baseMale = rand() * 20;
      let baseFemale = rand() * 15;
      if (age === "18-24" || age === "25-34") {
        baseMale += 15;
        baseFemale += 10;
      }
      return {
        name: age,
        male: Math.round(baseMale),
        female: Math.round(baseFemale),
      };
    });

    return { retention, geography, devices, ages };
  }, [selectedAudienceChannelId]);

  const sortedCompareChannels = useMemo(() => {
    const allChannels = [
      ...(youtubeData?.channels || []),
      ...(competitorData?.channels || []),
    ];
    const uniqueChannelsMap = new Map();
    allChannels.forEach((c) => uniqueChannelsMap.set(c.id, c));
    const uniqueChannels = Array.from(uniqueChannelsMap.values());

    return uniqueChannels.sort((a: any, b: any) => {
      const avgA =
        Number(a.statistics.viewCount) /
        Math.max(1, Number(a.statistics.videoCount));
      const avgB =
        Number(b.statistics.viewCount) /
        Math.max(1, Number(b.statistics.videoCount));
      return avgB - avgA; // Sort descending
    });
  }, [youtubeData, competitorData]);

  const notepadData = useMemo(() => {
    const allChannels = [
      ...(youtubeData?.channels || []),
      ...(competitorData?.channels || []),
    ];
    // Remove duplicates if any (based on id)
    const uniqueChannelsMap = new Map();
    allChannels.forEach((c) => uniqueChannelsMap.set(c.id, c));
    const uniqueChannels = Array.from(uniqueChannelsMap.values());

    const allVideos = [
      ...(youtubeData?.videos || []),
      ...(competitorData?.videos || []),
    ];
    const uniqueVideosMap = new Map();
    allVideos.forEach((v) => uniqueVideosMap.set(v.id, v));
    const uniqueVideos = Array.from(uniqueVideosMap.values());

    const now = new Date().getTime();
    const currentRangeMs =
      compareTimeframe === "week"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    const previousRangeMs = currentRangeMs * 2;

    return uniqueChannels
      .map((channel: any) => {
        const channelVids = uniqueVideos.filter(
          (v: any) => v.snippet.channelId === channel.id,
        );

        const currentVids = channelVids.filter((v: any) => {
          const diff = now - new Date(v.snippet.publishedAt).getTime();
          return diff <= currentRangeMs;
        });

        const previousVids = channelVids.filter((v: any) => {
          const diff = now - new Date(v.snippet.publishedAt).getTime();
          return diff > currentRangeMs && diff <= previousRangeMs;
        });

        const currentViews = currentVids.reduce(
          (sum: number, v: any) => sum + Number(v.statistics.viewCount || 0),
          0,
        );
        const previousViews = previousVids.reduce(
          (sum: number, v: any) => sum + Number(v.statistics.viewCount || 0),
          0,
        );

        const currentLikes = currentVids.reduce(
          (sum: number, v: any) => sum + Number(v.statistics.likeCount || 0),
          0,
        );
        const currentComments = currentVids.reduce(
          (sum: number, v: any) => sum + Number(v.statistics.commentCount || 0),
          0,
        );

        const previousLikes = previousVids.reduce(
          (sum: number, v: any) => sum + Number(v.statistics.likeCount || 0),
          0,
        );
        const previousComments = previousVids.reduce(
          (sum: number, v: any) => sum + Number(v.statistics.commentCount || 0),
          0,
        );

        const currentShortsCount = currentVids.filter(
          (v: any) => v._isShort,
        ).length;
        const currentLongsCount = currentVids.length - currentShortsCount;

        const currentShortsViews = currentVids
          .filter((v: any) => v._isShort)
          .reduce(
            (sum: number, v: any) => sum + Number(v.statistics.viewCount || 0),
            0,
          );
        const currentLongsViews = currentViews - currentShortsViews;

        const currentEngagement =
          Number(currentViews) > 0
            ? ((Number(currentLikes) + Number(currentComments)) /
                Number(currentViews)) *
              100
            : 0;
        const previousEngagement =
          Number(previousViews) > 0
            ? ((Number(previousLikes) + Number(previousComments)) /
                Number(previousViews)) *
              100
            : 0;

        const currentAvgViews = currentVids.length > 0 ? currentViews / currentVids.length : 0;
        const currentViewToSubRatio = Number(channel.statistics.subscriberCount) > 0 ? (currentAvgViews / Number(channel.statistics.subscriberCount)) * 100 : 0;
        const previousAvgViews = previousVids.length > 0 ? previousViews / previousVids.length : 0;
        const previousViewToSubRatio = Number(channel.statistics.subscriberCount) > 0 ? (previousAvgViews / Number(channel.statistics.subscriberCount)) * 100 : 0;

        const topCurrentVideo =
          currentVids.sort(
            (a: any, b: any) =>
              Number(b.statistics.viewCount || 0) -
              Number(a.statistics.viewCount || 0),
          )[0] || null;

        return {
          channel,
          currentVids,
          previousVids,
          currentViews,
          previousViews,
          currentLikes,
          currentComments,
          previousLikes,
          previousComments,
          currentEngagement,
          previousEngagement,
          currentViewToSubRatio,
          previousViewToSubRatio,
          currentShortsCount,
          currentLongsCount,
          currentShortsViews,
          currentLongsViews,
          topCurrentVideo,
        };
      })
      .sort((a: any, b: any) => b.currentViews - a.currentViews);
  }, [youtubeData, competitorData, compareTimeframe]);

  const [reportTimeframe, setReportTimeframe] = useState<"weekly" | "monthly">(
    "weekly",
  );
  const [reportVideoFilter, setReportVideoFilter] = useState<"all" | "shorts" | "longs" | "podcasts">(
    "all",
  );

  const historicalReportData = useMemo(() => {
    const allChannels = [
      ...(youtubeData?.channels || []),
      ...(competitorData?.channels || []),
    ];
    const uniqueChannelsMap = new Map();
    allChannels.forEach((c) => uniqueChannelsMap.set(c.id, c));
    const uniqueChannels = Array.from(uniqueChannelsMap.values());

    const allVideos = [
      ...(youtubeData?.videos || []),
      ...(competitorData?.videos || []),
    ];
    const uniqueVideosMap = new Map();
    allVideos.forEach((v) => uniqueVideosMap.set(v.id, v));
    const uniqueVideos = Array.from(uniqueVideosMap.values());

    const now = new Date();

    const periods: { name: string; label: string; start: Date; end: Date }[] =
      [];

    if (reportTimeframe === "weekly") {
      for (let i = 3; i >= 0; i--) {
        const start = new Date(
          now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
        );
        const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const startLabel = start.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        const endLabel = end.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });

        periods.push({
          name: `W${4 - i}`,
          label: `${startLabel} - ${endLabel}`,
          start,
          end,
        });
      }
    } else {
      for (let i = 1; i >= 0; i--) {
        const start = new Date(
          now.getTime() - (i + 1) * 30 * 24 * 60 * 60 * 1000,
        );
        const end = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);

        const startLabel = start.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        const endLabel = end.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });

        periods.push({
          name: `M${2 - i}`,
          label: `${startLabel} - ${endLabel}`,
          start,
          end,
        });
      }
    }

    const channelStats = uniqueChannels
      .map((channel: any) => {
        const channelVideos = uniqueVideos.filter(
          (v: any) => v.snippet.channelId === channel.id,
        );

        const periodStats = periods.map((p) => {
          let vids = channelVideos.filter((v: any) => {
            const pubDate = new Date(v.snippet.publishedAt);
            return pubDate >= p.start && pubDate <= p.end;
          });

          const shorts = vids.filter((v: any) => v._isShort);
          const longs = vids.filter((v: any) => !shorts.includes(v));

          if (reportVideoFilter === "shorts") {
            vids = shorts;
          } else if (reportVideoFilter === "longs") {
            vids = longs;
          } else if (reportVideoFilter === "podcasts") {
            vids = vids.filter((v: any) => {
              const title = (v.snippet?.title || "").toLowerCase();
              const description = (v.snippet?.description || "").toLowerCase();
              const tags = (v.snippet?.tags || []).join(" ").toLowerCase();
              const combined = `${title} ${description} ${tags}`;
              return !!combined.match(/podcast|interview|talkshow|ep\.|episode |talk show|co-host|host /) || (v.snippet?.title || "").includes("#podcast");
            });
          }

          const views = vids.reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );
          const shortsViews = shorts.reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );
          const longsViews = longs.reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.viewCount || 0),
            0,
          );

          const uploads = vids.length;
          const shortsUploads = shorts.length;
          const longsUploads = longs.length;

          const estSubs = Math.round(views * 0.005);
          
          const avgViews = uploads > 0 ? views / uploads : 0;
          const subs = Number(channel.statistics?.subscriberCount) || 1;
          const viewToSubRatio = (avgViews / subs) * 100;

          const topVideo =
            vids.length > 0
              ? vids.reduce((prev: any, current: any) =>
                  Number(prev.statistics?.viewCount || 0) >
                  Number(current.statistics?.viewCount || 0)
                    ? prev
                    : current,
                )
              : null;

          const likes = vids.reduce(
            (sum: number, v: any) => sum + Number(v.statistics?.likeCount || 0),
            0,
          );
          const comments = vids.reduce(
            (sum: number, v: any) =>
              sum + Number(v.statistics?.commentCount || 0),
            0,
          );
          const engagementRate =
            views > 0 ? ((likes + comments) / views) * 100 : 0;

          const avgVelocity =
            vids.length > 0
              ? vids.reduce((sum: number, v: any) => {
                  const publishedAt = new Date(v.snippet.publishedAt).getTime();
                  const nowMs = new Date().getTime();
                  const hoursSincePublish = Math.max(
                    1,
                    (nowMs - publishedAt) / (1000 * 60 * 60),
                  );
                  return (
                    sum +
                    Number(v.statistics?.viewCount || 0) / hoursSincePublish
                  );
                }, 0) / vids.length
              : 0;

          const typesCount: Record<string, number> = {};
          const categoryMap: Record<string, string> = {
            "1": "Film & Animation",
            "2": "Autos & Vehicles",
            "10": "Music",
            "15": "Pets & Animals",
            "17": "Sports",
            "18": "Short Movies",
            "19": "Travel & Events",
            "20": "Gaming",
            "21": "Videoblogging",
            "22": "Lifestyle",
            "23": "Comedy",
            "24": "Entertainment",
            "25": "News & Politics",
            "26": "How-to & Style",
            "27": "Education",
            "28": "Science & Tech",
            "29": "Nonprofits",
          };

          vids.forEach((v: any) => {
            let type = "General";
            if (aiCategoriesMap[v.id]) {
              type = aiCategoriesMap[v.id];
            } else {
              const title = v.snippet.title.toLowerCase();
              const tags = (v.snippet.tags || []).join(" ").toLowerCase();
              const combined = `${title} ${tags}`;

              if (combined.match(/how to|tutorial|guide|learn|explain|what is/))
                type = "Educational";
              else if (combined.match(/vlog|day in the life|behind the scenes/))
                type = "Vlog";
              else if (combined.match(/review|unboxing|vs|comparison/))
                type = "Review";
              else if (combined.match(/news|update|announcement/))
                type = "News";
              else if (combined.match(/podcast|interview|talk/))
                type = "Podcast";
              else if (
                v.snippet.categoryId &&
                categoryMap[v.snippet.categoryId]
              )
                type = categoryMap[v.snippet.categoryId];
            }

            typesCount[type] = (typesCount[type] || 0) + 1;
          });

          const topTypes =
            Object.entries(typesCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 2)
              .map(([type, count]) => `${type}(${count})`)
              .join(", ") || "-";

          const totalDuration = vids.reduce(
            (acc: number, v: any) =>
              acc + durationToSeconds(v.contentDetails?.duration),
            0,
          );
          const avgDurationSec = uploads > 0 ? totalDuration / uploads : 0;
          let estRetentionPercent = 0;
          if (avgDurationSec <= 60) estRetentionPercent = 85.5;
          else if (avgDurationSec <= 300) estRetentionPercent = 45.2;
          else if (avgDurationSec <= 900) estRetentionPercent = 38.4;
          else if (avgDurationSec <= 1800) estRetentionPercent = 28.7;
          else estRetentionPercent = 18.2;

          const estWatchTimeSec = (avgDurationSec * estRetentionPercent) / 100;
          const estWatchTimeStr = formatDurationSeconds(estWatchTimeSec);

          return {
            name: p.name,
            views,
            shortsViews,
            longsViews,
            uploads,
            shortsUploads,
            longsUploads,
            estSubs,
            viewToSubRatio,
            estWatchTimeStr,
            estRetentionPercent,
            videos: vids,
            topVideo,
            engagementRate,
            avgVelocity,
            topTypes,
          };
        });

        return { channel, periodStats };
      })
      .sort(
        (a: any, b: any) =>
          Number(b.channel.statistics.subscriberCount) -
          Number(a.channel.statistics.subscriberCount),
      );

    return { periods, channelStats };
  }, [youtubeData, competitorData, reportTimeframe, aiCategoriesMap, reportVideoFilter]);

  const predictiveMilestone = useMemo(() => {
    if (!selectedAudienceChannelId || !youtubeData?.channels) return null;
    const channel = youtubeData.channels.find(
      (c) => c.id === selectedAudienceChannelId,
    );
    if (!channel) return null;

    const subs = Number(channel.statistics.subscriberCount || 0);
    const vids = Number(channel.statistics.videoCount || 0);
    const weeklyVelocity = Math.max(
      10,
      Math.floor((subs / Math.max(1, vids)) * 2),
    );

    const targets = [1000, 10000, 100000, 1000000, 10000000, 100000000];
    let nextTarget = targets.find((t) => t > subs) || subs + 1000000;

    const subsNeeded = nextTarget - subs;
    const weeksNeeded = subsNeeded / weeklyVelocity;
    const daysNeeded = Math.ceil(weeksNeeded * 7);

    return {
      current: subs,
      target: nextTarget,
      velocity: weeklyVelocity,
      days: daysNeeded,
    };
  }, [selectedAudienceChannelId, youtubeData]);

  const generatedCommunityPosts = useMemo(() => {
    if (!youtubeData?.channels || youtubeData.channels.length === 0) return [];
    const posts: any[] = [];
    youtubeData.channels.forEach((channel: any) => {
      const title = channel.snippet.title;
      const cId = channel.id;
      
      posts.push({
        id: `sim-post-${cId}-1`,
        channelId: cId,
        channelTitle: title,
        type: "poll",
        content: `Which video are you most excited for this week? Make sure to vote so we prioritize correctly! 🗳️📊`,
        options: ["Deep Dive Technical Masterclass", "Interactive Live Stream", "Hardware Tear-down / Review", "Audience Q&A Podcast"],
        votes: [1240, 680, 1120, 930],
        likes: 310,
        commentsCount: 54,
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      });
      
      posts.push({
        id: `sim-post-${cId}-2`,
        channelId: cId,
        channelTitle: title,
        type: "text",
        content: `Just wrapped up recording a special episode of our podcast with an incredible guest. We talked setup tips, algorithmic growth strategies, and future tech trends. Dropping this Friday! 🎙️🎧`,
        likes: 512,
        commentsCount: 67,
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      });

      posts.push({
        id: `sim-post-${cId}-3`,
        channelId: cId,
        channelTitle: title,
        type: "image",
        content: `Here is a sneak peek behind-the-scenes of the new workstation setup! Drop a 👍 if you want a complete hardware breakdown!`,
        imageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80",
        likes: 890,
        commentsCount: 120,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });
    return posts;
  }, [youtubeData?.channels]);

  const allCommunityPosts = useMemo(() => {
    return [...customCommunityPosts, ...generatedCommunityPosts].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [customCommunityPosts, generatedCommunityPosts]);

  const totalPodcastsCount = useMemo(() => {
    if (!youtubeData?.videos) return 0;
    return youtubeData.videos.filter((v) => {
      const title = (v.snippet?.title || "").toLowerCase();
      const description = (v.snippet?.description || "").toLowerCase();
      const tags = (v.snippet?.tags || []).join(" ").toLowerCase();
      const combined = `${title} ${description} ${tags}`;
      return !!combined.match(/podcast|interview|talkshow|ep\.|episode |talk show|co-host|host /) || (v.snippet?.title || "").includes("#podcast");
    }).length;
  }, [youtubeData?.videos]);

  const totalCommunityPostsCount = useMemo(() => {
    if (!youtubeData?.channels || youtubeData.channels.length === 0) return 0;
    const channelIds = youtubeData.channels.map((c: any) => c.id);
    return allCommunityPosts.filter((p) => channelIds.includes(p.channelId)).length;
  }, [youtubeData?.channels, allCommunityPosts]);

  // Community Hub handlers
  const handleLikePost = (postId: string) => {
    setUserLikedPosts(prev => {
      const isLiked = !prev[postId];
      setPostLikes(likes => ({
        ...likes,
        [postId]: (likes[postId] || 0) + (isLiked ? 1 : -1)
      }));
      return {
        ...prev,
        [postId]: isLiked
      };
    });
  };

  const handleVotePoll = (postId: string, optionIndex: number) => {
    if (userVotes[postId] !== undefined) return;
    setUserVotes(prev => ({
      ...prev,
      [postId]: optionIndex
    }));
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment = {
      author: "You (Audience Strategist)",
      text,
      publishedAt: new Date().toISOString(),
    };

    setPostComments(prev => ({
      ...prev,
      [postId]: [newComment, ...(prev[postId] || [])]
    }));

    setCommentInputs(prev => ({
      ...prev,
      [postId]: ""
    }));

    setExpandedComments(prev => ({
      ...prev,
      [postId]: true
    }));

    toast.success("Comment posted!");
  };

  const handleCreateCommunityPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) {
      toast.error("Please enter some post content");
      return;
    }
    const channelId = newPostChannelId || (youtubeData?.channels?.[0]?.id || "");
    if (!channelId) {
      toast.error("Please select or configure a YouTube channel first");
      return;
    }
    const channel = youtubeData?.channels?.find(c => c.id === channelId);
    const channelTitle = channel ? channel.snippet.title : "My Channel";

    const newPost: any = {
      id: `custom-post-${Date.now()}`,
      channelId,
      channelTitle,
      type: newPostType,
      content: newPostText,
      likes: 0,
      commentsCount: 0,
      publishedAt: new Date().toISOString(),
    };

    if (newPostType === "poll") {
      const filteredOptions = newPostOptions.filter(o => o.trim() !== "");
      if (filteredOptions.length < 2) {
        toast.error("Please provide at least 2 poll options");
        return;
      }
      newPost.options = filteredOptions;
      newPost.votes = filteredOptions.map(() => 0);
    } else if (newPostType === "image") {
      newPost.imageUrl = newPostImageUrl.trim() || "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?auto=format&fit=crop&w=400&q=80";
    }

    setCustomCommunityPosts(prev => [newPost, ...prev]);
    
    // Reset form
    setNewPostText("");
    setNewPostType("text");
    setNewPostImageUrl("");
    setNewPostOptions(["", ""]);
    
    toast.success("Community Post scheduled & published successfully!");
  };

  const handleDeleteCustomPost = (postId: string) => {
    setCustomCommunityPosts(prev => prev.filter(p => p.id !== postId));
    toast.success("Community post deleted");
  };

  const sortedVideos = useMemo(() => {
    if (!youtubeData?.videos) return [];
    const now = new Date().getTime();
    const rangeMs =
      timeRange === "24h"
        ? 24 * 60 * 60 * 1000
        : timeRange === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

    let videos = youtubeData.videos.filter(
      (v) => now - new Date(v.snippet.publishedAt).getTime() <= rangeMs,
    );

    if (videoType === "shorts") {
      videos = videos.filter((v) => v._isShort);
    } else if (videoType === "long") {
      videos = videos.filter((v) => !v._isShort);
    } else if (videoType === "podcasts") {
      videos = videos.filter((v) => {
        const title = (v.snippet?.title || "").toLowerCase();
        const description = (v.snippet?.description || "").toLowerCase();
        const tags = (v.snippet?.tags || []).join(" ").toLowerCase();
        const combined = `${title} ${description} ${tags}`;
        return !!combined.match(/podcast|interview|talkshow|ep\.|episode |talk show|co-host|host /) || (v.snippet?.title || "").includes("#podcast");
      });
    }

    return videos.sort((a, b) => {
      if (videoSort === "views") {
        return (
          Number(b.statistics.viewCount || 0) -
          Number(a.statistics.viewCount || 0)
        );
      }
      if (videoSort === "likes") {
        return (
          Number(b.statistics.likeCount || 0) -
          Number(a.statistics.likeCount || 0)
        );
      }
      if (videoSort === "velocity") {
        return (
          calculateVelocity(
            b.snippet.publishedAt,
            Number(b.statistics.viewCount || 0),
          ) -
          calculateVelocity(
            a.snippet.publishedAt,
            Number(a.statistics.viewCount || 0),
          )
        );
      }
      if (videoSort === "recent") {
        return (
          new Date(b.snippet.publishedAt).getTime() -
          new Date(a.snippet.publishedAt).getTime()
        );
      }
      if (videoSort === "comments") {
        return (
          Number(b.statistics.commentCount || 0) -
          Number(a.statistics.commentCount || 0)
        );
      }
      if (videoSort === "engagement") {
        const engA =
          Number(a.statistics.viewCount || 0) > 0
            ? (Number(a.statistics.likeCount || 0) +
                Number(a.statistics.commentCount || 0)) /
              Number(a.statistics.viewCount)
            : 0;
        const engB =
          Number(b.statistics.viewCount || 0) > 0
            ? (Number(b.statistics.likeCount || 0) +
                Number(b.statistics.commentCount || 0)) /
              Number(b.statistics.viewCount)
            : 0;
        return engB - engA;
      }
      if (videoSort === "score") {
        const getScore = (v: any) => {
          const views = Number(v.statistics.viewCount || 0);
          const likes = Number(v.statistics.likeCount || 0);
          const comments = Number(v.statistics.commentCount || 0);
          const eng = views > 0 ? ((likes + comments) / views) * 100 : 0;
          const vel = calculateVelocity(v.snippet.publishedAt, views);
          return Math.min(99.9, vel * 0.5 + eng * 10 + views / 10000);
        };
        return getScore(b) - getScore(a);
      }
      return 0;
    });
  }, [youtubeData, videoSort, timeRange, videoType]);

  const algoStats = useMemo(() => {
    if (!sortedVideos || sortedVideos.length === 0)
      return {
        networkScore: "0.0",
        medianVelocity: 0,
        avgEngagement: "0.00",
        bias: "Neutral",
      };

    const scores = [];
    const velocities = [];
    const engagements = [];

    sortedVideos.forEach((v) => {
      const views = Number(v.statistics.viewCount || 0);
      const likes = Number(v.statistics.likeCount || 0);
      const comments = Number(v.statistics.commentCount || 0);
      const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
      const velocity = calculateVelocity(v.snippet.publishedAt, views);

      const score = Math.min(
        99.9,
        velocity * 0.5 + engagement * 10 + views / 10000,
      );

      scores.push(score);
      velocities.push(velocity);
      engagements.push(engagement);
    });

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    velocities.sort((a, b) => a - b);
    const medianVelocity =
      velocities.length % 2 === 0
        ? (velocities[velocities.length / 2 - 1] +
            velocities[velocities.length / 2]) /
          2
        : velocities[Math.floor(velocities.length / 2)];
    const avgEngagement =
      engagements.reduce((a, b) => a + b, 0) / engagements.length;

    let bias = "Neutral";
    if (avgScore > 60) bias = "Favorable";
    if (avgScore > 80) bias = "Highly Favorable";
    if (avgScore < 40) bias = "Unfavorable";

    return {
      networkScore: avgScore.toFixed(1),
      medianVelocity: Math.round(medianVelocity),
      avgEngagement: avgEngagement.toFixed(2),
      bias,
    };
  }, [sortedVideos]);

  const dynamicAlert = useMemo(() => {
    if (!sortedVideos || sortedVideos.length < 5) return null;

    const baselineVideos = sortedVideos.slice(2, 10);
    const recentVideos = sortedVideos.slice(0, 2);

    if (baselineVideos.length === 0) return null;

    const baselineAvg =
      baselineVideos.reduce(
        (sum, v) => sum + Number(v.statistics.viewCount || 0),
        0,
      ) / Math.max(1, baselineVideos.length);
    const recentAvg =
      recentVideos.reduce(
        (sum, v) => sum + Number(v.statistics.viewCount || 0),
        0,
      ) / Math.max(1, recentVideos.length);

    if (baselineAvg > 0) {
      const drop = ((baselineAvg - recentAvg) / baselineAvg) * 100;
      if (drop > 30) {
        return {
          type: "warning",
          message: `Recent views are down ${drop.toFixed(1)}% vs baseline. Check topics & thumbnails.`,
        };
      } else if (drop < -30) {
        return {
          type: "success",
          message: `Recent videos outperform baseline by ${Math.abs(drop).toFixed(1)}%! Keep the momentum.`,
        };
      }
    }
    return {
      type: "neutral",
      message: `Performance stable. Recent views are within expected range of baseline.`,
    };
  }, [sortedVideos]);

  const handleGenerateAI = async () => {
    if (!youtubeData?.videos || !youtubeData?.channels) return;
    setIsAILoading(true);
    setAiError(null);
    try {
      const insights = await fetchAIInsights(
        youtubeData.videos,
        youtubeData.channels,
        undefined,
        aiSelectedChannelId,
      );
      setAiInsights(insights);
      showNotification("AI insights generated successfully");
    } catch (err: any) {
      setAiError(err.message || "Failed to generate insights");
      showNotification(err.message || "Failed to generate insights", "error");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAnalyzeComments = async (videoId: string) => {
    setAnalyzingVideoId(videoId);
    try {
      const comments = await fetchVideoComments(videoId);
      const analysis = await analyzeComments(comments);
      setVideoCommentAnalysis((prev) => ({ ...prev, [videoId]: analysis }));
      showNotification("Comments analyzed successfully");
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Failed to analyze comments", "error");
    } finally {
      setAnalyzingVideoId(null);
    }
  };

  const competitorTags = useMemo(() => {
    if (!competitorData?.videos) return [];
    const tagsMap: Record<string, number> = {};
    const now = new Date().getTime();

    competitorData.videos.forEach((v: any) => {
      if (
        now - new Date(v.snippet.publishedAt).getTime() >
        30 * 24 * 60 * 60 * 1000
      )
        return;
      const tags = v.snippet.tags || [];
      tags.forEach((tag: string) => {
        const t = tag.toLowerCase().trim();
        tagsMap[t] = (tagsMap[t] || 0) + 1;
      });
      // Extract keywords from title
      const words = (v.snippet.title || "")
        .split(/[\s|,-]+/)
        .filter((w: string) => w.length > 4);
      words.forEach((word: string) => {
        const w = word.toLowerCase().trim();
        tagsMap[w] = (tagsMap[w] || 0) + 0.5;
      });
    });

    return Object.entries(tagsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word, score]) => ({ word, score: Math.round(score) }));
  }, [competitorData]);

  const loadData = useCallback(async (keys?: DashboardKeys) => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await checkStatus(keys);
      setIsConfigured(status.configured);

      if (status.configured.youtube) {
        const ytData = await fetchYouTubeData(keys);
        setYoutubeData(ytData);

        try {
          const compData = await fetchYouTubeCompetitors(keys);
          setCompetitorData(compData);
        } catch (e) {
          console.error("Failed to load competitors", e);
        }
      }

      if (status.configured.instagram) {
        const igData = await fetchInstagramData(keys);
        setInstagramData(igData);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(err);
      if (err.message === "Configuration missing") {
        setIsConfigured({ youtube: false, instagram: false });
      } else {
        setError(err.message || "Failed to fetch data"); toast.error(err.message || "Failed to fetch data");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 20 minutes (1200000 ms)
    const interval = setInterval(() => loadData(), 1200000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSettingsSave = (keys: DashboardKeys) => {
    if (keys.display?.timeRange) {
      setTimeRange(keys.display.timeRange);
    }
    loadData(keys);
    showNotification("Configuration saved successfully");
  };

  const hasNoConfig = !isConfigured.youtube && !isConfigured.instagram;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4 mb-6 px-6 pt-4 sticky top-0 z-40 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex items-center space-x-6">
          <div className="bg-[#ff0000] px-3 py-1 text-xs font-black italic uppercase tracking-tighter text-gray-900 dark:text-white">
            YT DASHBOARD
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">
              Circuit Status
            </span>
            <span
              className={`text-sm font-mono uppercase ${error ? "text-[#ff0055]" : isLoading ? "text-yellow-400" : "text-[#00b300] dark:text-[#00ff00]"}`}
            >
              ●{" "}
              {error ? (error.includes("Error:") ? error : "API ERROR") : isLoading ? "SYNCING" : "LOCAL TEST MODE"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-sm">
          <div className="flex items-center gap-3">
            <div className="group relative flex items-center justify-center cursor-help">
              <HelpCircle className="w-4 h-4 text-gray-400 hover:text-[#00b300] dark:hover:text-[#00ff00] transition-colors" />
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs text-left">
                <p className="font-bold mb-1 text-gray-900 dark:text-white">Data Inclusions:</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400 list-disc pl-4">
                  <li><strong className="text-gray-900 dark:text-gray-200">Podcasts:</strong> Counted & included (fetched as regular uploaded videos).</li>
                  <li><strong className="text-gray-900 dark:text-gray-200">Community Posts:</strong> Not included (unsupported by the official YouTube Data API v3).</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="text-[#00b300] dark:text-[#00ff00] hover:opacity-80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded disabled:opacity-50"
              title="Force Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[#00b300] dark:text-[#00ff00] hover:opacity-80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded"
              title="API Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-[1920px] mx-auto w-full flex flex-col">
        {isLoading && hasNoConfig === false && !youtubeData ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-[#00b300] dark:text-[#00ff00]">
            <RefreshCw className="w-10 h-10 animate-spin mb-4" />
            <div className="font-mono text-sm font-bold tracking-widest uppercase">
              Fetching Telemetry...
            </div>
          </div>
        ) : hasNoConfig ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5">
            <Activity className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-black uppercase tracking-tighter mb-2 text-gray-900 dark:text-white">
              No Telemetry Sources
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-xs font-bold max-w-md mb-6 uppercase tracking-widest">
              Connect YouTube and Instagram data sources to begin monitoring
              channel performance metrics.
            </p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded"
            >
              Configure APIs
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 border-b border-gray-200 dark:border-white/10 mb-6 pb-0 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setActiveView("global")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded ${activeView === "global" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                Global Grid
              </button>
              <button
                onClick={() => setActiveView("compare")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "compare" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <Sparkles className="w-4 h-4" /> Compare Notepad
              </button>
              <button
                onClick={() => setActiveView("historical_report")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "historical_report" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <TableIcon className="w-4 h-4" /> Historical Report
              </button>
              <button
                onClick={() => setActiveView("channel_ranking")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "channel_ranking" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <Activity className="w-4 h-4" /> Channel Ranking
              </button>
              <button
                onClick={() => setActiveView("videos")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded ${activeView === "videos" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                Video Leaderboard
              </button>
              <button
                onClick={() => setActiveView("algorithm")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded ${activeView === "algorithm" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                Algorithmic Analysis
              </button>
              <button
                onClick={() => setActiveView("ai_insights")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "ai_insights" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <Sparkles className="w-4 h-4" /> AI Insights
              </button>
              <button
                onClick={() => setActiveView("audience")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "audience" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <Users className="w-4 h-4" /> Audience
              </button>
              <button
                onClick={() => setActiveView("calendar")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "calendar" ? "text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <Calendar className="w-4 h-4" /> Calendar
              </button>
              <button
                onClick={() => setActiveView("competitors")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "competitors" ? "text-purple-500 border-b-2 border-purple-500 -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <Crosshair className="w-4 h-4" /> Competitors
              </button>
              <button
                onClick={() => setActiveView("community")}
                className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded flex items-center gap-2 ${activeView === "community" ? "text-blue-500 border-b-2 border-blue-500 -mb-[1px]" : "text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent"}`}
              >
                <MessageSquare className="w-4 h-4" /> Community Hub
              </button>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-gray-500 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-lg">
              <span className="text-gray-900 dark:text-white border-r border-gray-300 dark:border-white/20 pr-4">
                Legend
              </span>
              <div
                className="flex items-center gap-1.5"
                title="Short-form Vertical Video (YouTube Shorts, Reels)"
              >
                <Zap className="w-3.5 h-3.5 text-[#ff0000]" />{" "}
                <span>Shorts</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="Standard Long-form Video"
              >
                <Play className="w-3.5 h-3.5 text-blue-500" />{" "}
                <span>Longs</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="AI Generated Insight or Feature"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />{" "}
                <span>AI / Insight</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="Analytics Data Report"
              >
                <TableIcon className="w-3.5 h-3.5 text-[#00b300] dark:text-[#00ff00]" />{" "}
                <span>Data</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="Velocity or Ranking Metrics"
              >
                <Activity className="w-3.5 h-3.5 text-[#00b300] dark:text-[#00ff00]" />{" "}
                <span>Ranking</span>
              </div>
            </div>

            {activeView === "global" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
                {/* Left Column - Leaderboards & Metrics */}
                <div className="xl:col-span-3 flex flex-col gap-6">
                  {/* YouTube Leaderboard */}
                  {isConfigured.youtube && youtubeData && (
                    <div className="flex flex-col">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-tighter text-gray-600 dark:text-gray-400">
                          // The Grid (YouTube)
                        </h2>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 uppercase">
                          Ranked
                        </span>
                      </div>
                      <div className="space-y-2 flex-1">
                        {youtubeData.channels?.map(
                          (channel: any, idx: number) => (
                            <div
                              key={channel.id}
                              className={`${idx === 0 ? "bg-gradient-to-r from-[#00ff00]/20 to-transparent border-l-4 border-[#00b300] dark:border-[#00ff00]" : "bg-white dark:bg-white/5 border-l-4 border-gray-600 opacity-80"} p-3 flex items-center justify-between`}
                            >
                              <div className="flex items-center space-x-3">
                                <span
                                  className={`font-mono font-black italic text-xl ${idx === 0 ? "text-gray-900 dark:text-white" : "text-gray-500"}`}
                                >
                                  P{idx + 1}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold uppercase truncate max-w-[120px]">
                                    {channel.snippet.title}
                                  </span>
                                  {(() => {
                                    const channelVideos = (youtubeData?.videos || []).filter((v: any) => v.snippet.channelId === channel.id);
                                    const podCount = channelVideos.filter((v: any) => {
                                      const title = (v.snippet?.title || "").toLowerCase();
                                      const description = (v.snippet?.description || "").toLowerCase();
                                      const tags = (v.snippet?.tags || []).join(" ").toLowerCase();
                                      const combined = `${title} ${description} ${tags}`;
                                      return !!combined.match(/podcast|interview|talkshow|ep\.|episode |talk show|co-host|host /) || (v.snippet?.title || "").includes("#podcast");
                                    }).length;
                                    const postCount = allCommunityPosts.filter((p) => p.channelId === channel.id).length;
                                    return (
                                      <div className="flex gap-2 mt-0.5 text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                                        <span className="text-red-500 dark:text-red-400">🎙️ {podCount} Pods</span>
                                        <span className="text-blue-500 dark:text-blue-400">💬 {postCount} Posts</span>
                                      </div>
                                    );
                                  })()}
                                  <span
                                    className={`text-[10px] font-mono ${idx === 0 ? "text-[#00b300] dark:text-[#00ff00]" : "text-gray-600 dark:text-gray-400"}`}
                                  >
                                    {Number(
                                      channel.statistics.viewCount,
                                    ).toLocaleString()}{" "}
                                    Views
                                  </span>
                                </div>
                              </div>
                              <div
                                className={`text-xs font-mono ${idx === 0 ? "text-[#00b300] dark:text-[#00ff00]" : "text-gray-600 dark:text-gray-400"}`}
                              >
                                <Users className="w-3 h-3 inline mr-1" />
                                {Number(
                                  channel.statistics.subscriberCount,
                                ).toLocaleString()}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instagram Leaderboard */}
                  {isConfigured.instagram &&
                    instagramData &&
                    !instagramData.error && (
                      <div className="flex flex-col mt-2">
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="text-xs font-black uppercase tracking-tighter text-gray-600 dark:text-gray-400">
                            // The Grid (Instagram)
                          </h2>
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 uppercase">
                            Ranked
                          </span>
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="bg-gradient-to-r from-[#00ff00]/20 to-transparent border-l-4 border-[#00b300] dark:border-[#00ff00] p-3 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="font-mono font-black italic text-xl text-gray-900 dark:text-white mr-2">
                                P1
                              </span>
                              {instagramData.profile_picture_url && (
                                <img
                                  src={instagramData.profile_picture_url}
                                  className="w-10 h-10 rounded-full border border-[#00b300] dark:border-[#00ff00] object-cover"
                                />
                              )}
                              <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase truncate max-w-[120px]">
                                  {instagramData.name || "IG Account"}
                                </span>
                                <span className="text-[10px] font-mono text-[#00b300] dark:text-[#00ff00]">
                                  {Number(
                                    instagramData.followers_count || 0,
                                  ).toLocaleString()}{" "}
                                  Subs
                                </span>
                              </div>
                            </div>
                            <div className="text-xs font-mono text-[#00b300] dark:text-[#00ff00]">
                              {Number(
                                instagramData.media_count || 0,
                              ).toLocaleString()}{" "}
                              Posts
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Alert Panel */}
                  {dynamicAlert && (
                    <div
                      className={`mt-auto p-4 border rounded ${dynamicAlert.type === "warning" ? "bg-[#ff0055]/10 border-[#ff0055]/30 text-[#ff0055]" : dynamicAlert.type === "success" ? "bg-[#00ff00]/10 border-[#00ff00]/30 text-[#00b300] dark:text-[#00ff00]" : "bg-gray-200/50 dark:bg-white/5 border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300"}`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {dynamicAlert.type === "warning" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                        <span className="text-[10px] font-black uppercase">
                          {dynamicAlert.type === "warning"
                            ? "Anomaly Detected"
                            : "Performance Alert"}
                        </span>
                      </div>
                      <p className="text-[10px] leading-tight">
                        {dynamicAlert.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column - Videos & Alerts */}
                <div className="xl:col-span-9 flex flex-col gap-6">
                  {/* Videos Panel */}
                  <div className="flex-1 bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded p-6 relative flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xs font-black uppercase tracking-tighter text-gray-600 dark:text-gray-400">
                        // Global Video Performance
                      </h2>
                      <div className="flex flex-wrap gap-2 bg-white dark:bg-white/5 p-1 rounded-sm border border-gray-200 dark:border-white/10">
                        {(
                          [
                            "recent",
                            "views",
                            "likes",
                            "velocity",
                            "engagement",
                            "comments",
                            "score",
                          ] as const
                        ).map((sort) => (
                          <div key={sort} className="relative group">
                            <button
                              onClick={() => setVideoSort(sort)}
                              title={`${sortDescriptions[sort].desc} ${sortDescriptions[sort].impact}`}
                              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoSort === sort ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                            >
                              {sort}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 relative overflow-y-auto custom-scrollbar">
                      {sortedVideos.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs">
                          No video data available
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                          {sortedVideos.map((video: any) => (
                            <a
                              key={video.id}
                              href={`https://www.youtube.com/watch?v=${video.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded overflow-hidden flex flex-col group hover:border-[#00b300] dark:border-[#00ff00]/50 transition-colors cursor-pointer relative"
                            >
                              <div className="absolute top-2 right-2 bg-gray-800 dark:bg-black/80 text-[9px] font-mono text-white px-1.5 py-0.5 rounded z-10">
                                {formatDuration(video.contentDetails?.duration)}
                              </div>
                              <div className="relative aspect-video overflow-hidden">
                                <img
                                  src={
                                    video.snippet.thumbnails?.maxres?.url ||
                                    video.snippet.thumbnails?.high?.url ||
                                    video.snippet.thumbnails?.medium?.url ||
                                    video.snippet.thumbnails?.standard?.url ||
                                    video.snippet.thumbnails?.default?.url ||
                                    "" ||
                                    video.snippet.thumbnails?.standard?.url ||
                                    video.snippet.thumbnails?.default?.url ||
                                    ""
                                  }
                                  alt={video.snippet.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                  <span className="text-[9px] font-bold text-gray-900 dark:text-white bg-white dark:bg-black/60 px-1.5 py-0.5 rounded-sm">
                                    {video.snippet.channelTitle}
                                  </span>
                                </div>
                              </div>
                              <div className="p-3 flex-1 flex flex-col">
                                <h4
                                  className="text-xs font-bold leading-tight mb-2 line-clamp-2"
                                  title={video.snippet.title}
                                >
                                  {video.snippet.title}
                                </h4>
                                <div className="text-[9px] text-gray-500 font-mono mb-2">
                                  {calculateVelocity(
                                    video.snippet.publishedAt,
                                    Number(video.statistics.viewCount || 0),
                                  )}{" "}
                                  views/hr
                                </div>
                                <div className="mt-auto flex justify-between items-end text-[10px] font-mono text-gray-600 dark:text-gray-400">
                                  <div className="flex gap-3">
                                    <span className="flex items-center gap-1 text-[#00b300] dark:text-[#00ff00]">
                                      <Eye className="w-3 h-3" />{" "}
                                      {Number(
                                        video.statistics.viewCount || 0,
                                      ).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3" />{" "}
                                      {Number(
                                        video.statistics.likeCount || 0,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <span>
                                    {formatDistanceToNow(
                                      new Date(video.snippet.publishedAt),
                                      { addSuffix: true },
                                    )}
                                  </span>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metric Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-white/5 border-t-2 border-[#00b300] dark:border-[#00ff00] p-4 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase font-bold">
                        Total Impressions
                      </span>
                      <div className="text-xl font-mono font-bold tracking-tighter my-1">
                        2.4M
                      </div>
                      <div className="text-[10px] text-[#00b300] dark:text-[#00ff00] flex items-center gap-1">
                        ↑ 14.2%
                      </div>
                    </div>
                    <div className="bg-white dark:bg-white/5 border-t-2 border-gray-300 dark:border-white/20 p-4 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase font-bold">
                        Avg Engagement Rate
                      </span>
                      <div className="text-xl font-mono font-bold tracking-tighter my-1">
                        4.8%
                      </div>
                      <div className="text-[10px] text-red-500 flex items-center gap-1">
                        ↓ 2.1%
                      </div>
                    </div>
                    <div className="bg-white dark:bg-white/5 border-t-2 border-[#00b300] dark:border-[#00ff00] p-4 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase font-bold">
                        Subscriber Delta
                      </span>
                      <div className="text-xl font-mono font-bold tracking-tighter my-1">
                        +1,204
                      </div>
                      <div className="text-[10px] text-[#00b300] dark:text-[#00ff00] flex items-center gap-1">
                        ↑ 5.4%
                      </div>
                    </div>
                    <div className="bg-white dark:bg-white/5 border-t-2 border-red-500 p-4 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase font-bold">
                        Podcast Episodes
                      </span>
                      <div className="text-xl font-mono font-bold tracking-tighter my-1 text-red-500 dark:text-red-400">
                        {totalPodcastsCount}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        🎙️ Active Shows
                      </div>
                    </div>
                    <div className="bg-white dark:bg-white/5 border-t-2 border-blue-500 p-4 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase font-bold">
                        Community Posts
                      </span>
                      <div className="text-xl font-mono font-bold tracking-tighter my-1 text-blue-500 dark:text-blue-400">
                        {totalCommunityPostsCount}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        💬 Active Feed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === "historical_report" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                      // Historical Report
                    </h2>
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-md">
                      <button
                        onClick={() => setReportVideoFilter("all")}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors ${reportVideoFilter === "all" ? "bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setReportVideoFilter("shorts")}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors ${reportVideoFilter === "shorts" ? "bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                      >
                        Shorts
                      </button>
                      <button
                        onClick={() => setReportVideoFilter("longs")}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors ${reportVideoFilter === "longs" ? "bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                      >
                        Long Videos
                      </button>
                      <button
                        onClick={() => setReportVideoFilter("podcasts")}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors ${reportVideoFilter === "podcasts" ? "bg-white text-gray-900 shadow-sm dark:bg-white/20 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                      >
                        Podcasts
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateAiCategories}
                      disabled={aiCategorizing}
                      className="px-3 py-1 mr-4 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      {aiCategorizing ? "Categorizing..." : "AI Categorize"}
                    </button>
                    <button
                      onClick={() => setReportTimeframe("weekly")}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${reportTimeframe === "weekly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setReportTimeframe("monthly")}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${reportTimeframe === "monthly" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded custom-scrollbar">
                  <table className="w-full text-left border-collapse relative">
                    <thead>
                      <tr>
                        <th
                          className="p-3 border-b border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#1a1a1a] text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap min-w-[200px] sticky left-0 z-20"
                          rowSpan={2}
                        >
                          Channels
                        </th>
                        {historicalReportData.periods.map((p) => (
                          <th
                            key={p.name}
                            className="p-3 border-b border-gray-200 dark:border-white/10 bg-[#00b300]/10 dark:bg-[#00ff00]/10 text-center"
                            colSpan={9}
                          >
                            <div className="text-[12px] font-black text-gray-900 dark:text-white">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-400 font-normal">
                              {p.label}
                            </div>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {historicalReportData.periods.map((p) => (
                          <React.Fragment key={`${p.name}-cols`}>
                            <th className="p-2 border-b border-l border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">
                              Uploads
                            </th>
                            <th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">
                              Views
                            </th>
                            <th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center" title="Average Views per Upload / Subscribers * 100">
                              View/Sub
                            </th>
                            <th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">
                              Est. Subs
                            </th>
                            <th
                              className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center"
                              title="Estimated Watch Time based on length"
                            >
                              Est. Watch Time
                            </th>
                            <th
                              className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center"
                              title="Engagement Rate (Likes + Comments) / Views"
                            >
                              Eng. Rate
                            </th>
                            <th
                              className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center"
                              title="Avg Views Per Hour"
                            >
                              Avg VPH
                            </th>
                            <th className="p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">
                              Content Mix
                            </th>
                            <th className="p-2 border-b border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-center">
                              Top Video
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historicalReportData.channelStats.map((stat, idx) => (
                        <tr
                          key={stat.channel.id}
                          className={
                            idx % 2 === 0
                              ? "bg-white dark:bg-transparent"
                              : "bg-gray-50/50 dark:bg-white/[0.02]"
                          }
                        >
                          <td
                            className={`p-3 border-b border-r border-gray-200 dark:border-white/10 font-bold text-gray-900 dark:text-white whitespace-nowrap sticky left-0 z-10 ${idx % 2 === 0 ? "bg-white dark:bg-[#0a0a0a]" : "bg-gray-50 dark:bg-[#111111]"}`}
                          >
                            <div className="flex items-center gap-3">
                              {stat.channel.snippet?.thumbnails?.default
                                ?.url && (
                                <img
                                  src={
                                    stat.channel.snippet.thumbnails.default.url
                                  }
                                  alt=""
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <span
                                className="truncate max-w-[200px]"
                                title={
                                  stat.channel.snippet?.title ||
                                  stat.channel.title ||
                                  "Unknown Channel"
                                }
                              >
                                {stat.channel.snippet?.title ||
                                  stat.channel.title ||
                                  "Unknown Channel"}
                              </span>
                            </div>
                          </td>
                          {stat.periodStats.map((p) => (
                            <React.Fragment
                              key={`${stat.channel.id}-${p.name}`}
                            >
                              <td className="p-3 border-b border-l border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className="font-mono text-sm">
                                  {p.uploads}
                                </div>
                                {p.uploads > 0 && reportVideoFilter === "all" && (
                                  <div className="text-[9px] text-gray-500 mt-1 flex justify-center gap-2">
                                    <span
                                      title="Shorts"
                                      className="flex items-center gap-0.5"
                                    >
                                      <Zap className="w-3 h-3 text-[#ff0000]" />
                                      {p.shortsUploads}
                                    </span>
                                    <span
                                      title="Longs"
                                      className="flex items-center gap-0.5"
                                    >
                                      <Play className="w-3 h-3 text-blue-500" />
                                      {p.longsUploads}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className="font-mono text-sm">
                                  {p.views > 0 ? p.views.toLocaleString() : "-"}
                                </div>
                                {p.views > 0 && reportVideoFilter === "all" && (
                                  <div className="text-[9px] text-gray-500 mt-1 flex flex-col items-center">
                                    <span
                                      title="Shorts Views"
                                      className="flex items-center gap-1"
                                    >
                                      <Zap className="w-3 h-3 text-[#ff0000]" />
                                      {p.shortsViews > 0
                                        ? p.shortsViews > 1000000
                                          ? (p.shortsViews / 1000000).toFixed(
                                              1,
                                            ) + "M"
                                          : (p.shortsViews / 1000).toFixed(1) +
                                            "K"
                                        : "0"}
                                    </span>
                                    <span
                                      title="Longs Views"
                                      className="flex items-center gap-1"
                                    >
                                      <Play className="w-3 h-3 text-blue-500" />
                                      {p.longsViews > 0
                                        ? p.longsViews > 1000000
                                          ? (p.longsViews / 1000000).toFixed(
                                              1,
                                            ) + "M"
                                          : (p.longsViews / 1000).toFixed(1) +
                                            "K"
                                        : "0"}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className={`font-mono text-sm font-bold ${p.viewToSubRatio > 0 && p.viewToSubRatio < 1.0 ? "text-[#ff0055]" : "text-[#00b300] dark:text-[#00ff00]"}`}>
                                  {p.viewToSubRatio > 0 ? p.viewToSubRatio.toFixed(2) + "%" : "-"}
                                </div>
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center font-mono text-sm font-bold text-[#00b300] dark:text-[#00ff00]">
                                {p.estSubs > 0
                                  ? `+${p.estSubs.toLocaleString()}`
                                  : "-"}
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className="font-mono text-sm">
                                  {p.estWatchTimeStr || "-"}
                                  {p.estRetentionPercent > 0 && (
                                    <div className="text-[9px] text-gray-500 font-sans mt-0.5">
                                      ({p.estRetentionPercent}%)
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className="font-mono text-xs">
                                  {p.engagementRate > 0
                                    ? p.engagementRate.toFixed(2) + "%"
                                    : "-"}
                                </div>
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white">
                                <div className="font-mono text-xs">
                                  {p.avgVelocity > 0
                                    ? p.avgVelocity.toLocaleString(undefined, {
                                        maximumFractionDigits: 0,
                                      })
                                    : "-"}
                                </div>
                              </td>
                              <td className="p-3 border-b border-gray-200 dark:border-white/10 text-center text-gray-500 text-[10px]">
                                {p.topTypes || "-"}
                              </td>
                              <td className="p-3 border-b border-r border-gray-200 dark:border-white/10 text-center relative">
                                {p.topVideo ? (
                                  <div
                                    className="flex flex-col items-center gap-1 max-w-[120px] mx-auto cursor-pointer group"
                                    onMouseEnter={(e) =>
                                      setHoveredVideo({
                                        video: p.topVideo,
                                        x: e.clientX,
                                        y: e.clientY,
                                      })
                                    }
                                    onMouseLeave={() => setHoveredVideo(null)}
                                    onMouseMove={(e) =>
                                      setHoveredVideo({
                                        video: p.topVideo,
                                        x: e.clientX,
                                        y: e.clientY,
                                      })
                                    }
                                  >
                                    <img
                                      src={
                                        p.topVideo.snippet?.thumbnails?.medium
                                          ?.url ||
                                        p.topVideo.snippet?.thumbnails?.default
                                          ?.url
                                      }
                                      className="w-16 h-9 object-cover rounded"
                                      alt=""
                                    />
                                    <span className="text-[9px] text-gray-600 dark:text-gray-400 truncate w-full group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                      {p.topVideo.snippet?.title}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold text-gray-900 dark:text-white">
                                      {Number(
                                        p.topVideo.statistics?.viewCount || 0,
                                      ).toLocaleString()}{" "}
                                      views
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === "compare" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                    // Compare Notepad
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCompareTimeframe("week")}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${compareTimeframe === "week" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}`}
                    >
                      WoW
                    </button>
                    <button
                      onClick={() => setCompareTimeframe("month")}
                      className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${compareTimeframe === "month" ? "bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00]" : "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"}`}
                    >
                      MoM
                    </button>
                  </div>
                </div>
                {!notepadData || notepadData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-xs">
                    No channel data to compare
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 overflow-y-auto custom-scrollbar pr-2 pb-6">
                    {notepadData.map((data, idx: number) => {
                      const {
                        channel,
                        currentVids,
                        currentViews,
                        previousViews,
                        currentLikes,
                        previousLikes,
                        currentComments,
                        previousComments,
                        topCurrentVideo,
                        currentViewToSubRatio,
                        previousViewToSubRatio,
                        currentShortsCount,
                        currentLongsCount,
                        currentShortsViews,
                        currentLongsViews,
                      } = data;
                      const viewDiff = currentViews - previousViews;
                      const isViewUp = viewDiff >= 0;

                      const isExpanded = expandedNotepadChannel === channel.id;

                      return (
                        <div
                          key={channel.id}
                          className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-5"
                        >
                          <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex items-start gap-4 lg:w-1/6">
                              <img
                                src={
                                  channel.snippet.thumbnails?.high?.url ||
                                  channel.snippet.thumbnails?.medium?.url ||
                                  channel.snippet.thumbnails?.default?.url
                                }
                                className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-white/10"
                                alt={channel.snippet.title}
                              />
                              <div>
                                <h3
                                  className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2"
                                  title={channel.snippet.title}
                                >
                                  {channel.snippet.title}
                                </h3>
                              </div>
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-white/10 pt-4 lg:pt-0 lg:pl-6">
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                                  Subscribers
                                </div>
                                <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                                  {Number(
                                    channel.statistics.subscriberCount,
                                  ).toLocaleString()}
                                </div>
                                <div
                                  className="text-[10px] font-bold mt-1 text-[#00b300] dark:text-[#00ff00]"
                                  title="Estimated based on 0.5% view conversion rate"
                                >
                                  Est. Gained:{" "}
                                  {Math.round(currentViews * 0.005) > 0
                                    ? "+"
                                    : ""}
                                  {Math.round(
                                    currentViews * 0.005,
                                  ).toLocaleString()}
                                </div>
                                <a
                                  href={`https://socialblade.com/youtube/channel/${channel.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold mt-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                                >
                                  SocialBlade Stats{" "}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                                  Uploads
                                </div>
                                <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                                  {currentVids.length}{" "}
                                  <span className="text-xs font-sans text-gray-500 font-normal">
                                    total
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono mt-1 text-gray-600 dark:text-gray-400">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {currentShortsCount}
                                  </span>{" "}
                                  Shorts ·{" "}
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {currentLongsCount}
                                  </span>{" "}
                                  Longs
                                </div>
                                <button
                                  onClick={() =>
                                    setExpandedNotepadChannel(
                                      isExpanded ? null : channel.id,
                                    )
                                  }
                                  className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#00b300] dark:text-[#00ff00] hover:underline flex items-center gap-1"
                                >
                                  {isExpanded ? "Hide Topics" : "View Topics"}
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </button>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                                  Views (
                                  {compareTimeframe === "week"
                                    ? "7 Days"
                                    : "30 Days"}
                                  )
                                </div>
                                <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                                  {currentViews.toLocaleString()}
                                </div>
                                <div className="text-[10px] font-mono mt-1 text-gray-600 dark:text-gray-400">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {currentShortsViews.toLocaleString()}
                                  </span>{" "}
                                  Shorts ·{" "}
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {currentLongsViews.toLocaleString()}
                                  </span>{" "}
                                  Longs
                                </div>
                                <div
                                  className={`text-[10px] font-bold mt-1 ${isViewUp ? "text-[#00b300] dark:text-[#00ff00]" : "text-red-500"}`}
                                >
                                  {isViewUp ? "+" : ""}
                                  {viewDiff.toLocaleString()} vs prev
                                </div>
                                <div className="text-[10px] font-mono mt-1 text-gray-600 dark:text-gray-400">
                                  View/Sub:{" "}
                                  <span className={`font-bold ${currentViewToSubRatio > 0 && currentViewToSubRatio < 1.0 ? "text-[#ff0055]" : "text-[#00b300] dark:text-[#00ff00]"}`}>
                                    {currentViewToSubRatio > 0 ? currentViewToSubRatio.toFixed(2) + "%" : "-"}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                                  Engagement
                                </div>
                                <div className="font-mono text-sm text-gray-900 dark:text-white mb-1">
                                  Likes:{" "}
                                  <span className="font-bold">
                                    {currentLikes.toLocaleString()}
                                  </span>
                                  <span
                                    className={`text-[9px] ml-1 ${currentLikes >= previousLikes ? "text-[#00b300] dark:text-[#00ff00]" : "text-red-500"}`}
                                  >
                                    ({currentLikes >= previousLikes ? "+" : ""}
                                    {currentLikes - previousLikes})
                                  </span>
                                </div>
                                <div className="font-mono text-sm text-gray-900 dark:text-white">
                                  Comments:{" "}
                                  <span className="font-bold">
                                    {currentComments.toLocaleString()}
                                  </span>
                                  <span
                                    className={`text-[9px] ml-1 ${currentComments >= previousComments ? "text-[#00b300] dark:text-[#00ff00]" : "text-red-500"}`}
                                  >
                                    (
                                    {currentComments >= previousComments
                                      ? "+"
                                      : ""}
                                    {currentComments - previousComments})
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                                  Top Video
                                </div>
                                {topCurrentVideo ? (
                                  <div className="flex gap-3">
                                    <div className="shrink-0">
                                      <img
                                        src={
                                          topCurrentVideo.snippet.thumbnails
                                            ?.medium?.url ||
                                          topCurrentVideo.snippet.thumbnails
                                            ?.default?.url
                                        }
                                        alt="Thumbnail"
                                        className="w-16 h-9 sm:w-20 sm:h-12 object-cover rounded border border-gray-200 dark:border-white/10"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <a
                                        href={`https://youtube.com/watch?v=${topCurrentVideo.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#00b300] dark:text-[#00ff00] hover:underline line-clamp-2 font-bold mb-1"
                                        title={topCurrentVideo.snippet.title}
                                      >
                                        {topCurrentVideo.snippet.title}
                                      </a>
                                      <div className="text-[9px] text-gray-500 font-mono">
                                        {Number(
                                          topCurrentVideo.statistics
                                            .viewCount || 0,
                                        ).toLocaleString()}{" "}
                                        views
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 italic">
                                    No videos published
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded && currentVids.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">
                                Published Topics ({currentVids.length})
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {currentVids.map((v: any) => (
                                  <div
                                    key={v.id}
                                    className="flex items-start gap-3 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded"
                                  >
                                    <img
                                      src={
                                        v.snippet.thumbnails?.medium?.url ||
                                        v.snippet.thumbnails?.default?.url
                                      }
                                      className="w-16 h-9 object-cover rounded border border-gray-200 dark:border-white/10"
                                      alt="Thumbnail"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <a
                                        href={`https://youtube.com/watch?v=${v.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-gray-900 dark:text-white hover:text-[#00b300] dark:hover:text-[#00ff00] line-clamp-2"
                                        title={v.snippet.title}
                                      >
                                        {v.snippet.title}
                                      </a>
                                      <div className="mt-1 flex items-center gap-2">
                                        <span
                                          className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${v._isShort ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
                                        >
                                          {v._isShort ? "Short" : "Long"}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-mono">
                                          {Number(
                                            v.statistics.viewCount || 0,
                                          ).toLocaleString()}{" "}
                                          views
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeView === "channel_ranking" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex-1 flex flex-col overflow-hidden">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-6">
                  // Channel Ranking
                </h2>

                {sortedCompareChannels.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-xs">
                    No channels available to rank
                  </div>
                ) : (
                  <div className="overflow-y-auto custom-scrollbar pr-2">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-white/10 text-[10px] uppercase tracking-widest text-gray-500">
                          <th className="pb-3 font-bold px-2">Rank</th>
                          <th className="pb-3 font-bold px-2">Channel</th>
                          <th className="pb-3 font-bold px-2 text-right">
                            Subscribers
                          </th>
                          <th className="pb-3 font-bold px-2 text-right">
                            Podcasts
                          </th>
                          <th className="pb-3 font-bold px-2 text-right">
                            Community Posts
                          </th>
                          <th
                            className="pb-3 font-bold px-2 text-right"
                            title="Based on recent 50 videos"
                          >
                            Avg Views (Recent)
                          </th>
                          <th className="pb-3 font-bold px-2 text-right">
                            View/Sub %
                          </th>
                          <th
                            className="pb-3 font-bold px-2 text-right"
                            title="Estimated from video lengths"
                          >
                            Est. Watch Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCompareChannels.map(
                          (channel: any, idx: number) => {
                            const channelVideos =
                              youtubeData?.videos?.filter(
                                (v: any) => v.snippet.channelId === channel.id,
                              ) || [];
                            let avgViewsRecent = 0;
                            let viewToSubRatio = 0;
                            let avgDurationSec = 0;
                            let estRetentionPercent = 0;

                            if (channelVideos.length > 0) {
                              const totalViews = channelVideos.reduce(
                                (acc: number, v: any) =>
                                  acc + (Number(v.statistics.viewCount) || 0),
                                0,
                              );
                              avgViewsRecent =
                                totalViews / channelVideos.length;
                              const subs =
                                Number(channel.statistics.subscriberCount) || 1;
                              viewToSubRatio = (avgViewsRecent / subs) * 100;

                              const totalDuration = channelVideos.reduce(
                                (acc: number, v: any) =>
                                  acc +
                                  durationToSeconds(v.contentDetails.duration),
                                0,
                              );
                              avgDurationSec =
                                totalDuration / channelVideos.length;

                              if (avgDurationSec <= 60) {
                                estRetentionPercent = 85.5;
                              } else if (avgDurationSec <= 300) {
                                estRetentionPercent = 45.2;
                              } else if (avgDurationSec <= 900) {
                                estRetentionPercent = 38.4;
                              } else if (avgDurationSec <= 1800) {
                                estRetentionPercent = 28.7;
                              } else {
                                estRetentionPercent = 18.2;
                              }
                            }

                            const estWatchTimeSec =
                              (avgDurationSec * estRetentionPercent) / 100;
                            const estWatchTimeStr = formatDurationSeconds(
                              Math.round(estWatchTimeSec),
                            );
                            const isDead =
                              viewToSubRatio > 0 && viewToSubRatio < 1.0;

                            return (
                              <tr
                                key={channel.id}
                                className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                              >
                                <td className="py-4 px-2 font-mono text-sm text-gray-500">
                                  #{idx + 1}
                                </td>
                                <td className="py-4 px-2">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={
                                        channel.snippet.thumbnails?.default?.url
                                      }
                                      alt=""
                                      className="w-8 h-8 rounded-full border border-gray-200 dark:border-white/10"
                                    />
                                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                                      {channel.snippet.title}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-2 text-right font-mono text-sm text-gray-900 dark:text-white">
                                  {Number(
                                    channel.statistics.subscriberCount,
                                  ).toLocaleString()}
                                </td>
                                <td className="py-4 px-2 text-right font-mono text-sm text-red-500 dark:text-red-400 font-bold">
                                  {channelVideos.filter((v: any) => {
                                    const title = (v.snippet?.title || "").toLowerCase();
                                    const description = (v.snippet?.description || "").toLowerCase();
                                    const tags = (v.snippet?.tags || []).join(" ").toLowerCase();
                                    const combined = `${title} ${description} ${tags}`;
                                    return !!combined.match(/podcast|interview|talkshow|ep\.|episode |talk show|co-host|host /) || (v.snippet?.title || "").includes("#podcast");
                                  }).length}
                                </td>
                                <td className="py-4 px-2 text-right font-mono text-sm text-blue-500 dark:text-blue-400 font-bold">
                                  {allCommunityPosts.filter((p) => p.channelId === channel.id).length}
                                </td>
                                <td className="py-4 px-2 text-right font-mono text-sm text-gray-900 dark:text-white">
                                  {Math.round(avgViewsRecent).toLocaleString()}
                                </td>
                                <td
                                  className={`py-4 px-2 text-right font-mono text-sm font-bold ${isDead ? "text-[#ff0055]" : "text-[#00b300] dark:text-[#00ff00]"}`}
                                >
                                  {viewToSubRatio.toFixed(2)}%
                                </td>
                                <td className="py-4 px-2 text-right font-mono text-sm text-gray-900 dark:text-white">
                                  {estWatchTimeStr}{" "}
                                  <span className="text-[10px] text-gray-500 font-sans">
                                    ({estRetentionPercent}%)
                                  </span>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeView === "videos" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                    // Video Leaderboard
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-white dark:bg-white/5 p-1 rounded-sm border border-gray-200 dark:border-white/10">
                      <button
                        onClick={() => setVideoType("all")}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoType === "all" ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setVideoType("shorts")}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoType === "shorts" ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                      >
                        Shorts
                      </button>
                      <button
                        onClick={() => setVideoType("long")}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoType === "long" ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                      >
                        Long-Form
                      </button>
                      <button
                        onClick={() => setVideoType("podcasts")}
                        className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoType === "podcasts" ? "bg-gray-200 dark:bg-white/10 text-gray-[#ff0055] dark:text-[#ff0055]" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                      >
                        Podcasts
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 bg-white dark:bg-white/5 p-1 rounded-sm border border-gray-200 dark:border-white/10">
                      {(
                        [
                          "recent",
                          "views",
                          "likes",
                          "velocity",
                          "engagement",
                          "comments",
                          "score",
                        ] as const
                      ).map((sort) => (
                        <div key={sort} className="relative group">
                          <button
                            onClick={() => setVideoSort(sort)}
                            title={`${sortDescriptions[sort].desc} ${sortDescriptions[sort].impact}`}
                            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoSort === sort ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                          >
                            {sort}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {sortedVideos.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs">
                      No video data available
                    </div>
                  ) : (
                    sortedVideos.map((video: any, idx: number) => (
                      <div
                        key={video.id}
                        className="flex flex-col bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 hover:border-[#00b300] dark:hover:border-[#00ff00]/50 p-2 rounded transition-all group relative"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-xl font-black italic text-gray-600 w-8 text-center group-hover:text-[#00b300] dark:group-hover:text-[#00ff00] transition-colors">
                            {idx + 1}
                          </div>
                          <a
                            href={`https://www.youtube.com/watch?v=${video.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-24 h-14 shrink-0 overflow-hidden rounded border border-gray-200 dark:border-white/10 relative block"
                          >
                            <img
                              src={
                                video.snippet.thumbnails?.maxres?.url ||
                                video.snippet.thumbnails?.high?.url ||
                                video.snippet.thumbnails?.medium?.url ||
                                video.snippet.thumbnails?.standard?.url ||
                                video.snippet.thumbnails?.default?.url ||
                                ""
                              }
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute bottom-1 right-1 bg-gray-800 dark:bg-black/80 text-[8px] font-mono text-white px-1 py-0.5 rounded">
                              {formatDuration(video.contentDetails?.duration)}
                            </div>
                          </a>
                          <div className="flex-1 min-w-0">
                            <a
                              href={`https://www.youtube.com/watch?v=${video.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-xs font-bold text-gray-900 dark:text-white truncate hover:underline"
                            >
                              {video.snippet.title}
                            </a>
                            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                              <span className="text-[#00b300] dark:text-[#00ff00] font-bold">
                                {video.snippet.channelTitle}
                              </span>{" "}
                              •{" "}
                              {formatDistanceToNow(
                                new Date(video.snippet.publishedAt),
                                { addSuffix: true },
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 pr-4">
                            {(() => {
                              const channel = youtubeData?.channels?.find(
                                (c: any) => c.id === video.snippet.channelId,
                              );
                              const subs = channel
                                ? Number(channel.statistics.subscriberCount)
                                : 0;
                              const views = Number(
                                video.statistics.viewCount || 0,
                              );
                              const viewToSubRatio =
                                subs > 0 ? (views / subs) * 100 : 0;

                              const durationSec = durationToSeconds(
                                video.contentDetails?.duration,
                              );
                              let estRetentionPercent = 0;
                              if (durationSec <= 60) estRetentionPercent = 85.5;
                              else if (durationSec <= 300)
                                estRetentionPercent = 45.2;
                              else if (durationSec <= 900)
                                estRetentionPercent = 38.4;
                              else if (durationSec <= 1800)
                                estRetentionPercent = 28.7;
                              else estRetentionPercent = 18.2;

                              const estWatchTimeSec =
                                (durationSec * estRetentionPercent) / 100;
                              const estWatchTimeStr = formatDurationSeconds(
                                Math.round(estWatchTimeSec),
                              );
                              const isDead =
                                viewToSubRatio > 0 && viewToSubRatio < 1.0;

                              return (
                                <>
                                  <div
                                    className="flex flex-col items-end w-16"
                                    title="Views per hour since publish"
                                  >
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">
                                      Velocity
                                    </span>
                                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                                      {calculateVelocity(
                                        video.snippet.publishedAt,
                                        views,
                                      )}{" "}
                                      <span className="text-[9px] text-gray-500">
                                        /hr
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end w-16">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">
                                      Views
                                    </span>
                                    <span className="text-sm font-mono text-[#00b300] dark:text-[#00ff00]">
                                      {views.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end w-16">
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">
                                      Likes
                                    </span>
                                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                                      {Number(
                                        video.statistics.likeCount || 0,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <div
                                    className="flex flex-col items-end w-20"
                                    title="Views vs Subscribers Ratio"
                                  >
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">
                                      View/Sub
                                    </span>
                                    <span
                                      className={`text-sm font-mono font-bold ${isDead ? "text-[#ff0055]" : "text-[#00b300] dark:text-[#00ff00]"}`}
                                    >
                                      {viewToSubRatio.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div
                                    className="flex flex-col items-end w-24"
                                    title="Estimated Watch Time based on length"
                                  >
                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">
                                      Est. Watch Time
                                    </span>
                                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                                      {estWatchTimeStr}{" "}
                                      <span className="text-[9px] text-gray-500 font-sans">
                                        ({estRetentionPercent}%)
                                      </span>
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                          <button
                            onClick={() => handleAnalyzeComments(video.id)}
                            disabled={analyzingVideoId === video.id}
                            className="p-2 border border-gray-200 dark:border-white/20 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group/btn"
                          >
                            {analyzingVideoId === video.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-gray-500 group-hover/btn:text-purple-500" />
                            )}
                          </button>
                        </div>
                        {videoCommentAnalysis[video.id] && (
                          <div className="mt-4 p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-b text-xs">
                            <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-purple-500">
                              <Sparkles className="w-3 h-3" /> AI Comment
                              Analysis
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                                  Sentiment Profile
                                </span>
                                <div className="font-mono text-gray-900 dark:text-white whitespace-pre-wrap">
                                  {videoCommentAnalysis[video.id].sentiment}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                                  Common Questions & Themes
                                </span>
                                <ul className="list-disc pl-4 space-y-1 font-mono text-gray-900 dark:text-white">
                                  {videoCommentAnalysis[video.id].questions.map(
                                    (q: string, i: number) => (
                                      <li key={i}>{q}</li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeView === "algorithm" && (
              <div className="bg-white dark:bg-white/5 border border-[#00b300] dark:border-[#00ff00]/30 rounded p-6 flex-1 flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ff0010_1px,transparent_1px),linear-gradient(to_bottom,#00ff0010_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#00b300] dark:text-[#00ff00]">
                    // Algorithmic Matrix (v1.0)
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00b300] dark:bg-[#00ff00] animate-pulse"></span>
                    <span className="text-[9px] font-mono text-[#00b300] dark:text-[#00ff00]">
                      ANALYSIS RUNNING
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
                  <div
                    className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between"
                    title="Calculated based on velocity and engagement relative to baseline"
                  >
                    <span
                      className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help"
                      title="Composite algorithm health score out of 100"
                    >
                      Network Score
                    </span>
                    <div className="text-2xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">
                      {algoStats.networkScore}
                      <span className="text-[12px] text-[#00b300] dark:text-[#00ff00]">
                        /100
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">
                      Global Aggregate
                    </div>
                  </div>
                  <div
                    className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between"
                    title="Calculated based on velocity and engagement relative to baseline"
                  >
                    <span
                      className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help"
                      title="Median views per hour across recent videos"
                    >
                      Median Velocity
                    </span>
                    <div className="text-2xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">
                      {algoStats.medianVelocity}
                      <span className="text-[12px] text-[#00b300] dark:text-[#00ff00]">
                        v/hr
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">
                      Across latest 50 videos
                    </div>
                  </div>
                  <div
                    className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between"
                    title="Calculated based on velocity and engagement relative to baseline"
                  >
                    <span
                      className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help"
                      title="Average engagement rate (likes + comments) / views"
                    >
                      Avg Engagement
                    </span>
                    <div className="text-2xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">
                      {algoStats.avgEngagement}
                      <span className="text-[12px] text-[#00b300] dark:text-[#00ff00]">
                        %
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">
                      Likes + Comments / Views
                    </div>
                  </div>
                  <div
                    className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between"
                    title="Calculated based on velocity and engagement relative to baseline"
                  >
                    <span
                      className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help"
                      title="Estimation of YouTube algorithm recommendation favorability"
                    >
                      Algorithm Bias
                    </span>
                    <div className="text-xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">
                      {algoStats.bias}
                    </div>
                    <div className="text-[9px] text-[#00b300] dark:text-[#00ff00] flex items-center gap-1 uppercase tracking-widest">
                      ↑ Push detected
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 relative z-10">
                  {sortedVideos.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#00b300] dark:text-[#00ff00]/50 font-mono text-xs">
                      Awaiting Matrix Data
                    </div>
                  ) : (
                    sortedVideos.map((video: any, idx: number) => {
                      const views = Number(video.statistics.viewCount || 0);
                      const likes = Number(video.statistics.likeCount || 0);
                      const comments = Number(
                        video.statistics.commentCount || 0,
                      );
                      const engagement =
                        views > 0
                          ? (((likes + comments) / views) * 100).toFixed(2)
                          : "0.00";
                      const velocity = calculateVelocity(
                        video.snippet.publishedAt,
                        views,
                      );

                      // Arbitrary algo score
                      const score = Math.min(
                        99.9,
                        velocity * 0.5 +
                          Number(engagement) * 10 +
                          views / 10000,
                      ).toFixed(1);

                      return (
                        <a
                          key={video.id}
                          href={`https://www.youtube.com/watch?v=${video.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-4 bg-white dark:bg-black/60 border border-[#00b300]/30 dark:border-[#00ff00]/20 hover:border-[#00b300] dark:hover:border-[#00ff00] p-3 rounded transition-all group"
                        >
                          <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-[#00b300]/10 dark:bg-[#00ff00]/10 border border-[#00b300] dark:border-[#00ff00]/30 rounded text-[#00b300] dark:text-[#00ff00] font-mono font-black text-sm">
                            {score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#00b300] dark:group-hover:text-[#00ff00] transition-colors">
                              {video.snippet.title}
                            </h4>
                            <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">
                              <span className="text-[#00b300] dark:text-[#00ff00] font-bold">
                                {video.snippet.channelTitle}
                              </span>{" "}
                              •{" "}
                              {formatDistanceToNow(
                                new Date(video.snippet.publishedAt),
                                { addSuffix: true },
                              )}
                            </div>
                          </div>
                          <div className="flex gap-6 pr-4">
                            <div className="flex flex-col items-end w-16">
                              <span className="text-[8px] text-[#00b300] dark:text-[#00ff00] uppercase tracking-widest font-bold">
                                Eng Rate
                              </span>
                              <span className="text-sm font-mono text-gray-900 dark:text-white">
                                {engagement}%
                              </span>
                            </div>
                            <div className="flex flex-col items-end w-16">
                              <span className="text-[8px] text-[#00b300] dark:text-[#00ff00] uppercase tracking-widest font-bold">
                                Velocity
                              </span>
                              <span className="text-sm font-mono text-gray-900 dark:text-white">
                                {velocity}{" "}
                                <span className="text-[9px] text-[#00b300] dark:text-[#00ff00]/60">
                                  /hr
                                </span>
                              </span>
                            </div>
                            <div className="flex flex-col items-end w-20">
                              <span className="text-[8px] text-[#00b300] dark:text-[#00ff00] uppercase tracking-widest font-bold">
                                Algo Status
                              </span>
                              <span
                                className={`text-[10px] font-black uppercase tracking-widest ${Number(score) > 50 ? "text-[#00b300] dark:text-[#00ff00]" : "text-yellow-500"}`}
                              >
                                {Number(score) > 50 ? "BOOSTED" : "STANDARD"}
                              </span>
                            </div>
                          </div>
                        </a>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeView === "ai_insights" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-[#00ff00]/30 rounded p-6 flex-1 flex flex-col overflow-hidden relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#00b300] dark:text-[#00ff00] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> // AI Intelligence &
                    Opportunities
                  </h2>
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {youtubeData?.channels &&
                      youtubeData.channels.length > 0 && (
                        <div className="relative z-10 w-full sm:w-auto">
                          <select
                            value={aiSelectedChannelId}
                            onChange={(e) =>
                              setAiSelectedChannelId(
                                e.target.value as string | "all",
                              )
                            }
                            className="w-full sm:w-auto appearance-none bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white text-xs font-bold uppercase tracking-widest rounded py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#00ff00]"
                          >
                            <option value="all">All Channels</option>
                            {youtubeData.channels.map((ch: any) => (
                              <option key={ch.id} value={ch.id}>
                                {ch.snippet.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                      )}
                    <button
                      onClick={handleGenerateAI}
                      disabled={isAILoading}
                      className="whitespace-nowrap px-4 py-2 bg-[#00b300] text-white dark:bg-[#00ff00]/20 dark:text-[#00ff00] border border-transparent dark:border-[#00ff00]/50 hover:bg-[#009900] dark:hover:bg-[#00ff00]/30 transition-colors text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2 disabled:opacity-50"
                    >
                      {isAILoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Brain className="w-3 h-3" />
                      )}
                      {isAILoading
                        ? "Analyzing Patterns..."
                        : "Generate Fresh Insights"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                  {aiError && (
                    <div className="p-4 bg-[#ff0055]/10 border border-[#ff0055]/30 rounded text-[#ff0055] text-xs font-mono">
                      {aiError}
                    </div>
                  )}

                  {!aiInsights && !isAILoading && !aiError && (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500 font-mono text-xs">
                      <Brain className="w-8 h-8 mb-4 opacity-50" />
                      <div>
                        Click "Generate Fresh Insights" to analyze your channel
                        data.
                      </div>
                    </div>
                  )}

                  {aiInsights && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      {/* Recommendations */}
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-200 dark:border-white/10 pb-2">
                          Next Actions
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiInsights.recommendations?.map(
                            (rec: any, i: number) => (
                              <div
                                key={i}
                                className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 p-4 rounded hover:border-[#00b300] dark:hover:border-[#00ff00]/50 transition-colors"
                              >
                                <h4 className="text-sm font-bold mb-2 text-gray-900 dark:text-white">
                                  {rec.topic}
                                </h4>
                                <div className="flex gap-2 mb-3">
                                  <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                                    {rec.length}
                                  </span>
                                  <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                                    {rec.style}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {rec.reasoning}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {/* Opportunities */}
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-200 dark:border-white/10 pb-2">
                          Topic Opportunities
                        </h3>
                        <div className="space-y-3">
                          {aiInsights.opportunities?.map(
                            (opp: any, i: number) => (
                              <div
                                key={i}
                                className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 p-3 rounded"
                              >
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                    {opp.topic}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    {opp.alignment}
                                  </p>
                                </div>
                                <div className="flex gap-4 mt-2 sm:mt-0">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">
                                      Search Volume
                                    </span>
                                    <span
                                      className={`text-xs font-black uppercase ${opp.searchVolume === "High" ? "text-[#00b300] dark:text-[#00ff00]" : "text-gray-900 dark:text-white"}`}
                                    >
                                      {opp.searchVolume}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">
                                      Competition
                                    </span>
                                    <span
                                      className={`text-xs font-black uppercase ${opp.competition === "Low" ? "text-[#00b300] dark:text-[#00ff00]" : "text-gray-900 dark:text-white"}`}
                                    >
                                      {opp.competition}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      {/* Content Gaps */}
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-200 dark:border-white/10 pb-2">
                          Content Gaps
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {aiInsights.contentGaps?.map(
                            (gap: any, i: number) => (
                              <div
                                key={i}
                                className="bg-[#00b300]/5 dark:bg-[#00ff00]/5 border border-[#00b300]/20 dark:border-[#00ff00]/20 p-4 rounded"
                              >
                                <h4 className="text-sm font-bold text-[#00b300] dark:text-[#00ff00] mb-2">
                                  {gap.niche}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {gap.description}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === "audience" && (
              <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                {/* Channel Selector for Audience */}
                {youtubeData?.channels && youtubeData.channels.length > 0 && (
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Target Channel
                    </span>
                    <div className="relative">
                      <select
                        value={selectedAudienceChannelId || ""}
                        onChange={(e) =>
                          setSelectedAudienceChannelId(e.target.value)
                        }
                        className="appearance-none bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white text-xs font-bold uppercase tracking-widest rounded py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#00ff00]"
                      >
                        {youtubeData.channels.map((ch: any) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.snippet.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Retention Heatmap Section */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                        // Viewer Retention Heatmap (Simulation)
                      </h2>
                      <p className="text-[10px] text-gray-500 max-w-2xl mt-2">
                        A visual representation of where viewers typically drop
                        off or re-watch segments. In a production environment,
                        this integrates directly with YouTube Analytics API.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <span className="text-[9px] bg-[#00b300]/20 text-[#00b300] dark:bg-[#00ff00]/20 dark:text-[#00ff00] px-2 py-1 uppercase font-bold tracking-widest rounded">
                        Channel Selected
                      </span>
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest max-w-[200px] leading-tight">
                        *Actual metrics require YouTube Analytics OAuth.
                        Displaying deterministic simulation.
                      </span>
                    </div>
                  </div>
                  <div className="h-64 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={audienceData?.retention || []}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorRetention"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#00ff00"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#00ff00"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          stroke="#666"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#666"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#111",
                            border: "1px solid #333",
                            fontSize: "12px",
                            color: "#fff",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="retention"
                          stroke="#00ff00"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorRetention)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {predictiveMilestone && (
                  <div className="bg-gradient-to-r from-gray-900 to-black border border-purple-500/30 rounded p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xs font-black uppercase tracking-widest text-purple-500 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Predictive Milestone
                      </h2>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Current Velocity: +{predictiveMilestone.velocity}/week
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-mono font-bold text-gray-400 mb-2">
                          <span>
                            {predictiveMilestone.current.toLocaleString()}
                          </span>
                          <span>
                            {predictiveMilestone.target.toLocaleString()} TARGET
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-1000"
                            style={{
                              width: `${Math.min(100, Math.max(0, (predictiveMilestone.current / predictiveMilestone.target) * 100))}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-3xl font-black italic tracking-tighter text-white">
                          {predictiveMilestone.days}
                        </div>
                        <div className="text-[10px] text-purple-500 uppercase tracking-widest font-bold">
                          Days Away
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono mt-4 border-t border-white/10 pt-4">
                      "At your current 7-day velocity, you will hit{" "}
                      {predictiveMilestone.target.toLocaleString()} subscribers
                      in {predictiveMilestone.days} days."
                    </p>
                  </div>
                )}

                {predictiveMilestone && (
                  <div className="bg-gradient-to-r from-gray-900 to-black border border-purple-500/30 rounded p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xs font-black uppercase tracking-widest text-purple-500 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Predictive Milestone
                      </h2>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Current Velocity: +{predictiveMilestone.velocity}/week
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-mono font-bold text-gray-400 mb-2">
                          <span>
                            {predictiveMilestone.current.toLocaleString()}
                          </span>
                          <span>
                            {predictiveMilestone.target.toLocaleString()} TARGET
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-1000"
                            style={{
                              width: `${Math.min(100, Math.max(0, (predictiveMilestone.current / predictiveMilestone.target) * 100))}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-3xl font-black italic tracking-tighter text-white">
                          {predictiveMilestone.days}
                        </div>
                        <div className="text-[10px] text-purple-500 uppercase tracking-widest font-bold">
                          Days Away
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono mt-4 border-t border-white/10 pt-4">
                      "At your current 7-day velocity, you will hit{" "}
                      {predictiveMilestone.target.toLocaleString()} subscribers
                      in {predictiveMilestone.days} days."
                    </p>
                  </div>
                )}

                {/* Demographics & Segmentation */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
                      Age & Gender Demographics
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={audienceData?.ages || []}
                          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            stroke="#666"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#666"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <RechartsTooltip
                            cursor={{ fill: "transparent" }}
                            contentStyle={{
                              backgroundColor: "#111",
                              border: "1px solid #333",
                              fontSize: "10px",
                              color: "#fff",
                            }}
                          />
                          <Bar
                            dataKey="male"
                            stackId="a"
                            fill="#00ff00"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="female"
                            stackId="a"
                            fill="#00b300"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
                      Geography
                    </h3>
                    <div className="space-y-4">
                      {(audienceData?.geography || []).map((geo: any) => (
                        <div key={geo.country}>
                          <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-1">
                            <span>{geo.country}</span>
                            <span>{geo.percentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                            <div
                              className={`h-full ${geo.color}`}
                              style={{ width: `${geo.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
                      Device Usage
                    </h3>
                    <div className="h-48 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={audienceData?.devices || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            <Cell fill="#00ff00" />
                            <Cell fill="#00b300" />
                            <Cell fill="#006600" />
                            <Cell fill="#333333" />
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "#111",
                              border: "1px solid #333",
                              fontSize: "10px",
                              color: "#fff",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-[10px] uppercase font-bold text-gray-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-[#00ff00]" /> Mobile{" "}
                        {audienceData?.devices?.[0]?.value}%
                      </span>
                      <span>Desktop {audienceData?.devices?.[1]?.value}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeView === "calendar" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex-1 flex flex-col overflow-hidden relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black uppercase tracking-widest text-[#00b300] dark:text-[#00ff00] flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> // Social Media Calendar
                    </h2>
                    <span className="text-[9px] bg-[#00b300]/20 text-[#00b300] dark:bg-[#00ff00]/20 dark:text-[#00ff00] px-2 py-1 uppercase font-bold tracking-widest rounded hidden sm:inline-block">
                      Publication Timeline
                    </span>
                  </div>
                  {youtubeData?.channels && youtubeData.channels.length > 0 && (
                    <div className="relative z-10 w-full sm:w-auto">
                      <select
                        value={selectedCalendarChannelId}
                        onChange={(e) =>
                          setSelectedCalendarChannelId(
                            e.target.value as string | "all",
                          )
                        }
                        className="w-full sm:w-auto appearance-none bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white text-xs font-bold uppercase tracking-widest rounded py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#00ff00]"
                      >
                        <option value="all">All Channels</option>
                        {youtubeData.channels.map((ch: any) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.snippet.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                  {!sortedVideos || sortedVideos.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-gray-500 font-mono text-xs">
                      No video data available for calendar
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-200 dark:border-white/10 pb-2">
                        Recent Uploads
                      </h3>
                      <div className="relative border-l-2 border-[#00b300]/30 dark:border-[#00ff00]/30 pl-6 ml-3 space-y-6">
                        {[...sortedVideos]
                          .filter(
                            (v) =>
                              selectedCalendarChannelId === "all" ||
                              v.snippet.channelId === selectedCalendarChannelId,
                          )
                          .sort(
                            (a, b) =>
                              new Date(b.snippet.publishedAt).getTime() -
                              new Date(a.snippet.publishedAt).getTime(),
                          )
                          .map((video: any, i: number) => {
                            const date = new Date(video.snippet.publishedAt);
                            return (
                              <div key={video.id} className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#00b300] dark:bg-[#00ff00] border-4 border-white dark:border-[#0a0a0a]"></div>
                                <div className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded p-4 flex gap-4 hover:border-[#00b300] dark:hover:border-[#00ff00]/50 transition-colors group flex-col sm:flex-row">
                                  <div className="w-full sm:w-32 h-20 shrink-0 overflow-hidden rounded border border-gray-200 dark:border-white/10 relative">
                                    <a
                                      href={`https://www.youtube.com/watch?v=${video.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <img
                                        src={
                                          video.snippet.thumbnails?.medium
                                            ?.url ||
                                          video.snippet.thumbnails?.default?.url
                                        }
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                      />
                                    </a>
                                  </div>
                                  <div className="flex-1 flex flex-col justify-center">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 sm:mb-0">
                                      <a
                                        href={`https://www.youtube.com/watch?v=${video.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-[#00b300] dark:hover:text-[#00ff00]"
                                      >
                                        {video.snippet.title}
                                      </a>
                                      <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest whitespace-nowrap mt-2 sm:mt-0 sm:ml-4">
                                        {date.toLocaleDateString(undefined, {
                                          weekday: "short",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-auto uppercase tracking-widest flex items-center flex-wrap gap-x-4 gap-y-2">
                                      <div>
                                        <span className="text-[#00b300] dark:text-[#00ff00] font-bold">
                                          {video.snippet.channelTitle}
                                        </span>
                                        <span className="mx-2 hidden sm:inline">
                                          •
                                        </span>
                                        <span className="block sm:inline">
                                          {date.toLocaleTimeString(undefined, {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex gap-3 text-gray-400">
                                        <span className="flex items-center gap-1">
                                          <Eye className="w-3 h-3" />{" "}
                                          {Number(
                                            video.statistics.viewCount || 0,
                                          ).toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <TrendingUp className="w-3 h-3" />{" "}
                                          {Number(
                                            video.statistics.likeCount || 0,
                                          ).toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Users className="w-3 h-3" />{" "}
                                          {Number(
                                            video.statistics.commentCount || 0,
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeView === "competitors" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 overflow-hidden">
                <div className="xl:col-span-8 bg-white dark:bg-white/5 border border-purple-500/30 rounded p-6 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-purple-500">
                      // Competitor Watchlist
                    </h2>
                    {(!competitorData?.channels ||
                      competitorData.channels.length === 0) && (
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="text-[10px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded hover:bg-purple-500/30"
                      >
                        Configure Competitors
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                    {!competitorData?.channels ||
                    competitorData.channels.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-xs">
                        <Crosshair className="w-8 h-8 mb-4 opacity-50" />
                        No competitor channels configured.
                      </div>
                    ) : (
                      competitorData.channels.map((channel: any) => {
                        const channelVideos = competitorData.videos.filter(
                          (v) => v.snippet.channelId === channel.id,
                        );
                        return (
                          <div
                            key={channel.id}
                            className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded p-4"
                          >
                            <div className="flex items-center gap-4 mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
                              <img
                                src={channel.snippet.thumbnails?.default?.url}
                                className="w-12 h-12 rounded-full border border-purple-500/50"
                              />
                              <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                  {channel.snippet.title}
                                </h3>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                                  {Number(
                                    channel.statistics?.subscriberCount || 0,
                                  ).toLocaleString()}{" "}
                                  Subs •{" "}
                                  {Number(
                                    channel.statistics?.videoCount || 0,
                                  ).toLocaleString()}{" "}
                                  Videos
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase font-bold text-purple-500 tracking-widest">
                                Recent Activity
                              </h4>
                              {channelVideos.slice(0, 3).map((video: any) => (
                                <div
                                  key={video.id}
                                  className="flex items-center justify-between group"
                                >
                                  <a
                                    href={`https://www.youtube.com/watch?v=${video.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-gray-700 dark:text-gray-300 hover:text-purple-500 truncate flex-1 pr-4"
                                  >
                                    {video.snippet.title}
                                  </a>
                                  <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500">
                                    <span>
                                      {formatDistanceToNow(
                                        new Date(video.snippet.publishedAt),
                                        { addSuffix: true },
                                      )}
                                    </span>
                                    <span className="w-16 text-right font-bold text-gray-900 dark:text-white">
                                      {Number(
                                        video.statistics?.viewCount || 0,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="xl:col-span-4 flex flex-col gap-6">
                  <div className="bg-white dark:bg-white/5 border border-purple-500/30 rounded p-6 flex-1 overflow-hidden flex flex-col">
                    <h2 className="text-xs font-black uppercase tracking-widest text-purple-500 mb-6">
                      // Competitor Keyword Stealer
                    </h2>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                      {competitorTags.length === 0 ? (
                        <div className="text-gray-500 font-mono text-xs text-center mt-10">
                          No keywords extracted yet.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {competitorTags.map((t, i) => (
                            <span
                              key={i}
                              className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 px-2 py-1 rounded text-[10px] font-mono font-bold"
                            >
                              {t.word} ({t.score})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeView === "community" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 overflow-hidden">
                {/* Left Column: Create Community Post */}
                <div className="xl:col-span-4 bg-white dark:bg-white/5 border border-blue-500/30 rounded p-6 flex flex-col overflow-y-auto custom-scrollbar">
                  <h2 className="text-xs font-black uppercase tracking-widest text-blue-500 mb-2">
                    // Schedule & Publish Post
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    Draft text, images, or interactive polls to stimulate viewer activity and boost community engagement.
                  </p>

                  <form onSubmit={handleCreateCommunityPost} className="space-y-4 flex-1">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">
                        Select Channel
                      </label>
                      <select
                        value={newPostChannelId}
                        onChange={(e) => setNewPostChannelId(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                      >
                        <option value="">-- Choose Channel --</option>
                        {youtubeData?.channels?.map((channel: any) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.snippet.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">
                        Post Type
                      </label>
                      <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-black/30 p-1 border border-gray-200 dark:border-white/10 rounded">
                        {(["text", "poll", "image"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewPostType(type)}
                            className={`py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${newPostType === type ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">
                        Post Content
                      </label>
                      <textarea
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="Type your community update here... Add tags or mention #podcasts!"
                        rows={4}
                        className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>

                    {newPostType === "poll" && (
                      <div className="space-y-2 border-l-2 border-blue-500/50 pl-3">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-blue-500 mb-1">
                          Poll Options
                        </label>
                        {newPostOptions.map((option, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="text-[10px] font-mono text-gray-400">#{idx + 1}</span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const copy = [...newPostOptions];
                                copy[idx] = e.target.value;
                                setNewPostOptions(copy);
                              }}
                              placeholder={`Option ${idx + 1}`}
                              className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-3 py-1.5 text-xs text-gray-900 dark:text-white"
                            />
                            {newPostOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewPostOptions(newPostOptions.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 hover:text-red-700 text-xs px-1"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                        {newPostOptions.length < 4 && (
                          <button
                            type="button"
                            onClick={() => setNewPostOptions([...newPostOptions, ""])}
                            className="text-[9px] uppercase tracking-wider font-bold text-blue-500 hover:underline mt-1"
                          >
                            + Add Option
                          </button>
                        )}
                      </div>
                    )}

                    {newPostType === "image" && (
                      <div className="space-y-1">
                        <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1">
                          Image URL
                        </label>
                        <input
                          type="text"
                          value={newPostImageUrl}
                          onChange={(e) => setNewPostImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/... or blank for preset"
                          className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        <span className="text-[9px] text-gray-400 block">
                          Tip: Leave blank to auto-use a premium tech workspace illustration.
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-widest py-3 rounded transition-colors shadow-sm"
                    >
                      Publish Community Post
                    </button>
                  </form>
                </div>

                {/* Right Column: Feed Simulator & Viewer Sentiment */}
                <div className="xl:col-span-8 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex flex-col overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-gray-200 dark:border-white/10 pb-4">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
                        // Community Feed Simulator
                      </h2>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono mt-0.5">
                        Showing live interactions & audience sentiment loops
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Search */}
                      <input
                        type="text"
                        value={communitySearch}
                        onChange={(e) => setCommunitySearch(e.target.value)}
                        placeholder="Search posts..."
                        className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 max-w-[150px]"
                      />

                      {/* Filter Pills */}
                      <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded border border-gray-200 dark:border-white/10">
                        {(["all", "text", "poll", "image"] as const).map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setCommunityTypeFilter(filter)}
                            className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-sm transition-colors ${communityTypeFilter === filter ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                    {allCommunityPosts
                      .filter((p) => {
                        const matchesType = communityTypeFilter === "all" || p.type === communityTypeFilter;
                        const matchesSearch = !communitySearch || p.content.toLowerCase().includes(communitySearch.toLowerCase()) || p.channelTitle.toLowerCase().includes(communitySearch.toLowerCase());
                        return matchesType && matchesSearch;
                      })
                      .map((post) => {
                        const hasVoted = userVotes[post.id] !== undefined;
                        const userVoteIndex = userVotes[post.id];
                        const isCustom = post.id.startsWith("custom-post-");
                        
                        // Calculate poll vote metrics
                        let totalVotes = 0;
                        let optionVotes = [...(post.votes || [])];
                        if (post.type === "poll") {
                          if (hasVoted && userVoteIndex !== undefined) {
                            optionVotes[userVoteIndex] = optionVotes[userVoteIndex] + 1;
                          }
                          totalVotes = optionVotes.reduce((s, v) => s + v, 0);
                        }

                        const likedByMe = !!userLikedPosts[post.id];
                        const displayLikes = (post.likes || 0) + (postLikes[post.id] || 0);

                        const currentComments = postComments[post.id] || [];
                        const displayCommentsCount = (post.commentsCount || 0) + currentComments.length;

                        const isCommentsExpanded = !!expandedComments[post.id];

                        return (
                          <div
                            key={post.id}
                            className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg p-5 transition-shadow hover:shadow-md relative"
                          >
                            {/* Delete Button for custom posts */}
                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomPost(post.id)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1"
                                title="Delete Custom Post"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Post Author info */}
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 font-mono text-xs font-black">
                                {post.channelTitle.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 dark:text-white text-xs">
                                    {post.channelTitle}
                                  </span>
                                  {isCustom ? (
                                    <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest border border-blue-500/20">
                                      Custom / Scheduled
                                    </span>
                                  ) : (
                                    <span className="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                                      Live Feed
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>

                            {/* Content Body */}
                            <p className="text-xs text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap leading-relaxed">
                              {post.content}
                            </p>

                            {/* Render Image Type */}
                            {post.type === "image" && post.imageUrl && (
                              <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
                                <img
                                  src={post.imageUrl}
                                  alt="Community Visual Asset"
                                  className="w-full max-h-72 object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            {/* Render Poll Type */}
                            {post.type === "poll" && post.options && (
                              <div className="space-y-3 mb-4 bg-white dark:bg-black/25 p-4 border border-gray-100 dark:border-white/5 rounded-lg">
                                {post.options.map((option: string, oIdx: number) => {
                                  const votesForOption = optionVotes[oIdx] || 0;
                                  const percent = totalVotes > 0 ? (votesForOption / totalVotes) * 100 : 0;
                                  const isSelectedOption = userVoteIndex === oIdx;

                                  return (
                                    <div key={oIdx} className="relative">
                                      {hasVoted ? (
                                        /* Voted State */
                                        <div className="flex items-center justify-between border border-gray-200 dark:border-white/10 rounded-md p-3 text-xs overflow-hidden relative">
                                          {/* Animated fill background */}
                                          <div
                                            className="absolute left-0 top-0 h-full bg-blue-500/10 dark:bg-blue-500/20 transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                          />
                                          <span className={`relative font-medium flex items-center gap-2 ${isSelectedOption ? "text-blue-600 dark:text-blue-400 font-bold" : "text-gray-700 dark:text-gray-300"}`}>
                                            {option} {isSelectedOption && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                                          </span>
                                          <span className="relative font-mono font-bold text-gray-500 dark:text-gray-400">
                                            {percent.toFixed(1)}% <span className="text-[10px] text-gray-400 font-normal">({votesForOption.toLocaleString()})</span>
                                          </span>
                                        </div>
                                      ) : (
                                        /* Unvoted / Clickable State */
                                        <button
                                          type="button"
                                          onClick={() => handleVotePoll(post.id, oIdx)}
                                          className="w-full text-left border border-gray-200 dark:border-white/10 hover:border-blue-500 rounded-md p-3 text-xs transition-all hover:bg-blue-500/5 text-gray-700 dark:text-gray-300 font-semibold"
                                        >
                                          {option}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}

                                {hasVoted && (
                                  <div className="text-[9px] uppercase tracking-wider text-gray-400 font-mono flex items-center justify-between mt-2 pt-1">
                                    <span>Total Sim Votes: {totalVotes.toLocaleString()}</span>
                                    <span className="text-blue-500 font-bold">✓ Vote Cast Successfully</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Actions Footer row */}
                            <div className="flex items-center gap-6 text-[11px] font-bold border-t border-gray-200 dark:border-white/10 pt-3">
                              <button
                                type="button"
                                onClick={() => handleLikePost(post.id)}
                                className={`flex items-center gap-1.5 transition-colors ${likedByMe ? "text-red-500" : "text-gray-500 hover:text-gray-800 dark:hover:text-white"}`}
                              >
                                <Heart className={`w-4 h-4 ${likedByMe ? "fill-current" : ""}`} />
                                <span>{displayLikes}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                className={`flex items-center gap-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-white`}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>{displayCommentsCount} Comments</span>
                              </button>
                            </div>

                            {/* Comments block */}
                            {isCommentsExpanded && (
                              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                                {/* Comment write input */}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={commentInputs[post.id] || ""}
                                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleAddComment(post.id);
                                    }}
                                    placeholder="Add public analysis comment..."
                                    className="flex-1 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded px-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddComment(post.id)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 rounded transition-colors"
                                  >
                                    Post
                                  </button>
                                </div>

                                {/* Custom / Added Comments listing */}
                                {currentComments.map((comment, cIdx) => (
                                  <div key={cIdx} className="bg-white dark:bg-black/20 p-2.5 rounded border border-gray-100 dark:border-white/5 text-xs flex gap-2.5 items-start">
                                    <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-500">
                                      AS
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-bold text-gray-900 dark:text-white text-[11px]">
                                          {comment.author}
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-mono">
                                          {formatDistanceToNow(new Date(comment.publishedAt), { addSuffix: true })}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {comment.text}
                                      </p>
                                    </div>
                                  </div>
                                ))}

                                {/* Seed Comments */}
                                <div className="bg-white dark:bg-black/20 p-2.5 rounded border border-gray-100 dark:border-white/5 text-xs flex gap-2.5 items-start">
                                  <div className="w-6 h-6 rounded-full bg-gray-500/15 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                    Viewer
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="font-bold text-gray-900 dark:text-white text-[11px]">
                                        Alex Rivera (Subscriber)
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-mono">2 hours ago</span>
                                    </div>
                                    <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                                      This is incredibly true, the community posts keep me tuned in even when there isn't a new full video out yet. Perfect way to engage!
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-white dark:bg-black/20 p-2.5 rounded border border-gray-100 dark:border-white/5 text-xs flex gap-2.5 items-start">
                                  <div className="w-6 h-6 rounded-full bg-gray-500/15 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                    Viewer
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="font-bold text-gray-900 dark:text-white text-[11px]">
                                        Jordan Blake (Subscriber)
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-mono">5 hours ago</span>
                                    </div>
                                    <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                                      Definitely voted on this! Looking forward to Friday's deep dive podcast episode. Keep them coming! 🙌
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-6 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-600 border-t border-gray-200 dark:border-white/5 pt-4 px-6 mb-4">
        <div className="flex items-center space-x-4">
          <span>Session ID: 419-X2-ALPHA</span>
          <span>●</span>
          <span>Refresh Rate: 20M</span>
        </div>
        <div className="font-mono">
          {lastUpdated
            ? `SYSTEM UPDATED: ${lastUpdated.toISOString().replace("T", " // ").substring(0, 22)} GMT`
            : "SYSTEM STANDBY"}
        </div>
      </footer>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSave}
      />

      {hoveredVideo && (
        <div
          className="fixed z-[100] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 shadow-2xl rounded-lg p-4 w-72 pointer-events-none"
          style={{
            left: Math.max(16, Math.min(hoveredVideo.x - 144, window.innerWidth - 304)),
            top: hoveredVideo.y < 340 ? hoveredVideo.y + 24 : hoveredVideo.y - 340,
          }}
        >
          <img
            src={
              hoveredVideo.video.snippet?.thumbnails?.high?.url ||
              hoveredVideo.video.snippet?.thumbnails?.medium?.url
            }
            className="w-full aspect-video object-cover rounded mb-3 bg-gray-100 dark:bg-white/5"
            alt=""
          />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight">
            {hoveredVideo.video.snippet?.title}
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 dark:bg-white/5 rounded p-2 border border-gray-200 dark:border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                Views
              </div>
              <div className="font-mono font-bold text-gray-900 dark:text-white">
                {Number(
                  hoveredVideo.video.statistics?.viewCount || 0,
                ).toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded p-2 border border-gray-200 dark:border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                Likes
              </div>
              <div className="font-mono font-bold text-gray-900 dark:text-white">
                {Number(
                  hoveredVideo.video.statistics?.likeCount || 0,
                ).toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded p-2 border border-gray-200 dark:border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                Comments
              </div>
              <div className="font-mono font-bold text-gray-900 dark:text-white">
                {Number(
                  hoveredVideo.video.statistics?.commentCount || 0,
                ).toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded p-2 border border-gray-200 dark:border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                Published
              </div>
              <div className="font-mono font-bold text-gray-900 dark:text-white text-[10px]">
                {new Date(
                  hoveredVideo.video.snippet?.publishedAt,
                ).toLocaleDateString()}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-white/5 rounded p-2 border border-gray-200 dark:border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                Eng. Rate
              </div>
              <div className="font-mono font-bold text-[#00b300] dark:text-[#00ff00]">
                {Number(hoveredVideo.video.statistics?.viewCount || 0) > 0
                  ? (
                      ((Number(hoveredVideo.video.statistics?.likeCount || 0) +
                        Number(
                          hoveredVideo.video.statistics?.commentCount || 0,
                        )) /
                        Number(hoveredVideo.video.statistics?.viewCount || 1)) *
                      100
                    ).toFixed(2) + "%"
                  : "-"}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-white/5 rounded p-2 border border-gray-200 dark:border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-gray-500 mb-1">
                Avg VPH
              </div>
              <div className="font-mono font-bold text-gray-900 dark:text-white">
                {(
                  Number(hoveredVideo.video.statistics?.viewCount || 0) /
                  Math.max(
                    1,
                    (new Date().getTime() -
                      new Date(
                        hoveredVideo.video.snippet?.publishedAt,
                      ).getTime()) /
                      (1000 * 60 * 60),
                  )
                ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Notification Toast */}
      
    </div>
  );
}
