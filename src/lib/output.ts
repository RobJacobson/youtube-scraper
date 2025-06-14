import { Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "path";
import { format } from "date-fns";
import { VideoMetadata } from "../types";
import { log } from "../utils/logger";

export async function saveVideoDataFromBuffers(
  metadata: VideoMetadata,
  screenshot: Buffer,
  image: Buffer | null,
  baseOutputDir: string,
  htmlContent?: string,
): Promise<void> {
  try {
    // Create content folders
    await createContentFolders(baseOutputDir);

    // Generate filename
    const fileName = generateFileName(metadata);

    // Save all content
    const savePromises = [
      saveMetadata(metadata, baseOutputDir, fileName),
      saveImageFromBuffer(image, baseOutputDir, fileName, metadata.image),
      saveScreenshotFromBuffer(screenshot, baseOutputDir, fileName),
    ];

    // Add HTML saving if content is provided
    if (htmlContent) {
      savePromises.push(
        saveHtmlFromContent(htmlContent, baseOutputDir, fileName),
      );
    }

    await Promise.all(savePromises);

    log.info(`✅ Saved video data: ${fileName}`);
  } catch (error) {
    log.error(
      `❌ Error saving video data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
    throw error;
  }
}

async function createContentFolders(baseOutputDir: string): Promise<void> {
  const folders = ["metadata", "image", "screenshot", "html", "complete-html"];

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
  fileName: string,
): Promise<void> {
  const metadataPath = path.join(baseOutputDir, "metadata", `${fileName}.json`);
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
  log.debug(`💾 Saved metadata: ${metadataPath}`);
}

async function saveImageFromBuffer(
  imageBuffer: Buffer | null,
  baseOutputDir: string,
  fileName: string,
  originalImageUrl: string,
): Promise<void> {
  if (!imageBuffer) {
    log.info("🖼️  No image buffer available");
    return;
  }

  try {
    // Determine file extension from original URL
    let extension = "";
    const urlExtension = originalImageUrl.match(
      /\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i,
    );
    if (urlExtension) {
      extension = urlExtension[1].toLowerCase();
    } else {
      extension = "jpg"; // default fallback
    }

    const imagePath = path.join(
      baseOutputDir,
      "image",
      `${fileName}.${extension}`,
    );
    await writeFile(imagePath, imageBuffer);

    log.debug(`🖼️  Image saved: ${imagePath}`);
  } catch (error) {
    log.error(
      `❌ Error saving image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

async function saveScreenshotFromBuffer(
  screenshotBuffer: Buffer,
  baseOutputDir: string,
  fileName: string,
): Promise<void> {
  if (!screenshotBuffer || screenshotBuffer.length === 0) {
    log.info("📸 No screenshot buffer available");
    return;
  }

  try {
    const screenshotPath = path.join(
      baseOutputDir,
      "screenshot",
      `${fileName}.png`,
    );
    await writeFile(screenshotPath, screenshotBuffer);

    log.debug(`📸 Screenshot saved: ${screenshotPath}`);
  } catch (error) {
    log.error(
      `❌ Failed to save screenshot: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

async function saveHtmlFromContent(
  htmlContent: string,
  baseOutputDir: string,
  fileName: string,
): Promise<void> {
  try {
    const htmlPath = path.join(baseOutputDir, "html", `${fileName}.html`);
    await writeFile(htmlPath, htmlContent, "utf8");
    log.debug(`📄 Complete HTML saved: ${htmlPath}`);
  } catch (error) {
    log.error(
      `❌ Error saving HTML content: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

export async function saveCompleteWebpage(
  page: Page,
  baseOutputDir: string,
  fileName: string,
): Promise<void> {
  try {
    log.debug("📄 Saving complete webpage...");

    // Create a webpage folder for this specific page
    const webpagePath = path.join(baseOutputDir, "complete-html", fileName);
    await mkdir(webpagePath, { recursive: true });

    // Save the main HTML
    const htmlContent = await page.content();
    const mainHtmlPath = path.join(webpagePath, "index.html");
    await writeFile(mainHtmlPath, htmlContent, "utf8");

    // Extract and save all CSS
    const cssContent = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let combinedCSS = "";

      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          for (const rule of rules) {
            combinedCSS += rule.cssText + "\n";
          }
        } catch (e) {
          // Skip cross-origin stylesheets
          console.warn("Could not access stylesheet:", e);
        }
      }
      return combinedCSS;
    });

    if (cssContent) {
      const cssPath = path.join(webpagePath, "styles.css");
      await writeFile(cssPath, cssContent, "utf8");
    }

    // Extract and save all images
    const imageUrls = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll("img[src]"));
      return images
        .map((img) => (img as HTMLImageElement).src)
        .filter((src) => src);
    });

    // Download and save images
    const imageFolder = path.join(webpagePath, "images");
    if (imageUrls.length > 0) {
      await mkdir(imageFolder, { recursive: true });

      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const imageUrl = imageUrls[i];
          const response = await fetch(imageUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const extension =
              imageUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)(?:\?|$)/i)?.[1] ||
              "jpg";
            const imagePath = path.join(imageFolder, `image_${i}.${extension}`);
            await writeFile(imagePath, new Uint8Array(buffer));
          }
        } catch (error) {
          log.debug(`⚠️ Could not download image ${i}: ${error}`);
        }
      }
    }

    // Create a self-contained HTML file
    const completeHtmlContent = await page.evaluate(() => {
      // Inline all CSS
      const styleSheets = Array.from(document.styleSheets);
      let inlinedCSS = "";

      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          for (const rule of rules) {
            inlinedCSS += rule.cssText + "\n";
          }
        } catch (e) {
          console.warn("Could not access stylesheet:", e);
        }
      }

      // Get the HTML and inline the CSS
      let html = document.documentElement.outerHTML;

      // Remove existing style and link tags
      html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, "");
      html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

      // Add the inlined CSS
      const styleTag = `<style type="text/css">\n${inlinedCSS}\n</style>`;
      html = html.replace("</head>", `${styleTag}\n</head>`);

      return html;
    });

    const selfContainedPath = path.join(webpagePath, "complete.html");
    await writeFile(selfContainedPath, completeHtmlContent, "utf8");

    log.debug(`📄 Complete webpage saved: ${webpagePath}`);
  } catch (error) {
    log.error(
      `❌ Error saving complete webpage: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
