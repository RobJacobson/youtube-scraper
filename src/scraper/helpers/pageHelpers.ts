import { Page } from "playwright";
import { Logger } from "../../utils/Logger";

// Timeout constants
const CONSENT_DIALOG_TIMEOUT = 5000;
const CONSENT_DIALOG_DELAY = 1000;
const POPUP_VISIBILITY_TIMEOUT = 500;
const VIDEO_SELECTOR_TIMEOUT = 5000;
const THEATER_MODE_DELAY = 200;
const SCROLL_ITERATIONS = 5;
const SCROLL_DELAY = 1500;

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

export async function dismissPopups(page: Page, logger: Logger): Promise<void> {
  try {
    // Simplified popup selectors - focus on most common ones
    const popupSelectors = [
      'button[aria-label*="Close"]',
      'button:has-text("×")',
      'button:has-text("No thanks")',
      'button:has-text("Skip")',
      'button:has-text("Not now")',
      'button:has-text("Dismiss")',
    ];

    // Single attempt with quick timeout
    for (const selector of popupSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: POPUP_VISIBILITY_TIMEOUT })) {
          await button.click();
          logger.debug("✅ Popup dismissed");
          break; // Exit after first successful dismissal
        }
      } catch {
        // Continue to next selector
      }
    }
  } catch {
    // Fail silently
  }
}

export async function pauseVideo(page: Page, logger: Logger): Promise<void> {
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

export async function enableTheaterMode(
  page: Page,
  logger: Logger
): Promise<void> {
  try {
    await page.keyboard.press("t");
    await page.waitForTimeout(THEATER_MODE_DELAY);
    logger.debug("🎭 Theater mode enabled");
  } catch {
    // Theater mode might not be available
  }
}

export async function enableDarkMode(
  page: Page,
  logger: Logger
): Promise<void> {
  try {
    await page.emulateMedia({ colorScheme: "dark" });
    logger.debug("🌙 Dark mode enabled");
  } catch {
    // Dark mode might not be supported
  }
}

export async function hideSuggestedContent(
  page: Page,
  logger: Logger
): Promise<void> {
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

export async function scrollToLoadVideos(
  page: Page,
  logger: Logger
): Promise<void> {
  logger.info("📜 Loading more videos...");

  // Simplified scrolling - just scroll to bottom and wait
  for (let i = 0; i < SCROLL_ITERATIONS; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(SCROLL_DELAY);
  }
}
