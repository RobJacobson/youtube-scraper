import { Page } from "playwright";
import { format } from "date-fns";
import { Config } from "../../types/Config";
import { getLogger } from "../../utils/globalLogger";

// Constants for content extraction
const VIDEO_ID_REGEX_GROUP = 1;
const SCREENSHOT_SCROLL_DELAY = 5000;

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

export async function takeScreenshot(
  page: Page,
  videoId: string,
  config: Config
): Promise<string> {
  const logger = getLogger();
  logger.debug("📸 Taking screenshot...");

  const filename = `${format(new Date(), "yyyy-MM-dd")} ${videoId}.png`;
  const screenshotPath = `${config.outputDir}/screenshots/${filename}`;

  await page.waitForTimeout(SCREENSHOT_SCROLL_DELAY);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    type: "png",
  });

  logger.debug(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}
