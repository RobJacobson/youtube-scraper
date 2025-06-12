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
}
