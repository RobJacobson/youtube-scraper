import { Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "path";
import { format } from "date-fns";
import { VideoMetadata } from "../../types/VideoMetadata";
import { log } from "../../utils/logger";
import { ImageDownloadService } from "./imageDownloadService";
import { HtmlSaveService } from "./htmlSaveService";

export interface VideoOutputService {
  saveVideoData: (
    metadata: VideoMetadata,
    page: Page,
    baseOutputDir: string,
    skipScreenshots?: boolean
  ) => Promise<string>;
}

export const createVideoOutputService = (
  imageDownloadService: ImageDownloadService,
  htmlSaveService: HtmlSaveService
): VideoOutputService => {
  // Constants for screenshot handling
  const SCREENSHOT_SCROLL_DELAY = 5000;
  const extractVideoId = (url: string): string => {
    const match = url.match(/[?&]v=([^&#]*)/);
    return match ? match[1] : "unknown-id";
  };

  const formatDateForFolder = (dateString: string | null): string | null => {
    if (!dateString) {
      return null;
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }
      return format(date, "yy-MM-dd");
    } catch (error) {
      log.debug(`Invalid date format: ${dateString}, returning null`);
      return null;
    }
  };

  const createContentFolders = async (baseOutputDir: string): Promise<void> => {
    const folders = ["metadata", "image", "screenshot", "html"];

    for (const folder of folders) {
      const folderPath = path.join(baseOutputDir, folder);
      if (!existsSync(folderPath)) {
        await mkdir(folderPath, { recursive: true });
        log.debug(`📁 Created ${folder} folder: ${folderPath}`);
      }
    }
  };

  const generateFileName = (metadata: VideoMetadata): string => {
    // Extract video ID from the scraped URL
    const videoId = extractVideoId(metadata.scraped_url);

    // Use uploadDate, fall back to datePublished, then null
    const dateToUse = metadata.uploadDate || metadata.datePublished || null;
    const datePrefix = formatDateForFolder(dateToUse);

    return datePrefix ? `${datePrefix} ${videoId}` : videoId;
  };

  const takeScreenshot = async (
    page: Page,
    fileName: string,
    baseOutputDir: string
  ): Promise<string | undefined> => {
    log.debug("📸 Taking screenshot...");

    try {
      const screenshotPath = path.join(
        baseOutputDir,
        "screenshot",
        `${fileName}.png`
      );

      await page.waitForTimeout(SCREENSHOT_SCROLL_DELAY);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        type: "png",
      });

      log.debug(`📸 Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      log.error(
        `❌ Failed to take screenshot: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return undefined;
    }
  };

  const saveVideoData = async (
    metadata: VideoMetadata,
    page: Page,
    baseOutputDir: string,
    skipScreenshots?: boolean
  ): Promise<string> => {
    try {
      // Create content folders
      await createContentFolders(baseOutputDir);

      // Generate filename
      const fileName = generateFileName(metadata);

      // Define file paths
      const metadataPath = path.join(
        baseOutputDir,
        "metadata",
        `${fileName}.json`
      );
      const imagePathWithoutExtension = path.join(
        baseOutputDir,
        "image",
        fileName
      );
      const htmlPath = path.join(baseOutputDir, "html", `${fileName}.html`);

      // Save metadata as JSON
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
      log.debug(`💾 Saved metadata: ${metadataPath}`);

      // Download and save image
      if (metadata.image) {
        const savedImagePath = await imageDownloadService.downloadAndSaveImage(
          metadata.image,
          imagePathWithoutExtension
        );
        if (!savedImagePath) {
          log.error(`❌ Failed to download image for video: ${metadata.id}`);
        }
      } else {
        log.info("🖼️  No image URL available for this video");
      }

      // Save HTML content
      const htmlSuccess = await htmlSaveService.savePageHtml(page, htmlPath);
      if (!htmlSuccess) {
        log.error(`❌ Failed to save HTML for video: ${metadata.id}`);
      }

      // Take screenshot if enabled
      let screenshotPath: string | undefined;
      if (!skipScreenshots) {
        screenshotPath = await takeScreenshot(page, fileName, baseOutputDir);
        if (!screenshotPath) {
          log.error(`❌ Failed to take screenshot for video: ${metadata.id}`);
        }
      } else {
        log.debug("📸 Screenshots disabled - skipping");
      }

      log.info(`✅ Saved video data with filename: ${fileName}`);
      return baseOutputDir;
    } catch (error) {
      log.error(
        `❌ Error saving video data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  };

  return {
    saveVideoData,
  };
};
