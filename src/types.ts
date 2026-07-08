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
  instagramKey: string;
  instagramAccounts: InstagramAccountConfig[];
  display?: DisplayConfig;
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
