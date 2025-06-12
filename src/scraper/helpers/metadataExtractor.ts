import { Page } from "playwright";
import { VideoMetadata } from "../../types/VideoMetadata";

/**
 * Extracts core metadata from the YouTube video page DOM
 * @param page - Playwright page instance
 * @param url - Video URL
 * @returns Promise with extracted metadata (excluding id, tags, language, scraped_at, screenshot_path)
 */
export async function extractPageMetadata(
  page: Page,
  url: string
): Promise<
  Omit<
    VideoMetadata,
    "id" | "tags" | "language" | "scraped_at" | "screenshot_path"
  >
> {
  return await page.evaluate((videoUrl) => {
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
}
