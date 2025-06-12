import { Page } from "playwright";
import { getLogger } from "../../utils/globalLogger";

// Timeout constants
const CONSENT_DIALOG_TIMEOUT = 5000;
const CONSENT_DIALOG_DELAY = 1000;
const POPUP_VISIBILITY_TIMEOUT = 500;
const VIDEO_SELECTOR_TIMEOUT = 5000;
const THEATER_MODE_DELAY = 200;
const SCROLL_ITERATIONS = 5;
const SCROLL_DELAY = 1500;
const EXPAND_BUTTON_DELAY = 1000;
const MAX_EXPAND_ATTEMPTS = 3;

// Generic helper for parallel button detection and clicking
async function findAndClickButton(
  page: Page,
  selectors: string[],
  options: {
    checkEnabled?: boolean;
    timeout?: number;
    successMessage?: string;
  }
): Promise<boolean> {
  const {
    checkEnabled = false,
    timeout = 200,
    successMessage = "Button clicked",
  } = options;
  const logger = getLogger();

  try {
    logger.debug(
      `Checking ${selectors.length} selectors with timeout ${timeout}ms`
    );

    // Check all selectors in parallel and cache locator objects
    const results = await Promise.allSettled(
      selectors.map((selector) => {
        const locator = page.locator(selector).first();

        if (checkEnabled) {
          return Promise.all([
            locator.isVisible({ timeout }),
            locator.isEnabled(),
          ]).then(([visible, enabled]) => ({
            locator,
            visible,
            enabled,
            selector,
          }));
        } else {
          return locator
            .isVisible({ timeout })
            .then((visible) => ({ locator, visible, enabled: true, selector }));
        }
      })
    );

    // Debug results
    let foundCount = 0;
    let visibleCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        foundCount++;
        if (result.value.visible) {
          visibleCount++;
          logger.debug(`Found visible button: ${result.value.selector}`);
        }
      } else {
        logger.debug(`Selector failed: ${selectors[i]} - ${result.reason}`);
      }
    }

    logger.debug(
      `Found ${foundCount}/${selectors.length} selectors, ${visibleCount} visible`
    );

    // Find first visible (and enabled) button and click it
    for (const result of results) {
      if (
        result.status === "fulfilled" &&
        result.value.visible &&
        result.value.enabled
      ) {
        try {
          await result.value.locator.click();
          logger.info(successMessage);
          return true;
        } catch (error) {
          logger.debug(`Click failed on ${result.value.selector}: ${error}`);
          // Continue if click fails
        }
      }
    }
  } catch (error) {
    logger.error(`Error in findAndClickButton: ${error}`);
  }

  return false;
}

export async function handleConsentDialog(page: Page): Promise<void> {
  try {
    const consentButton = page
      .locator('button:has-text("Accept all"), button:has-text("Reject all")')
      .first();
    if (await consentButton.isVisible({ timeout: CONSENT_DIALOG_TIMEOUT })) {
      await consentButton.click();
      await page.waitForTimeout(CONSENT_DIALOG_DELAY);
    }
  } catch {
    // Ignore if consent dialog not found
  }
}

export async function dismissPopups(page: Page): Promise<void> {
  const logger = getLogger();
  logger.info("🚫 Starting popup dismissal...");

  const popupSelectors = [
    'button[aria-label*="Close"]',
    'button:has-text("×")',
    'button:has-text("No thanks")',
    'button:has-text("Skip")',
    'button:has-text("Not now")',
    'button:has-text("Dismiss")',
  ];

  const dismissed = await findAndClickButton(page, popupSelectors, {
    checkEnabled: false,
    timeout: 200,
    successMessage: "✅ Popup dismissed",
  });

  if (!dismissed) {
    logger.info("ℹ No popups found to dismiss");
  }
}

export async function pauseVideo(page: Page): Promise<void> {
  const logger = getLogger();
  try {
    await page.waitForSelector("video", { timeout: VIDEO_SELECTOR_TIMEOUT });

    // Simple JavaScript pause - most reliable method
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
}

export async function enableTheaterMode(page: Page): Promise<void> {
  const logger = getLogger();
  try {
    await page.keyboard.press("t");
    await page.waitForTimeout(THEATER_MODE_DELAY);
    logger.debug("🎭 Theater mode enabled");
  } catch {
    // Theater mode might not be available
  }
}

export async function enableDarkMode(page: Page): Promise<void> {
  const logger = getLogger();
  try {
    await page.emulateMedia({ colorScheme: "dark" });
    logger.debug("🌙 Dark mode enabled");
  } catch {
    // Dark mode might not be supported
  }
}

export async function hideSuggestedContent(page: Page): Promise<void> {
  const logger = getLogger();
  try {
    await page.addStyleTag({
      content: `
        #secondary,
        ytd-watch-next-secondary-results-renderer,
        .ytp-ce-element,
        .ytp-cards-teaser {
          display: none !important;
        }
      `,
    });
    logger.debug("🚫 Suggested content hidden");
  } catch {
    // CSS injection might fail
  }
}

export async function scrollToLoadVideos(page: Page): Promise<void> {
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
}

export async function expandDescription(page: Page): Promise<void> {
  const logger = getLogger();
  logger.debug("📝 Attempting to expand description...");

  const selectors = [
    "tp-yt-paper-button#expand",
    "#expand.ytd-text-inline-expander",
    'button[aria-label*="Show more"]',
    'button:has-text("Show more")',
    'button:has-text("...more")',
    'button:has-text("Read more")',
  ];

  await findAndClickButton(page, selectors, {
    checkEnabled: true,
    timeout: 200,
    successMessage: "✅ Clicking expand button",
  });
}
