export interface YouTubeChannelConfig {
  channel_id: string;
  name: string;
  category?: string;
}

export interface InstagramAccountConfig {
  handle: string;
  business_account_id: string;
  category?: string;
}

export interface DisplayConfig {
  theme: 'dark' | 'light';
  timeRange: '24h' | '7d' | '30d';
  videoLimit: number;
}

export interface DashboardKeys {
  youtubeKey: string;
  youtubeChannels: YouTubeChannelConfig[];
  youtubeCompetitors?: YouTubeChannelConfig[];
  instagramKey: string;
  instagramAccounts: InstagramAccountConfig[];
  display?: DisplayConfig;
  geminiKey?: string;
}

export interface YouTubeStats {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      default: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

export interface YouTubeVideoStats {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    channelTitle: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails?: {
    duration: string;
  };
}

export interface InstagramStats {
  id: string;
  name: string;
  followers_count: number;
  media_count: number;
  profile_picture_url: string;
}

export interface IDVideoItem {
  id: string; // YouTube 11-char Video ID
  youtubeUrl: string;
  channelNameHint?: string;
  channelId?: string; // Resolved YouTube channelId
  creator?: string; // e.g. "Vivek", "Sanju Ghosh"
  date?: string; // e.g. "24-Sep"
  month?: string; // e.g. "September"
  role?: string; // e.g. "In-House Editor"
  playbookUrl?: string; // Direct link to playbook/storyboard asset
  topic?: string; // e.g. "Education Loan Against Property"
  product?: string; // e.g. "loan-against-property", "fixed-deposit", "demat"
  business?: string; // e.g. "loans", "investments", "insurance"
  subtopic?: string; // legacy alias for product
  category?: string; // legacy alias for business
  persona?: string; // e.g. "borrowers", "savers"
  team?: string; // e.g. "Content Team"
  rawRow?: string;
}

export type DashboardMode = "normal" | "id_video";
