import { Page } from "playwright";
import { log } from "../utils/logger";
import * as browser from "./browser";

// Navigation and timeout constants
const CHANNEL_PAGE_TIMEOUT = 30000;

export interface ChannelPageResult {
  videoUrls: string[];
  channelTitle?: string;
  channelDescription?: string;
}

export async function scrapeChannelPage(
  channelUrl: string,
  config: {
    maxVideos: number;
    offset: number;
    useDarkMode?: boolean;
  },
): Promise<ChannelPageResult> {
  const context = browser.getContext();
  const page = await context.newPage();

  try {
    log.info(`🔍 Discovering videos from channel: ${channelUrl}`);

    // Navigate to channel videos page
    const videosUrl = `${channelUrl}/videos`;
    await page.goto(videosUrl, {
      waitUntil: "networkidle",
      timeout: CHANNEL_PAGE_TIMEOUT,
    });

    // Setup page (channel page - no description expansion needed)
    await browser.setupPage(
      page,
      {
        useDarkMode: config.useDarkMode,
        skipDescriptionExpansion: true,
      },
      false,
    );

    // Scroll to load more videos
    await browser.scrollToLoadVideos(page);

    // Extract video URLs
    const videoUrls = await extractVideoUrls(page, config);

    // Extract channel metadata (optional)
    const channelMetadata = await extractChannelMetadata(page);

    log.info(`📹 Found ${videoUrls.length} videos from channel`);

    return {
      videoUrls,
      ...channelMetadata,
    };
  } catch (error) {
    log.error(
      `❌ Failed to scrape channel page: ${channelUrl} - ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  } finally {
    await page.close();
  }
}

async function extractVideoUrls(
  page: Page,
  config: { maxVideos: number; offset: number },
): Promise<string[]> {
  return await page.evaluate(
    ({ maxVideos, offset }) => {
      const links = Array.from(
        document.querySelectorAll(
          'a[href*="/watch?v="], a[href*="youtube.com/watch?v="]',
        ),
      );

      const uniqueUrls = Array.from(
        new Set(
          links
            .map((link) => (link as HTMLAnchorElement).href)
            .filter((href) => href.includes("/watch?v=")),
        ),
      );

      return uniqueUrls.slice(offset, offset + maxVideos);
    },
    { maxVideos: config.maxVideos, offset: config.offset },
  );
}

async function extractChannelMetadata(
  page: Page,
): Promise<{ channelTitle?: string; channelDescription?: string }> {
  try {
    const channelData = await page.evaluate(() => {
      // Try to get channel title
      const titleElement = document.querySelector(
        "yt-formatted-string#text.ytd-channel-name",
      ) as HTMLElement;
      const channelTitle = titleElement?.textContent?.trim() || "";

      // Try to get channel description
      const descriptionElement = document.querySelector(
        "yt-formatted-string#description",
      ) as HTMLElement;
      const channelDescription = descriptionElement?.textContent?.trim() || "";

      return { channelTitle, channelDescription };
    });

    return channelData;
  } catch (error) {
    log.debug("⚠️ Could not extract channel metadata");
    return {};
  }
}
