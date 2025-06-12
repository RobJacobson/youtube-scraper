import { Page } from "playwright";
import { VideoMetadata } from "../../types/VideoMetadata";
import { getLogger } from "../../utils/globalLogger";

/**
 * Trims and cleans up video descriptions
 * @param description - Raw description text
 * @returns Cleaned description
 */
function trimDescription(description: string): string {
  if (!description) return "";

  // Remove "…...more\n" and everything that follows
  const moreIndex = description.indexOf("…...more\n");
  let trimmed =
    moreIndex !== -1 ? description.substring(0, moreIndex) : description;

  // Convert "\n\n" to "\n"
  trimmed = trimmed.replace(/\n\n/g, "\n");

  return trimmed.trim();
}

// Constants for metadata extraction
const TITLE_SELECTOR = "h1.title";
const CHANNEL_SELECTOR = "ytd-channel-name a";
const VIEW_COUNT_SELECTOR = "span.view-count";
const LIKE_COUNT_SELECTOR = "ytd-menu-renderer button[aria-label*='like']";
const DESCRIPTION_SELECTOR = "ytd-expander#description";
const UPLOAD_DATE_SELECTOR = "div#info-strings yt-formatted-string";
const CATEGORY_SELECTOR = "div#info-strings yt-formatted-string:last-child";
const CHANNEL_URL_SELECTOR = "ytd-channel-name a";
const DURATION_SELECTOR = "span.ytp-time-duration";
const THUMBNAIL_SELECTOR = "link[itemprop='thumbnailUrl']";

/**
 * Extracts complete metadata from the YouTube video page
 * @param page - Playwright page instance
 * @param url - Video URL
 * @returns Promise with complete VideoMetadata object (excluding screenshot_path)
 */
export const extractPageMetadata = async (
  page: Page,
  url: string
): Promise<Omit<VideoMetadata, "screenshot_path">> => {
  const logger = getLogger();
  logger.debug("🔍 Extracting page metadata...");

  try {
    const [
      title,
      author,
      viewCount,
      likeCount,
      description,
      uploadDate,
      category,
      channelUrl,
      duration,
      thumbnailUrl,
    ] = await Promise.all([
      page.textContent(TITLE_SELECTOR),
      page.textContent(CHANNEL_SELECTOR),
      page.textContent(VIEW_COUNT_SELECTOR),
      page.textContent(LIKE_COUNT_SELECTOR),
      page.textContent(DESCRIPTION_SELECTOR),
      page.textContent(UPLOAD_DATE_SELECTOR),
      page.textContent(CATEGORY_SELECTOR),
      page.getAttribute(CHANNEL_URL_SELECTOR, "href"),
      page.textContent(DURATION_SELECTOR),
      page.getAttribute(THUMBNAIL_SELECTOR, "href"),
    ]);

    const id = extractVideoId(url);

    return {
      id,
      url,
      title: title?.trim() || "",
      author: author?.trim() || "",
      viewCount: viewCount?.trim() || "",
      likeCount: likeCount?.trim() || "",
      description: description?.trim() || "",
      uploadDate: uploadDate?.trim() || "",
      category: category?.trim() || "",
      channelUrl: channelUrl || "",
      duration: duration?.trim() || "",
      thumbnailUrl: thumbnailUrl || "",
      language: "en", // Default to English
      publishedDate: uploadDate?.trim() || "", // Use upload date as published date
      scraped_at: new Date().toISOString(),
      tags: [], // Will be populated by extractVideoMetadata
    };
  } catch (error) {
    logger.error("❌ Error extracting metadata:", error);
    throw error; // Propagate error to caller
  }
};

/**
 * Extracts video ID from the URL
 * @param url - Video URL
 * @returns Video ID
 */
export const extractVideoId = (url: string): string => {
  const match = url.match(/[?&]v=([^&#]*)/);
  return match ? match[1] : "";
};

/**
 * Extracts tags from the video page
 * @param page - Playwright page instance
 * @returns Array of tags
 */
export const extractTags = async (page: Page): Promise<string[]> => {
  try {
    return await page.evaluate(() => {
      const metaTags = Array.from(
        document.querySelectorAll('meta[property="og:video:tag"]')
      );
      return metaTags
        .map((tag) => tag.getAttribute("content"))
        .filter(Boolean) as string[];
    });
  } catch {
    return [];
  }
};

/**
 * Extracts complete metadata from the YouTube video page
 * @param page - Playwright page instance
 * @param url - Video URL
 * @returns Promise with complete VideoMetadata object (excluding screenshot_path)
 */
export const extractVideoMetadata = async (
  page: Page,
  url: string
): Promise<VideoMetadata> => {
  const logger = getLogger();
  logger.debug("🔍 Extracting video metadata...");

  const [pageMetadata, tags] = await Promise.all([
    extractPageMetadata(page, url),
    extractTags(page),
  ]);

  return {
    ...pageMetadata,
    tags,
  };
};

async function extractLanguage(page: Page): Promise<string> {
  try {
    return await page.evaluate(() => {
      const langMeta = document.querySelector('meta[itemprop="inLanguage"]');
      return langMeta?.getAttribute("content") || "unknown";
    });
  } catch {
    return "unknown";
  }
}
