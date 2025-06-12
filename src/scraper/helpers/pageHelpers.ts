import { Page } from "playwright";
import { getLogger } from "../../utils/globalLogger";

// Timeout constants
const CONSENT_DIALOG_TIMEOUT = 5000;
const VIDEO_SELECTOR_TIMEOUT = 5000;
const SCROLL_ITERATIONS = 5;
const SCROLL_DELAY = 1000;

// Generic helper for parallel button detection and clicking
const findAndClickButton = async (
  page: Page,
  selectors: string[],
  options: {
    checkEnabled?: boolean;
    timeout?: number;
    successMessage?: string;
  }
): Promise<boolean> => {
  const {
    checkEnabled = false,
    timeout = 200,
    successMessage = "Button clicked",
  } = options;
  const logger = getLogger();

  // Process all selectors in parallel - each handles check and click
  const results = await Promise.allSettled(
    selectors.map(async (selector) => {
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
    })
  );

  const clicked = results.some(
    (result) => result.status === "fulfilled" && result.value === true
  );

  if (clicked) {
    logger.info(successMessage);
    await page.waitForTimeout(500);
  }

  return clicked;
};

export const handleConsentDialog = async (page: Page): Promise<void> => {
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

export const dismissPopups = async (page: Page): Promise<void> => {
  const popupSelectors = [
    'button[aria-label*="Close"]',
    'button[aria-label*="Dismiss"]',
    'button[aria-label*="Skip"]',
    'button[aria-label*="Not now"]',
  ];

  await findAndClickButton(page, popupSelectors, {
    successMessage: "✅ Popups dismissed",
  });
};

export const expandDescription = async (page: Page): Promise<void> => {
  const expandSelectors = [
    'button[aria-label*="Show more"]',
    'button[aria-label*="Expand"]',
    'button[aria-label*="More"]',
  ];

  await findAndClickButton(page, expandSelectors, {
    successMessage: "📝 Description expanded",
  });
};

export const pauseVideo = async (page: Page): Promise<void> => {
  try {
    await page.waitForSelector("video", { timeout: VIDEO_SELECTOR_TIMEOUT });
    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video && !video.paused) {
        video.pause();
      }
    });
    getLogger().debug("⏸️ Video paused");
  } catch {
    // Video might not be present or pausable
  }
};

export const enableDarkMode = async (page: Page): Promise<void> => {
  try {
    await page.emulateMedia({ colorScheme: "dark" });
    getLogger().debug("🌙 Dark mode enabled");
  } catch {
    // Dark mode might not be supported
  }
};

export const hideSuggestedContent = async (page: Page): Promise<void> => {
  const hideSelectors = [
    'button[aria-label*="Hide"]',
    'button[aria-label*="Not interested"]',
    'button[aria-label*="Don\'t recommend"]',
  ];

  await findAndClickButton(page, hideSelectors, {
    successMessage: "🙈 Suggested content hidden",
  });
};

export const scrollToLoadVideos = async (page: Page): Promise<void> => {
  const logger = getLogger();
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
