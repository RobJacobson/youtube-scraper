import { Page } from "playwright";
import inquirer from "inquirer";
import { Config, VideoMetadata, FailedVideo, ScrapingResult } from "../types";
import { log, resetTime } from "../utils/logger";
import { createBackoffDelayer } from "../utils/ExponentialBackoff";
import * as browser from "./browser";
import { saveVideoData } from "./output";

// Navigation and timeout constants
const PAGE_NAVIGATION_TIMEOUT = 30000;
const TITLE_SELECTOR_TIMEOUT = 5000;
const FALLBACK_TITLE_TIMEOUT = 2000;
const INITIAL_PAGE_DELAY = 1000;
const CHANNEL_PAGE_TIMEOUT = 30000;

export async function scrapeChannel(config: Config): Promise<ScrapingResult> {
  const startTime = Date.now();
  log.info("🚀 Starting YouTube scraper...");

  const backoff = createBackoffDelayer(config.baseDelay, config.maxRetries);

  try {
    // Initialize browser
    await browser.initializeBrowser({
      headless: config.headless,
      interactive: config.interactive,
      useDarkMode: config.useDarkMode,
    });

    // Discover video URLs
    const videoUrls = await discoverVideoUrls({
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
    await browser.cleanupBrowser();
  }
}

export async function scrapeSingleVideo(
  config: Config
): Promise<ScrapingResult> {
  const startTime = Date.now();
  log.info("🚀 Starting single video scraper...");

  const backoff = createBackoffDelayer(config.baseDelay, config.maxRetries);

  try {
    // Initialize browser
    await browser.initializeBrowser({
      headless: config.headless,
      interactive: config.interactive,
      useDarkMode: config.useDarkMode,
    });

    // Scrape the single video
    const results = await scrapeVideos([config.channelUrl], config, backoff);

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
    await browser.cleanupBrowser();
  }
}

async function discoverVideoUrls(config: {
  channelUrl: string;
  maxVideos: number;
  offset: number;
}): Promise<string[]> {
  const context = browser.getContext();
  const page = await context.newPage();

  try {
    log.info(`🔍 Discovering videos from channel: ${config.channelUrl}`);

    await page.goto(`${config.channelUrl}/videos`, {
      waitUntil: "networkidle",
      timeout: CHANNEL_PAGE_TIMEOUT,
    });

    await browser.setupPage(page, {});
    await browser.scrollToLoadVideos(page);

    const videoUrls = await extractVideoUrls(page, config);
    await page.close();

    log.info(`📹 Found ${videoUrls.length} videos to scrape`);
    return videoUrls;
  } catch (error) {
    await page.close();
    throw error;
  }
}

async function extractVideoUrls(
  page: Page,
  config: { maxVideos: number; offset: number }
): Promise<string[]> {
  return await page.evaluate(
    ({ maxVideos, offset }) => {
      const links = Array.from(
        document.querySelectorAll(
          'a[href*="/watch?v="], a[href*="youtube.com/watch?v="]'
        )
      );

      const uniqueUrls = Array.from(
        new Set(
          links
            .map((link) => (link as HTMLAnchorElement).href)
            .filter((href) => href.includes("/watch?v="))
        )
      );

      return uniqueUrls.slice(offset, offset + maxVideos);
    },
    { maxVideos: config.maxVideos, offset: config.offset }
  );
}

async function scrapeVideos(
  videoUrls: string[],
  config: Config,
  backoff: ReturnType<typeof createBackoffDelayer>
): Promise<{ success: VideoMetadata[]; failed: FailedVideo[] }> {
  const success: VideoMetadata[] = [];
  const failed: FailedVideo[] = [];
  const openPages: Page[] = [];

  log.info(`📊 Starting to scrape ${videoUrls.length} videos...`);

  if (config.interactive) {
    log.info(
      "🎮 Interactive mode enabled - you'll be prompted after each page"
    );
  }

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    resetTime();
    log.info(`🎥 Processing video ${i + 1}/${videoUrls.length}: ${url}`);

    try {
      const { metadata, page } = await scrapeVideoMetadata(url, config);
      success.push(metadata);
      log.info(`✅ Successfully scraped: ${metadata.title}`);

      if (config.interactive) {
        openPages.push(page);
        const shouldContinue = await promptUserAction();
        if (!shouldContinue) {
          log.info("🛑 User requested exit - stopping scraper...");
          break;
        }
      } else {
        await page.close();
        log.debug("📄 Page closed after processing");
      }
    } catch (error) {
      // Handle cleanup for failed pages
      try {
        const context = browser.getContext();
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

      if (config.interactive) {
        const shouldContinue = await promptUserAction();
        if (!shouldContinue) {
          log.info("🛑 User requested exit - stopping scraper...");
          break;
        }
      }
    }

    // Respectful delay between requests (skip in interactive mode)
    if (i < videoUrls.length - 1 && !config.interactive) {
      await backoff.delay();
    }
  }

  // Clean up remaining open pages in interactive mode
  if (config.interactive && openPages.length > 0) {
    log.debug(`🧹 Closing ${openPages.length} remaining pages...`);
    await Promise.all(openPages.map((page) => page.close().catch(() => {})));
  }

  return { success, failed };
}

async function scrapeVideoMetadata(
  url: string,
  config: Config
): Promise<{ metadata: VideoMetadata; page: Page }> {
  const context = browser.getContext();
  const startTime = Date.now();

  log.debug(`🔍 Starting page scrape: ${url}`);

  const page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_NAVIGATION_TIMEOUT,
    });

    // Setup page interactions
    await browser.setupPage(page, {
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
    const metadata = await extractVideoMetadata(page, url);

    // Save all video data
    await saveVideoData(
      metadata,
      page,
      config.outputDir,
      config.skipScreenshots
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(`⏱️  Page scraped in ${duration}s: ${metadata.title || url}`);

    return { metadata, page };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.error(
      `❌ Page scraping failed after ${duration}s: ${url} - ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

async function extractVideoMetadata(
  page: Page,
  url: string
): Promise<VideoMetadata> {
  try {
    // Extract all meta tags in a single comprehensive call
    const combinedMetaTags = await page.evaluate(() => {
      const metaTags = [...document.querySelectorAll("meta")];
      const results = metaTags.reduce((acc, tag) => {
        const attribute =
          tag.getAttribute("property") ||
          tag.getAttribute("name") ||
          tag.getAttribute("itemprop");
        const content = tag.getAttribute("content");
        if (attribute && content) {
          acc[attribute] = content;
        }
        return acc;
      }, {} as Record<string, string>);
      return results;
    });

    log.debug(
      `📝 Extracted ${
        Object.keys(combinedMetaTags).length
      } meta tags for video ${url}`
    );

    // Expand description if possible
    await browser.expandDescription(page);

    const expandedDescription = await page.evaluate(() => {
      const descriptionElement = document.querySelector(
        "#description-inline-expander > yt-attributed-string"
      ) as HTMLElement;
      return descriptionElement?.innerText || "";
    });

    return {
      id: combinedMetaTags["identifier"] || "",
      url: combinedMetaTags["og:url"] || "",
      title: combinedMetaTags["og:title"] || "",
      description: combinedMetaTags["og:description"] || "",
      keywords: combinedMetaTags["keywords"] || "",
      image: combinedMetaTags["og:image"] || "",
      name: combinedMetaTags["name"] || "",
      duration: combinedMetaTags["duration"] || "",
      width: combinedMetaTags["width"] || "",
      height: combinedMetaTags["height"] || "",
      userInteractionCount: combinedMetaTags["userInteractionCount"] || "",
      datePublished: combinedMetaTags["datePublished"] || "",
      uploadDate: combinedMetaTags["uploadDate"] || "",
      genre: combinedMetaTags["genre"] || "",
      expandedDescription,
      scraped_url: url,
      scraped_at: new Date().toISOString(),
    };
  } catch (error) {
    log.error(
      `❌ Error extracting metadata: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
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
