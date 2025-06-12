import { Page } from "playwright";
import { VideoMetadata } from "../../types/VideoMetadata";

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

/**
 * Extracts complete metadata from the YouTube video page
 * @param page - Playwright page instance
 * @param url - Video URL
 * @returns Promise with complete VideoMetadata object (excluding screenshot_path)
 */
export async function extractPageMetadata(
  page: Page,
  url: string
): Promise<Omit<VideoMetadata, "screenshot_path">> {
  // Extract video ID from URL
  const videoId = extractVideoId(url);

  // Extract basic DOM metadata
  const basicMetadata = await page.evaluate((videoUrl) => {
    const getTextContent = (selector: string): string => {
      const element = document.querySelector(selector);
      return element?.textContent?.trim() || "";
    };

    const getAttribute = (selector: string, attr: string): string => {
      const element = document.querySelector(selector);
      return element?.getAttribute(attr) || "";
    };

    return {
      url: videoUrl,
      title:
        getTextContent('h1[data-e2e="video-title"]') ||
        getTextContent("h1.ytd-video-primary-info-renderer") ||
        getTextContent("h1.title") ||
        getTextContent("h1"),
      description:
        getTextContent("#description-text") ||
        getTextContent("#description") ||
        getTextContent("#description-inline-expander") ||
        getTextContent(".description") ||
        getTextContent('[data-e2e="video-description"]') ||
        getTextContent("#watch-description-text"),
      author:
        getTextContent("#owner-name a") ||
        getTextContent(".channel-name") ||
        getTextContent('[data-e2e="video-author"]'),
      channelUrl:
        getAttribute("#owner-name a", "href") ||
        getAttribute(".channel-name a", "href"),
      viewCount:
        getTextContent("#info-text") ||
        getTextContent(".view-count") ||
        getTextContent('[data-e2e="video-view-count"]'),
      likeCount:
        getTextContent('button[aria-label*="like"] span[role="text"]') ||
        getTextContent(".like-count"),
      publishedDate:
        getTextContent("#info-text") ||
        getTextContent(".date") ||
        getTextContent('[data-e2e="video-publish-date"]'),
      duration:
        getTextContent(".ytp-time-duration") ||
        getAttribute('meta[itemprop="duration"]', "content"),
      thumbnailUrl:
        getAttribute('link[itemprop="thumbnailUrl"]', "href") ||
        getAttribute('meta[property="og:image"]', "content"),
      category:
        getAttribute('meta[itemprop="genre"]', "content") ||
        getAttribute('meta[property="og:video:genre"]', "content"),
      uploadDate:
        getAttribute('meta[itemprop="uploadDate"]', "content") ||
        getAttribute('meta[property="og:video:release_date"]', "content"),
    };
  }, url);

  // Extract additional metadata
  const [tags, language] = await Promise.all([
    extractTags(page),
    extractLanguage(page),
  ]);

  // Return complete metadata object with cleaned description
  return {
    id: videoId,
    ...basicMetadata,
    description: trimDescription(basicMetadata.description),
    tags,
    language,
    scraped_at: new Date().toISOString(),
  };
}

// Helper functions for metadata extraction
function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&#]*)/);
  return match ? match[1] : "";
}

async function extractTags(page: Page): Promise<string[]> {
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
}

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
