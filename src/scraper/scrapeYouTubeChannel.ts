import { chromium, Browser, BrowserContext } from "playwright";
import { Config } from "../types/Config";
import { ScrapingResult } from "../types/VideoMetadata";
import {
  BackoffDelayer,
  createBackoffDelayer,
} from "../utils/ExponentialBackoff";
import { saveResults } from "../utils/fileSystem";
import { initializeLogger, getLogger } from "../utils/globalLogger";
import { getVideoUrls } from "./getVideoUrls";
import { scrapeVideos } from "./scrapeVideos";

// Browser configuration constants
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const DEVICE_SCALE_FACTOR = 1.5; // 150% zoom
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

export interface ScrapingContext {
  browser: Browser;
  context: BrowserContext;
  backoff: BackoffDelayer;
  config: Config;
}

export async function scrapeYouTubeChannel(
  config: Config
): Promise<ScrapingResult> {
  const startTime = Date.now();

  // Initialize global logger
  initializeLogger(config.verbose);
  const logger = getLogger();

  logger.info("🚀 Starting YouTube scraper...");

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    const scrapingContext = await initializeScraping(config);
    browser = scrapingContext.browser;
    context = scrapingContext.context;

    const videoUrls = await getVideoUrls(scrapingContext);
    const results = await scrapeVideos(videoUrls, scrapingContext);

    const scrapingResult = {
      ...results,
      summary: {
        total_attempted: videoUrls.length,
        successful: results.success.length,
        failed: results.failed.length,
        duration_ms: Date.now() - startTime,
      },
    };

    await saveResults(scrapingResult, config.outputDir);
    logger.info(`📊 Results saved to: ${config.outputDir}`);

    return scrapingResult;
  } finally {
    await cleanupScraping(browser, context);
  }
}

async function initializeScraping(config: Config): Promise<ScrapingContext> {
  const logger = getLogger();
  logger.info("🔧 Initializing browser...");

  const browser = await chromium.launch({
    headless: config.headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    userAgent: USER_AGENT,
    colorScheme: config.useDarkMode ? "dark" : "light",
  });

  const backoff = createBackoffDelayer(config.baseDelay, config.maxRetries);

  return { browser, context, backoff, config };
}

async function cleanupScraping(
  browser: Browser | null,
  context: BrowserContext | null
): Promise<void> {
  const logger = getLogger();
  if (context) {
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
  logger.info("🧹 Cleanup completed");
}
