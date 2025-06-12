import { Page } from "playwright";
import { VideoMetadata, FailedVideo } from "../types/VideoMetadata";
import { Config } from "../types/Config";
import { ScrapingContext } from "./scrapeYouTubeChannel";
import { getLogger, resetTime } from "../utils/globalLogger";
import inquirer from "inquirer";
import {
  dismissPopups,
  pauseVideo,
  expandDescription,
  hideSuggestedContent,
} from "./helpers/pageHelpers";
import { takeScreenshot } from "./helpers/contentHelpers";
import { extractPageMetadata } from "./helpers/metadataExtractor";

// Navigation and timeout constants
const PAGE_NAVIGATION_TIMEOUT = 30000;
const TITLE_SELECTOR_TIMEOUT = 5000;
const FALLBACK_TITLE_TIMEOUT = 2000;
const INITIAL_PAGE_DELAY = 1000;

export const scrapeVideos = async (
  videoUrls: string[],
  scrapingContext: ScrapingContext
): Promise<{ success: VideoMetadata[]; failed: FailedVideo[] }> => {
  const { config, backoff } = scrapingContext;
  const logger = getLogger();
  const success: VideoMetadata[] = [];
  const failed: FailedVideo[] = [];
  const openPages: Page[] = []; // Track open pages in interactive mode

  logger.info(`📊 Starting to scrape ${videoUrls.length} videos...`);

  if (config.interactive) {
    logger.info(
      "🎮 Interactive mode enabled - you'll be prompted after each page"
    );
  }

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];

    // Reset the clock before processing each video
    resetTime();

    logger.info(`🎥 Processing video ${i + 1}/${videoUrls.length}: ${url}`);

    try {
      const { metadata, page } = await scrapeVideoMetadataWithPage(
        url,
        scrapingContext
      );
      success.push(metadata);
      logger.success(`✅ Successfully scraped: ${metadata.title}`);

      // Track page in interactive mode
      if (config.interactive && page) {
        openPages.push(page);
      }

      // Interactive mode: prompt user after successful scrape
      if (config.interactive) {
        const shouldContinue = await promptUserAction();
        if (!shouldContinue) {
          logger.info("🛑 User requested exit - stopping scraper...");
          break;
        }
        // Close the page after user prompt
        if (page) {
          await page.close();
          logger.debug("📄 Page closed after user prompt");
        }
      }
    } catch (error) {
      const failedVideo: FailedVideo = {
        url,
        error: error instanceof Error ? error.message : String(error),
        retries_attempted: config.maxRetries,
      };
      failed.push(failedVideo);
      logger.error(`❌ Failed to scrape: ${url} - ${failedVideo.error}`);

      // Interactive mode: prompt user even after failures
      if (config.interactive) {
        const shouldContinue = await promptUserAction();
        if (!shouldContinue) {
          logger.info("🛑 User requested exit - stopping scraper...");
          break;
        }
      }
    }

    // Respectful delay between requests (skip in interactive mode as user controls pacing)
    if (i < videoUrls.length - 1 && !config.interactive) {
      await backoff.delay();
    }
  }

  // Clean up any remaining open pages in interactive mode
  if (config.interactive && openPages.length > 0) {
    logger.debug(`🧹 Closing ${openPages.length} remaining pages...`);
    await Promise.all(openPages.map((page) => page.close().catch(() => {})));
  }

  return { success, failed };
};

// Modified function to return both metadata and page for interactive mode
const scrapeVideoMetadataWithPage = async (
  url: string,
  scrapingContext: ScrapingContext
): Promise<{ metadata: VideoMetadata; page: Page | null }> => {
  const { config } = scrapingContext;

  if (config.interactive) {
    // In interactive mode, return page for inspection
    const metadata = await scrapeVideoMetadata(url, scrapingContext);
    // Get the last opened page from context (this is a bit hacky but works)
    const pages = scrapingContext.context.pages();
    const page = pages[pages.length - 1];
    return { metadata, page };
  } else {
    // Normal mode - page is closed in scrapeVideoMetadata
    const metadata = await scrapeVideoMetadata(url, scrapingContext);
    return { metadata, page: null };
  }
};

// Interactive mode user prompt
const promptUserAction = async (): Promise<boolean> => {
  const { action } = await inquirer.prompt([
    {
      type: "input",
      name: "action",
      message: "Press 'n' for next video, 'q' to quit:",
      validate: (input: string) => {
        const choice = input.toLowerCase().trim();
        return (
          choice === "n" ||
          choice === "q" ||
          "Please enter 'n' for next or 'q' to quit"
        );
      },
    },
  ]);

  return action.toLowerCase().trim() !== "q";
};

// Helper function to log scraping duration
const logScrapingDuration = (
  startTime: number,
  titleOrUrl: string,
  error?: string
): void => {
  const logger = getLogger();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!error) {
    logger.info(`⏱️  Page scraped in ${duration}s: ${titleOrUrl}`);
  } else {
    logger.error(
      `❌ Page scraping failed after ${duration}s: ${titleOrUrl}${
        error ? ` - ${error}` : ""
      }`
    );
  }
};

const scrapeVideoMetadata = async (
  url: string,
  scrapingContext: ScrapingContext
): Promise<VideoMetadata> => {
  const { context, config } = scrapingContext;
  const logger = getLogger();
  const startTime = Date.now();

  logger.debug(`🔍 Starting page scrape: ${url}`);

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_NAVIGATION_TIMEOUT,
    });

    // Single page setup - combine all tasks
    await setupPage(page, config);

    // Wait for content to load
    try {
      await page.waitForSelector("h1:not([hidden])", {
        state: "visible",
        timeout: TITLE_SELECTOR_TIMEOUT,
      });
    } catch {
      await page.waitForSelector("title", { timeout: FALLBACK_TITLE_TIMEOUT });
    }

    // Extract complete metadata using the refactored function
    const completeMetadata = await extractPageMetadata(page, url);

    // Take screenshot if not disabled
    if (!config.skipScreenshots) {
      const screenshotPath = await takeScreenshot(
        page,
        completeMetadata.id,
        config
      );

      logScrapingDuration(startTime, completeMetadata.title || "Unknown Title");

      return { ...completeMetadata, screenshot_path: screenshotPath };
    }

    logScrapingDuration(startTime, completeMetadata.title || "Unknown Title");

    return completeMetadata;
  } catch (error) {
    logScrapingDuration(
      startTime,
      url,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  } finally {
    // In interactive mode, keep the page open for user inspection
    if (!config.interactive) {
      await page.close();
    } else {
      logger.info(
        "🎮 Page kept open for inspection - will close after user prompt"
      );
    }
  }
};

// Simplified page setup - one function, one popup dismissal
const setupPage = async (page: Page, config: Config): Promise<void> => {
  // Wait for initial load
  if (config.hideSuggestedVideos) {
    await hideSuggestedContent(page);
  }
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(INITIAL_PAGE_DELAY);
  await pauseVideo(page);
  await dismissPopups(page);
  await expandDescription(page);

  const logger = getLogger();
  logger.debug("Setup tasks complete");
};
