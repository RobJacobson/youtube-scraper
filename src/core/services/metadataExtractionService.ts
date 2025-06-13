import { Page } from "playwright";
import { VideoMetadata } from "../../types/VideoMetadata";
import { log } from "../../utils/logger";

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

export interface MetadataExtractionService {
  extractVideoMetadata: (page: Page, url: string) => Promise<VideoMetadata>;
}

export const createMetadataExtractionService =
  (): MetadataExtractionService => {
    

    const extractPageMetadata = async (
      page: Page,
      url: string
    ): Promise<Omit<VideoMetadata, "tags">> => {
      log.debug("🔍 Extracting page metadata...");

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
          description: trimDescription(description?.trim() || ""),
          uploadDate: uploadDate?.trim() || "",
          category: category?.trim() || "",
          channelUrl: channelUrl || "",
          duration: duration?.trim() || "",
          thumbnailUrl: thumbnailUrl || "",
          language: "en", // Default to English
          publishedDate: uploadDate?.trim() || "", // Use upload date as published date
          scraped_at: new Date().toISOString(),
        };
      } catch (error) {
        log.error(
          `❌ Error extracting metadata: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        throw error; // Propagate error to caller
      }
    };

    const extractTags = async (page: Page): Promise<string[]> => {
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

    const extractVideoId = (url: string): string => {
      const match = url.match(/[?&]v=([^&#]*)/);
      return match ? match[1] : "";
    };

    const trimDescription = (description: string): string => {
      if (!description) return "";

      // Remove "…...more\n" and everything that follows
      const moreIndex = description.indexOf("…...more\n");
      let trimmed =
        moreIndex !== -1 ? description.substring(0, moreIndex) : description;

      // Convert "\n\n" to "\n"
      trimmed = trimmed.replace(/\n\n/g, "\n");

      return trimmed.trim();
    };

    const extractVideoMetadata = async (
      page: Page,
      url: string
    ): Promise<VideoMetadata> => {
      log.debug("🔍 Extracting video metadata...");

      const [pageMetadata, tags] = await Promise.all([
        extractPageMetadata(page, url),
        extractTags(page),
      ]);

      return {
        ...pageMetadata,
        tags,
      };
    };

    return {
      extractVideoMetadata,
    };
  };
