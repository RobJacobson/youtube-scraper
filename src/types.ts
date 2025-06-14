// Main configuration for the scraper
export interface Config {
  channelUrl: string;
  maxVideos: number;
  offset: number;
  baseDelay: number;
  maxRetries: number;
  headless: boolean;
  skipScreenshots: boolean;
  verbose: boolean;
  outputDir: string;
  useDarkMode: boolean;
  useTheaterMode: boolean;
  hideSuggestedVideos: boolean;
  interactive: boolean;
}

// Video metadata structure
export interface VideoMetadata {
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
}

// Results from scraping operation
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

// Failed video information
export interface FailedVideo {
  url: string;
  error: string;
  retries_attempted: number;
}

// Browser configuration
export interface BrowserConfig {
  headless: boolean;
  interactive: boolean;
  useDarkMode: boolean;
}

// Page interaction configuration
export interface PageConfig {
  useDarkMode?: boolean;
  useTheaterMode?: boolean;
  hideSuggestedVideos?: boolean;
}
