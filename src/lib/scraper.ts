import inquirer from "inquirer";
import { Config, VideoMetadata, FailedVideo, ScrapingResult } from "../types";
import { log, resetTime } from "../utils/logger";
import { createBackoffDelayer } from "../utils/ExponentialBackoff";
import * as browser from "./browser";
import { scrapeVideoPage, VideoPageResult } from "./scrapeVideoPage";
import { scrapeChannelPage } from "./scrapeChannelPage";
import { saveVideoDataFromBuffers } from "./output";

// Helper function to save video data from the new scraper result
async function saveVideoDataFromResult(
  result: VideoPageResult,
  outputDir: string,
): Promise<void> {
  await saveVideoDataFromBuffers(
    result.metadata,
    result.screenshot,
    result.image,
    outputDir,
    result.htmlContent,
  );
}

export async function scrapeChannel(config: Config): Promise<ScrapingResult> {
  const startTime = Date.now();
  log.info("🚀 Starting YouTube scraper...");

  const backoff = createBackoffDelayer(config.baseDelay, config.maxRetries);

  try {
    // Initialize browser
    await browser.initializeBrowser(config);

    // Get video URLs - either from channel or single video
    const videoUrls = await getVideoUrls(config);

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
      `📊 Scraping completed: ${results.success.length}/${videoUrls.length} successful`,
    );
    return scrapingResult;
  } finally {
    await browser.cleanupBrowser();
  }
}

async function getVideoUrls(config: Config): Promise<string[]> {
  // Check if it's a single video URL (contains /watch?v=)
  if (config.channelUrl.includes("/watch?v=")) {
    log.info("🎥 Single video mode detected");
    return [config.channelUrl];
  }

  // Otherwise, scrape channel for video URLs
  log.info("📺 Channel mode detected");
  const channelResult = await scrapeChannelPage(config.channelUrl, config);
  return channelResult.videoUrls;
}

async function scrapeVideos(
  videoUrls: string[],
  config: Config,
  backoff: ReturnType<typeof createBackoffDelayer>,
): Promise<{ success: VideoMetadata[]; failed: FailedVideo[] }> {
  const success: VideoMetadata[] = [];
  const failed: FailedVideo[] = [];

  log.info(
    `📊 Starting to scrape ${videoUrls.length} video${
      videoUrls.length === 1 ? "" : "s"
    }...`,
  );

  if (config.interactive) {
    log.info(
      "🎮 Interactive mode enabled - you'll be prompted after each page",
    );
  }

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    resetTime();
    log.info(`🎥 Processing video ${i + 1}/${videoUrls.length}: ${url}`);

    try {
      const videoResult = await scrapeVideoPage(url, config);

      // Save the scraped data
      await saveVideoDataFromResult(videoResult, config.outputDir);

      success.push(videoResult.metadata);
      log.info(`✅ Successfully scraped: ${videoResult.metadata.title}`);

      if (config.interactive) {
        const shouldContinue = await promptUserAction();
        if (!shouldContinue) {
          log.info("🛑 User requested exit - stopping scraper...");
          break;
        }
      }
    } catch (error) {
      const failedVideo: FailedVideo = {
        url,
        error: error instanceof Error ? error.message : String(error),
        retries_attempted: config.maxRetries,
      };
      failed.push(failedVideo);
      log.error(`❌ Failed to scrape: ${url} - ${failedVideo.error}`);

      if (config.interactive) {
        const shouldContinue = await promptUserAction();
        if (!shouldContinue) {
          log.info("🛑 User requested exit - stopping scraper...");
          break;
        }
      }
    }

    // Respectful delay between requests (skip in interactive mode or single video)
    if (
      i < videoUrls.length - 1 &&
      !config.interactive &&
      videoUrls.length > 1
    ) {
      await backoff.delay();
    }
  }

  return { success, failed };
}

async function promptUserAction(): Promise<boolean> {
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
}
