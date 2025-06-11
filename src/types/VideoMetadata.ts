export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  description: string;
  author: string;
  channelUrl: string;
  publishedDate: string;
  duration: string;
  viewCount: string;
  likeCount: string;
  thumbnailUrl: string;
  tags: string[];
  category: string;
  language: string;
  uploadDate: string;
  scraped_at: string;
  screenshot_path?: string;
}

export interface ScrapingResult {
  success: VideoMetadata[];
  failed: FailedVideo[];
  summary: {
    total_attempted: number;
    successful: number;
    failed: number;
    duration_ms: number;
  };
}

export interface FailedVideo {
  url: string;
  error: string;
  retries_attempted: number;
} 