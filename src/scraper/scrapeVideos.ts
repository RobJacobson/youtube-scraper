import { Page } from "playwright";
import { VideoMetadata, FailedVideo } from "../types/VideoMetadata";
import { Config } from "../types/Config";
import { Logger } from "../utils/Logger";
import { ScrapingContext } from "./scrapeYouTubeChannel";
import {
  dismissPopups,
  pauseVideo,
  enableDarkMode,
  enableTheaterMode,
  hideSuggestedContent,
} from "./helpers/pageHelpers";
import {
  extractVideoId,
  extractTags,
  extractLanguage,
  expandDescriptionAndComments,
  takeScreenshot,
} from "./helpers/contentHelpers";
import { extractPageMetadata } from "./helpers/metadataExtractor";

// Navigation and timeout constants
const PAGE_NAVIGATION_TIMEOUT = 30000;
const TITLE_SELECTOR_TIMEOUT = 5000;
const FALLBACK_TITLE_TIMEOUT = 2000;
const INITIAL_PAGE_DELAY = 1000;
const PAGE_SETUP_DELAY = 1000;

export async function scrapeVideos(
  videoUrls: string[],
  scrapingContext: ScrapingContext
): Promise<{ success: VideoMetadata[]; failed: FailedVideo[] }> {
  const { config, logger, backoff } = scrapingContext;
  const success: VideoMetadata[] = [];
  const failed: FailedVideo[] = [];

  logger.info(`📊 Starting to scrape ${videoUrls.length} videos...`);

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    logger.info(`🎥 Processing video ${i + 1}/${videoUrls.length}: ${url}`);

    try {
      const metadata = await scrapeVideoMetadata(url, scrapingContext);
      success.push(metadata);
      logger.success(`✅ Successfully scraped: ${metadata.title}`);
    } catch (error) {
      const failedVideo: FailedVideo = {
        url,
        error: error instanceof Error ? error.message : String(error),
        retries_attempted: config.maxRetries,
      };
      failed.push(failedVideo);
      logger.error(`❌ Failed to scrape: ${url} - ${failedVideo.error}`);
    }

    // Respectful delay between requests
    if (i < videoUrls.length - 1) {
      await backoff.delay();
    }
  }

  return { success, failed };
}

async function scrapeVideoMetadata(
  url: string,
  scrapingContext: ScrapingContext
): Promise<VideoMetadata> {
  const { context, config, logger } = scrapingContext;
  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_NAVIGATION_TIMEOUT,
    });

    // Single page setup - combine all tasks
    await setupPage(page, config, logger);

    // Expand content and extract metadata
    await expandDescriptionAndComments(page, logger);

    // Wait for content to load
    try {
      await page.waitForSelector("h1:not([hidden])", {
        state: "visible",
        timeout: TITLE_SELECTOR_TIMEOUT,
      });
    } catch {
      await page.waitForSelector("title", { timeout: FALLBACK_TITLE_TIMEOUT });
    }

    // Extract metadata using the refactored function
    const metadata = await extractPageMetadata(page, url);

    // Extract video ID from URL
    const videoId = extractVideoId(url);

    // Complete metadata object
    const completeMetadata: VideoMetadata = {
      id: videoId,
      ...metadata,
      tags: await extractTags(page),
      language: await extractLanguage(page),
      scraped_at: new Date().toISOString(),
    };

    // Take screenshot if not disabled
    if (!config.skipScreenshots) {
      const screenshotPath = await takeScreenshot(
        page,
        videoId,
        config,
        logger
      );
      completeMetadata.screenshot_path = screenshotPath;
    }

    return completeMetadata;
  } finally {
    await page.close();
  }
}

// Simplified page setup - one function, one popup dismissal
async function setupPage(
  page: Page,
  config: Config,
  logger: Logger
): Promise<void> {
  // Wait for initial load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(INITIAL_PAGE_DELAY);

  // Single popup dismissal at the start
  await dismissPopups(page, logger);

  // Setup all features at once with Promise.allSettled
  const setupTasks = [pauseVideo(page, logger)];

  if (config.useDarkMode) {
    setupTasks.push(enableDarkMode(page, logger));
  }

  if (config.useTheaterMode) {
    setupTasks.push(enableTheaterMode(page, logger));
  }

  if (config.hideSuggestedVideos) {
    setupTasks.push(hideSuggestedContent(page, logger));
  }

  await Promise.allSettled(setupTasks);
}
