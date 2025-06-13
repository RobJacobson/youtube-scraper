import { Page } from "playwright";
import { VideoMetadata } from "../../types/VideoMetadata";
import { log } from "../../utils/logger";

export interface MetadataExtractionService {
  extractVideoMetadata: (page: Page, url: string) => Promise<VideoMetadata>;
}

export const createMetadataExtractionService =
  (): MetadataExtractionService => {
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

    const extractAllMetaTags = async (page: Page) => {
      return await page.evaluate(() => {
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
        console.log(results);
        return results;
      });
    };

    const extractExpandedDescription = async (page: Page): Promise<string> => {
      return await page.evaluate(() => {
        const descriptionElement = document.querySelector(
          "#description-inline-expander > yt-attributed-string"
        ) as HTMLElement;
        return descriptionElement?.innerText || "";
      });
    };

    const extractPageMetadata = async (
      page: Page,
      url: string
    ): Promise<Omit<VideoMetadata, "tags">> => {
      try {
        // Extract all meta tags in a single comprehensive call
        const combinedMetaTags = await extractAllMetaTags(page);

        log.debug(
          `📝 Extracted ${
            Object.keys(combinedMetaTags).length
          } meta tags for video ${url}`
        );

        console.log(JSON.stringify(combinedMetaTags, null, 2));

        const expandedDescription = await extractExpandedDescription(page);

        return {
          id: combinedMetaTags["identifier"],
          url: combinedMetaTags["og:url"],
          title: combinedMetaTags["og:title"],
          description: combinedMetaTags["og:description"],
          keywords: combinedMetaTags["keywords"],
          image: combinedMetaTags["og:image"],
          name: combinedMetaTags["name"],
          duration: combinedMetaTags["duration"],
          width: combinedMetaTags["width"],
          height: combinedMetaTags["height"],
          userInteractionCount: combinedMetaTags["userInteractionCount"],
          datePublished: combinedMetaTags["datePublished"],
          uploadDate: combinedMetaTags["uploadDate"],
          genre: combinedMetaTags["genre"],
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
    };

    const extractVideoMetadata = async (
      page: Page,
      url: string
    ): Promise<VideoMetadata> => await extractPageMetadata(page, url);

    return {
      extractVideoMetadata,
    };
  };
