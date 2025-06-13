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
import { VideoOutputService } from "./videoOutputService";
import {
  BackoffDelayer,
  createBackoffDelayer,
} from "../../utils/ExponentialBackoff";
import { log, resetTime } from "../../utils/logger";
import inquirer from "inquirer";

// Navigation and timeout constants
const PAGE_NAVIGATION_TIMEOUT = 30000;
const TITLE_SELECTOR_TIMEOUT = 5000;
const FALLBACK_TITLE_TIMEOUT = 2000;
const INITIAL_PAGE_DELAY = 1000;

export interface ScrapingOrchestrator {
  scrapeChannel: (config: Config) => Promise<ScrapingResult>;
  scrapeSingleVideo: (config: Config) => Promise<ScrapingResult>;
}

export const createScrapingOrchestrator = (
  browserService: BrowserService,
  videoDiscoveryService: VideoDiscoveryService,
  pageInteractionService: PageInteractionService,
  metadataExtractionService: MetadataExtractionService,
  videoOutputService: VideoOutputService
): ScrapingOrchestrator => {
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
      log.info(`⏱️  Page scraped in ${duration}s: ${titleOrUrl}`);
    } else {
      log.error(
        `❌ Page scraping failed after ${duration}s: ${titleOrUrl}${
          error ? ` - ${error}` : ""
        }`
      );
    }
  };

  const scrapeVideoMetadataWithPage = async (
    url: string,
    config: Config
  ): Promise<{ metadata: VideoMetadata; page: Page }> => {
    const context = browserService.getContext();
    const startTime = Date.now();

    log.debug(`🔍 Starting page scrape: ${url}`);

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

      // Use the new video output service to save all data
      const savedFolderPath = await videoOutputService.saveVideoData(
        metadata,
        page,
        config.outputDir,
        config.skipScreenshots
      );

      const finalMetadata: VideoMetadata = {
        ...metadata,
      };

      logScrapingDuration(startTime, finalMetadata.title || url);
      return { metadata: finalMetadata, page };
    } catch (error) {
      logScrapingDuration(
        startTime,
        url,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
    // Note: Don't close the page here, let the caller handle it
  };

  const scrapeVideos = async (
    videoUrls: string[],
    config: Config,
    backoff: BackoffDelayer
  ): Promise<{ success: VideoMetadata[]; failed: FailedVideo[] }> => {
    const success: VideoMetadata[] = [];
    const failed: FailedVideo[] = [];
    const openPages: Page[] = []; // Track open pages in interactive mode

    log.info(`📊 Starting to scrape ${videoUrls.length} videos...`);

    if (config.interactive) {
      log.info(
        "🎮 Interactive mode enabled - you'll be prompted after each page"
      );
    }

    for (let i = 0; i < videoUrls.length; i++) {
      const url = videoUrls[i];

      // Reset the clock before processing each video
      resetTime();

      log.info(`🎥 Processing video ${i + 1}/${videoUrls.length}: ${url}`);

      try {
        const { metadata, page } = await scrapeVideoMetadataWithPage(
          url,
          config
        );
        success.push(metadata);
        log.info(`✅ Successfully scraped: ${metadata.title}`);

        // Interactive mode: prompt user after successful scrape
        if (config.interactive) {
          // Track page for cleanup later
          openPages.push(page);

          const shouldContinue = await promptUserAction();
          if (!shouldContinue) {
            log.info("🛑 User requested exit - stopping scraper...");
            break;
          }
        } else {
          // Non-interactive mode: close page immediately after processing
          await page.close();
          log.debug("📄 Page closed after processing");
        }
      } catch (error) {
        // Try to close any page that might have been created
        try {
          const context = browserService.getContext();
          const pages = context.pages();
          const lastPage = pages[pages.length - 1];
          if (lastPage && !config.interactive) {
            await lastPage.close();
          }
        } catch (closeError) {
          // Ignore cleanup errors
        }

        const failedVideo: FailedVideo = {
          url,
          error: error instanceof Error ? error.message : String(error),
          retries_attempted: config.maxRetries,
        };
        failed.push(failedVideo);
        log.error(`❌ Failed to scrape: ${url} - ${failedVideo.error}`);

        // Interactive mode: prompt user even after failures
        if (config.interactive) {
          const shouldContinue = await promptUserAction();
          if (!shouldContinue) {
            log.info("🛑 User requested exit - stopping scraper...");
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
      log.debug(`🧹 Closing ${openPages.length} remaining pages...`);
      await Promise.all(openPages.map((page) => page.close().catch(() => {})));
    }

    return { success, failed };
  };

  const scrapeChannel = async (config: Config): Promise<ScrapingResult> => {
    const startTime = Date.now();
    log.info("🚀 Starting YouTube scraper...");

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

      log.info(
        `📊 Scraping completed: ${results.success.length}/${videoUrls.length} successful`
      );
      return scrapingResult;
    } finally {
      await browserService.cleanup();
    }
  };

  const scrapeSingleVideo = async (config: Config): Promise<ScrapingResult> => {
    const startTime = Date.now();
    log.info("🚀 Starting single video scraper...");

    // Create backoff with config values
    const backoff = createBackoffDelayer(config.baseDelay, config.maxRetries);

    try {
      // Initialize browser
      await browserService.initialize({
        headless: config.headless,
        interactive: config.interactive,
        useDarkMode: config.useDarkMode,
      });

      // For single video, the channelUrl is actually the video URL
      const videoUrl = config.channelUrl;

      // Scrape the single video
      const results = await scrapeVideos([videoUrl], config, backoff);

      const scrapingResult: ScrapingResult = {
        ...results,
        summary: {
          total_attempted: 1,
          successful: results.success.length,
          failed: results.failed.length,
          duration_ms: Date.now() - startTime,
        },
      };

      log.info(
        `📊 Single video scraping completed: ${results.success.length}/1 successful`
      );
      return scrapingResult;
    } finally {
      await browserService.cleanup();
    }
  };

  return {
    scrapeChannel,
    scrapeSingleVideo,
  };
};
