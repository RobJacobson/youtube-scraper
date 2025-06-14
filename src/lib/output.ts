import { Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "path";
import { format } from "date-fns";
import { VideoMetadata } from "../types";
import { log } from "../utils/logger";

// Constants
const SCREENSHOT_SCROLL_DELAY = 5000;

export async function saveVideoData(
  metadata: VideoMetadata,
  page: Page,
  baseOutputDir: string,
  skipScreenshots: boolean = false
): Promise<void> {
  try {
    // Create content folders
    await createContentFolders(baseOutputDir);

    // Generate filename
    const fileName = generateFileName(metadata);

    // Save all content
    await Promise.all([
      saveMetadata(metadata, baseOutputDir, fileName),
      saveImage(metadata.image, baseOutputDir, fileName),
      saveHtml(page, baseOutputDir, fileName),
      skipScreenshots
        ? Promise.resolve()
        : saveScreenshot(page, baseOutputDir, fileName),
    ]);

    log.info(`✅ Saved video data: ${fileName}`);
  } catch (error) {
    log.error(
      `❌ Error saving video data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
}

async function createContentFolders(baseOutputDir: string): Promise<void> {
  const folders = ["metadata", "image", "screenshot", "html"];

  for (const folder of folders) {
    const folderPath = path.join(baseOutputDir, folder);
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
      log.debug(`📁 Created ${folder} folder`);
    }
  }
}

function generateFileName(metadata: VideoMetadata): string {
  // Extract video ID from the scraped URL
  const videoId = extractVideoId(metadata.scraped_url);

  // Use uploadDate, fall back to datePublished, then null
  const dateToUse = metadata.uploadDate || metadata.datePublished || null;
  const datePrefix = formatDateForFolder(dateToUse);

  return datePrefix ? `${datePrefix} ${videoId}` : videoId;
}

function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&#]*)/);
  return match ? match[1] : "unknown-id";
}

function formatDateForFolder(dateString: string | null): string | null {
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
}

async function saveMetadata(
  metadata: VideoMetadata,
  baseOutputDir: string,
  fileName: string
): Promise<void> {
  const metadataPath = path.join(baseOutputDir, "metadata", `${fileName}.json`);
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
  log.debug(`💾 Saved metadata: ${metadataPath}`);
}

async function saveImage(
  imageUrl: string,
  baseOutputDir: string,
  fileName: string
): Promise<void> {
  if (!imageUrl) {
    log.info("🖼️  No image URL available");
    return;
  }

  try {
    log.debug(`🖼️  Downloading image from: ${imageUrl}`);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      log.error(
        `❌ Failed to download image: ${response.status} ${response.statusText}`
      );
      return;
    }

    // Determine file extension from URL or Content-Type
    let extension = "";
    const urlExtension = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
    if (urlExtension) {
      extension = urlExtension[1].toLowerCase();
    } else {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("jpeg")) extension = "jpg";
      else if (contentType?.includes("png")) extension = "png";
      else if (contentType?.includes("webp")) extension = "webp";
      else if (contentType?.includes("gif")) extension = "gif";
      else extension = "jpg"; // default fallback
    }

    const imagePath = path.join(
      baseOutputDir,
      "image",
      `${fileName}.${extension}`
    );
    const buffer = await response.arrayBuffer();
    await writeFile(imagePath, new Uint8Array(buffer));

    log.debug(`🖼️  Image saved: ${imagePath}`);
  } catch (error) {
    log.error(
      `❌ Error downloading image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function saveHtml(
  page: Page,
  baseOutputDir: string,
  fileName: string
): Promise<void> {
  try {
    const htmlPath = path.join(baseOutputDir, "html", `${fileName}.html`);
    const htmlContent = await page.content();
    await writeFile(htmlPath, htmlContent, "utf8");
    log.debug(`📄 HTML saved: ${htmlPath}`);
  } catch (error) {
    log.error(
      `❌ Error saving HTML: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function saveScreenshot(
  page: Page,
  baseOutputDir: string,
  fileName: string
): Promise<void> {
  try {
    log.debug("📸 Taking screenshot...");

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
  } catch (error) {
    log.error(
      `❌ Failed to take screenshot: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
