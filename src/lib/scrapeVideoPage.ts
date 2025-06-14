import { Page } from "playwright";
import { VideoMetadata } from "../types";
import { log } from "../utils/logger";
import * as browser from "./browser";

// Navigation and timeout constants
const PAGE_NAVIGATION_TIMEOUT = 30000;
const TITLE_SELECTOR_TIMEOUT = 5000;
const FALLBACK_TITLE_TIMEOUT = 2000;
const INITIAL_PAGE_DELAY = 1000;
const SCREENSHOT_SCROLL_DELAY = 1000;

export interface VideoPageResult {
  metadata: VideoMetadata;
  screenshot: Buffer;
  image: Buffer | null;
  htmlContent?: string;
}

export async function scrapeVideoPage(
  url: string,
  config: {
    useDarkMode?: boolean;
    useTheaterMode?: boolean;
    hideSuggestedVideos?: boolean;
    skipScreenshots?: boolean;
    saveCompleteHtml?: boolean;
  } = {},
): Promise<VideoPageResult> {
  const context = browser.getContext();
  const startTime = Date.now();

  log.debug(`🔍 Starting video page scrape: ${url}`);

  const page = await context.newPage();

  try {
    // Navigate to video page
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: PAGE_NAVIGATION_TIMEOUT,
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

    // Setup page interactions (video page specific)
    await browser.setupPage(page, config, true);

    // Extract metadata
    const metadata = await extractVideoMetadata(page, url);

    // Take screenshot
    const screenshot = config.skipScreenshots
      ? Buffer.alloc(0)
      : await takeScreenshot(page);

    // Download image
    const image = await downloadImage(metadata.image);

    // Get complete HTML if requested
    const htmlContent = config.saveCompleteHtml
      ? await getCompleteHtml(page)
      : undefined;

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(
      `⏱️  Video page scraped in ${duration}s: ${metadata.title || url}`,
    );

    return { metadata, screenshot, image, htmlContent };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.error(
      `❌ Video page scraping failed after ${duration}s: ${url} - ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  } finally {
    await page.close();
  }
}

async function extractVideoMetadata(
  page: Page,
  url: string,
): Promise<VideoMetadata> {
  try {
    // Extract all meta tags in a single comprehensive call
    const combinedMetaTags = await page.evaluate(() => {
      const metaTags = [...document.querySelectorAll("meta")];
      const results = metaTags.reduce(
        (acc, tag) => {
          const attribute =
            tag.getAttribute("property") ||
            tag.getAttribute("name") ||
            tag.getAttribute("itemprop");
          const content = tag.getAttribute("content");
          if (attribute && content) {
            acc[attribute] = content;
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      return results;
    });

    const expandedDescription = await page.evaluate(() => {
      const descriptionElement = document.querySelector(
        "#description-inline-expander > yt-attributed-string",
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
      }`,
    );
    throw error;
  }
}

async function takeScreenshot(page: Page): Promise<Buffer> {
  try {
    log.debug("📸 Taking screenshot...");

    await page.waitForTimeout(SCREENSHOT_SCROLL_DELAY);
    const screenshot = await page.screenshot({
      fullPage: false,
      type: "png",
    });

    log.debug("📸 Screenshot captured");
    return screenshot;
  } catch (error) {
    log.error(
      `❌ Failed to take screenshot: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    throw error;
  }
}

async function downloadImage(imageUrl: string): Promise<Buffer | null> {
  if (!imageUrl) {
    log.info("🖼️  No image URL available");
    return null;
  }

  try {
    log.debug(`🖼️  Downloading image from: ${imageUrl}`);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      log.error(
        `❌ Failed to download image: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    log.debug("🖼️  Image downloaded");
    return Buffer.from(buffer);
  } catch (error) {
    log.error(
      `❌ Error downloading image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    return null;
  }
}

async function getCompleteHtml(page: Page): Promise<string> {
  try {
    log.debug("📄 Generating complete HTML...");

    // Get the current HTML content
    const htmlContent = await page.content();

    // Extract and inline CSS
    const completeHtml = await page.evaluate(() => {
      // Get all stylesheets
      const styleSheets = Array.from(document.styleSheets);
      let inlinedCSS = "";

      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          for (const rule of rules) {
            inlinedCSS += rule.cssText + "\n";
          }
        } catch (e) {
          // Skip cross-origin stylesheets that can't be accessed
          console.warn("Could not access stylesheet:", e);
        }
      }

      // Create a style tag with all CSS
      const styleTag = `<style type="text/css">\n${inlinedCSS}\n</style>`;

      // Insert the style tag before the closing head tag
      let html = document.documentElement.outerHTML;
      html = html.replace("</head>", `${styleTag}\n</head>`);

      return html;
    });

    log.debug("📄 Complete HTML generated");
    return completeHtml;
  } catch (error) {
    log.error(
      `❌ Error generating complete HTML: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    // Fallback to basic HTML
    return await page.content();
  }
}
