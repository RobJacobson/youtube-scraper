import { Page } from "playwright";
import { Config } from "../../types/Config";
import {
  VideoMetadata,
  FailedVideo,
  ScrapingResult,
} from "../../types/VideoMetadata";
import { BrowserService } from "./browserService";
import { VideoDiscoveryService } from "./videoDiscoveryService";
import { PageInteractionService } from "./pageInteractionService";
import { MetadataExtractionService } from "./metadataExtractionService";
import { ScreenshotService } from "./screenshotService";
import {
  BackoffDelayer,
  createBackoffDelayer,
} from "../../utils/ExponentialBackoff";
import { getLogger, resetTime } from "../../utils/globalLogger";
import inquirer from "inquirer";

// Navigation and timeout constants
const PAGE_NAVIGATION_TIMEOUT = 30000;
const TITLE_SELECTOR_TIMEOUT = 5000;
const FALLBACK_TITLE_TIMEOUT = 2000;
const INITIAL_PAGE_DELAY = 1000;

export interface ScrapingOrchestrator {
  scrapeChannel: (config: Config) => Promise<ScrapingResult>;
}

export const createScrapingOrchestrator = (
  browserService: BrowserService,
  videoDiscoveryService: VideoDiscoveryService,
  pageInteractionService: PageInteractionService,
  metadataExtractionService: MetadataExtractionService,
  screenshotService: ScreenshotService
): ScrapingOrchestrator => {
  const logger = getLogger();

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

  const logScrapingDuration = (
    startTime: number,
    titleOrUrl: string,
    error?: string
  ): void => {
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
    config: Config
  ): Promise<VideoMetadata> => {
    const context = browserService.getContext();
    const startTime = Date.now();

    logger.debug(`🔍 Starting page scrape: ${url}`);

    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: PAGE_NAVIGATION_TIMEOUT,
      });

      // Setup page interactions
      await pageInteractionService.setupVideoPage(page, {
        useDarkMode: config.useDarkMode,
        useTheaterMode: config.useTheaterMode,
        hideSuggestedVideos: config.hideSuggestedVideos,
      });

      // Wait for content to load
      try {
        await page.waitForSelector("h1:not([hidden])", {
          state: "visible",
          timeout: TITLE_SELECTOR_TIMEOUT,
        });
      } catch {
        await page.waitForSelector("title", {
          timeout: FALLBACK_TITLE_TIMEOUT,
        });
      }

      await page.waitForTimeout(INITIAL_PAGE_DELAY);

      // Extract metadata
      const metadata = await metadataExtractionService.extractVideoMetadata(
        page,
        url
      );

      // Take screenshot if enabled
      const screenshotPath = await screenshotService.takeScreenshot(
        page,
        metadata.id,
        {
          outputDir: config.outputDir,
          skipScreenshots: config.skipScreenshots,
        }
      );

      const finalMetadata: VideoMetadata = {
        ...metadata,
        screenshot_path: screenshotPath,
      };

      logScrapingDuration(startTime, finalMetadata.title);
      return finalMetadata;
    } catch (error) {
      logScrapingDuration(
        startTime,
        url,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    } finally {
      if (!config.interactive) {
        await page.close();
      }
    }
  };

  const scrapeVideoMetadataWithPage = async (
    url: string,
    config: Config
  ): Promise<{ metadata: VideoMetadata; page: Page | null }> => {
    if (config.interactive) {
      // In interactive mode, return page for inspection
      const metadata = await scrapeVideoMetadata(url, config);
      // Get the last opened page from context
      const context = browserService.getContext();
      const pages = context.pages();
      const page = pages[pages.length - 1];
      return { metadata, page };
    } else {
      // Normal mode - page is closed in scrapeVideoMetadata
      const metadata = await scrapeVideoMetadata(url, config);
      return { metadata, page: null };
    }
  };

  const scrapeVideos = async (
    videoUrls: string[],
    config: Config,
    backoff: BackoffDelayer
  ): Promise<{ success: VideoMetadata[]; failed: FailedVideo[] }> => {
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
          config
        );
        success.push(metadata);
        logger.info(`✅ Successfully scraped: ${metadata.title}`);

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

  const scrapeChannel = async (config: Config): Promise<ScrapingResult> => {
    const startTime = Date.now();
    logger.info("🚀 Starting YouTube scraper...");

    // Create backoff with config values
    const backoff = createBackoffDelayer(config.baseDelay, config.maxRetries);

    try {
      // Initialize browser
      await browserService.initialize({
        headless: config.headless,
        interactive: config.interactive,
        useDarkMode: config.useDarkMode,
      });

      // Discover video URLs
      const videoUrls = await videoDiscoveryService.discoverVideoUrls({
        channelUrl: config.channelUrl,
        maxVideos: config.maxVideos,
        offset: config.offset,
      });

      // Scrape videos
      const results = await scrapeVideos(videoUrls, config, backoff);

      const scrapingResult: ScrapingResult = {
        ...results,
        summary: {
          total_attempted: videoUrls.length,
          successful: results.success.length,
          failed: results.failed.length,
          duration_ms: Date.now() - startTime,
        },
      };

      logger.info(
        `📊 Scraping completed: ${results.success.length}/${videoUrls.length} successful`
      );
      return scrapingResult;
    } finally {
      await browserService.cleanup();
    }
  };

  return {
    scrapeChannel,
  };
};
