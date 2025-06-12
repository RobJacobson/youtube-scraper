import { chromium, Browser, BrowserContext } from "playwright";
import { Config } from "../types/Config";
import { ScrapingResult } from "../types/VideoMetadata";
import { ExponentialBackoff } from "../utils/ExponentialBackoff";
import { saveResults } from "../utils/fileSystem";
import { Logger } from "../utils/Logger";
import { getVideoUrls } from "./getVideoUrls";
import { scrapeVideos } from "./scrapeVideos";

export interface ScrapingContext {
  browser: Browser;
  context: BrowserContext;
  backoff: ExponentialBackoff;
  logger: Logger;
  config: Config;
}

export async function scrapeYouTubeChannel(
  config: Config,
): Promise<ScrapingResult> {
  const startTime = Date.now();
  const logger = new Logger(config.verbose);
  logger.info("🚀 Starting YouTube scraper...");

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    const scrapingContext = await initializeScraping(config, logger);
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
    await cleanupScraping(browser, context, new Logger(config.verbose));
  }
}

async function initializeScraping(
  config: Config,
  logger: Logger,
): Promise<ScrapingContext> {
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
    viewport: { width: 1024, height: 720 },
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    colorScheme: config.useDarkMode ? "dark" : "light",
  });

  const backoff = new ExponentialBackoff(config.baseDelay, config.maxRetries);

  return { browser, context, backoff, logger, config };
}

async function cleanupScraping(
  browser: Browser | null,
  context: BrowserContext | null,
  logger: Logger,
): Promise<void> {
  if (context) {
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
  logger.info("🧹 Cleanup completed");
}
