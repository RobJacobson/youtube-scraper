import { Page } from "playwright";
import { getLogger } from "../../utils/globalLogger";

// Timeout constants
const CONSENT_DIALOG_TIMEOUT = 5000;
const VIDEO_SELECTOR_TIMEOUT = 5000;
const SCROLL_ITERATIONS = 5;
const SCROLL_DELAY = 1000;

export interface PageInteractionConfig {
  useDarkMode?: boolean;
  useTheaterMode?: boolean;
  hideSuggestedVideos?: boolean;
}

export interface PageInteractionService {
  handleConsentDialog: (page: Page) => Promise<void>;
  dismissPopups: (page: Page) => Promise<void>;
  expandDescription: (page: Page) => Promise<void>;
  pauseVideo: (page: Page) => Promise<void>;
  enableDarkMode: (page: Page) => Promise<void>;
  hideSuggestedContent: (page: Page) => Promise<void>;
  scrollToLoadVideos: (page: Page) => Promise<void>;
  setupVideoPage: (page: Page, config: PageInteractionConfig) => Promise<void>;
}

export const createPageInteractionService = (): PageInteractionService => {
  const logger = getLogger();

  // Generic helper for parallel button detection and clicking
  const findAndClickButton = async (
    page: Page,
    selectors: string[],
    options: {
      checkEnabled?: boolean;
      timeout?: number;
      successMessage?: string;
      errorMessage?: string;
    }
  ): Promise<boolean> => {
    const {
      checkEnabled = false,
      timeout = 200,
      successMessage = "Button clicked",
      errorMessage,
    } = options;

    try {
      await page.waitForTimeout(500);

      // Process all selectors in parallel - each handles check and click
      const results = await Promise.allSettled(
        selectors.map(async (selector) => {
          try {
            const locator = page.locator(selector).first();
            const visible = await locator.isVisible({ timeout });

            if (visible) {
              const enabled = checkEnabled ? await locator.isEnabled() : true;

              if (enabled) {
                await locator.click();
                return true;
              }
            }
            return false;
          } catch (error) {
            logger.debug(
              `Failed to process selector "${selector}": ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            return false;
          }
        })
      );

      const clicked = results.some(
        (result) => result.status === "fulfilled" && result.value === true
      );

      if (clicked) {
        logger.info(successMessage);
        await page.waitForTimeout(500);
      } else if (errorMessage) {
        logger.error(errorMessage);
      }

      return clicked;
    } catch (error) {
      logger.error(
        `Error in findAndClickButton: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      if (errorMessage) {
        logger.error(errorMessage);
      }
      return false;
    }
  };

  const handleConsentDialog = async (page: Page): Promise<void> => {
    const consentSelectors = [
      'button[aria-label*="consent"]',
      'button[aria-label*="Accept"]',
      'button[aria-label*="agree"]',
      'button[aria-label*="I agree"]',
      'button[aria-label*="I accept"]',
    ];

    await findAndClickButton(page, consentSelectors, {
      timeout: CONSENT_DIALOG_TIMEOUT,
      successMessage: "✅ Consent dialog handled",
    });
  };

  const dismissPopups = async (page: Page): Promise<void> => {
    const popupSelectors = [
      // 'button[aria-label*="Close"]',
      // 'button[aria-label*="Dismiss"]',
      // 'button[aria-label*="Skip"]',
      // 'button[aria-label*="Not now"]',
    ];

    await findAndClickButton(page, popupSelectors, {
      successMessage: "✅ Popups dismissed",
    });
  };

  const expandDescription = async (page: Page): Promise<void> => {
    const expandSelectors = ["#expand"];

    await findAndClickButton(page, expandSelectors, {
      successMessage: "📝 Description expanded",
      errorMessage: "❌ Description not expanded",
    });
  };

  const pauseVideo = async (page: Page): Promise<void> => {
    try {
      await page.waitForSelector("video", { timeout: VIDEO_SELECTOR_TIMEOUT });
      await page.evaluate(() => {
        const video = document.querySelector("video");
        if (video && !video.paused) {
          video.pause();
        }
      });
      logger.debug("⏸️ Video paused");
    } catch {
      // Video might not be present or pausable
    }
  };

  const enableDarkMode = async (page: Page): Promise<void> => {
    try {
      await page.emulateMedia({ colorScheme: "dark" });
      logger.debug("🌙 Dark mode enabled");
    } catch {
      // Dark mode might not be supported
    }
  };

  const hideSuggestedContent = async (page: Page): Promise<void> => {
    const hideSelectors = [
      'button[aria-label*="Hide"]',
      'button[aria-label*="Not interested"]',
      'button[aria-label*="Don\'t recommend"]',
    ];

    await findAndClickButton(page, hideSelectors, {
      successMessage: "🙈 Suggested content hidden",
    });
  };

  const scrollToLoadVideos = async (page: Page): Promise<void> => {
    logger.info("📜 Loading more videos...");

    // Simplified scrolling - just scroll to bottom and wait
    for (let i = 0; i < SCROLL_ITERATIONS; i++) {
      await page.evaluate(() => {
        // Safe scrolling with null checks
        const scrollHeight =
          document.body?.scrollHeight ||
          document.documentElement?.scrollHeight ||
          window.innerHeight * 10; // Fallback to large value
        window.scrollTo(0, scrollHeight);
      });
      await page.waitForTimeout(SCROLL_DELAY);
    }
  };

  const setupVideoPage = async (
    page: Page,
    config: PageInteractionConfig
  ): Promise<void> => {
    const tasks: Promise<void>[] = [];

    // Handle consent and popups
    tasks.push(handleConsentDialog(page));
    tasks.push(dismissPopups(page));

    // Video-specific setup
    tasks.push(pauseVideo(page));
    tasks.push(expandDescription(page));

    // Optional features
    if (config.useDarkMode) {
      tasks.push(enableDarkMode(page));
    }

    if (config.hideSuggestedVideos) {
      tasks.push(hideSuggestedContent(page));
    }

    // Execute all tasks in parallel
    await Promise.allSettled(tasks);
  };

  return {
    handleConsentDialog,
    dismissPopups,
    expandDescription,
    pauseVideo,
    enableDarkMode,
    hideSuggestedContent,
    scrollToLoadVideos,
    setupVideoPage,
  };
};
