import { Page } from "playwright";
import { format } from "date-fns";
import { log } from "../../utils/logger";

// Constants for screenshot handling
const SCREENSHOT_SCROLL_DELAY = 5000;

export interface ScreenshotConfig {
  outputDir: string;
  skipScreenshots: boolean;
}

export interface ScreenshotService {
  takeScreenshot: (
    page: Page,
    videoId: string,
    config: ScreenshotConfig
  ) => Promise<string | undefined>;
}

export const createScreenshotService = (): ScreenshotService => {
  

  const extractVideoId = (url: string): string => {
    const match = url.match(/[?&]v=([^&#]*)/);
    return match ? match[1] : "";
  };

  const takeScreenshot = async (
    page: Page,
    videoId: string,
    config: ScreenshotConfig
  ): Promise<string | undefined> => {
    if (config.skipScreenshots) {
      log.debug("📸 Screenshots disabled - skipping");
      return undefined;
    }

    log.debug("📸 Taking screenshot...");

    try {
      const filename = `${format(new Date(), "yyyy-MM-dd")} ${videoId}.png`;
      const screenshotPath = `${config.outputDir}/screenshots/${filename}`;

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

  return {
    takeScreenshot,
  };
};
