import { Page } from "playwright";
import { format } from "date-fns";
import { Config } from "../../types/Config";
import { Logger } from "../../utils/Logger";

// Constants for content extraction
const VIDEO_ID_REGEX_GROUP = 1;
const EXPAND_BUTTON_TIMEOUT = 1000;
const EXPAND_BUTTON_DELAY = 500;
const SCREENSHOT_SCROLL_DELAY = 1000;

export function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&#]*)/);
  return match ? match[VIDEO_ID_REGEX_GROUP] : "";
}

export async function extractTags(page: Page): Promise<string[]> {
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

export async function extractLanguage(page: Page): Promise<string> {
  try {
    return await page.evaluate(() => {
      const langMeta = document.querySelector('meta[itemprop="inLanguage"]');
      return langMeta?.getAttribute("content") || "unknown";
    });
  } catch {
    return "unknown";
  }
}

export async function expandDescriptionAndComments(
  page: Page,
  logger: Logger
): Promise<void> {
  // Simplified - just try the most common expand buttons
  try {
    const expandSelectors = [
      "button#expand",
      'button:has-text("Show more")',
      'button:has-text("Read more")',
    ];

    for (const selector of expandSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: EXPAND_BUTTON_TIMEOUT })) {
          await button.click();
          await page.waitForTimeout(EXPAND_BUTTON_DELAY);
        }
      } catch {
        // Continue to next selector
      }
    }

    logger.debug("📝 Content expansion attempted");
  } catch {
    // Expansion failed, continue anyway
  }
}

export async function takeScreenshot(
  page: Page,
  videoId: string,
  config: Config,
  logger: Logger
): Promise<string> {
  logger.debug("📸 Taking screenshot...");

  // Simplified - just scroll to top and take screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(SCREENSHOT_SCROLL_DELAY);

  const filename = `${videoId}_${format(
    new Date(),
    "yyyy-MM-dd_HH-mm-ss"
  )}.png`;
  const screenshotPath = `${config.outputDir}/screenshots/${filename}`;

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    type: "png",
  });

  logger.debug(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}
