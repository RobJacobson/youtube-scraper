export type VideoMetadata = {
  id: string;
  url: string;
  title: string;
  description: string;
  keywords: string;
  image: string;
  name: string;
  duration: string;
  width: string;
  height: string;
  userInteractionCount: string;
  datePublished: string;
  uploadDate: string;
  genre: string;
  expandedDescription: string;
  scraped_url: string;
  scraped_at: string;
  screenshot_path?: string;
};

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
