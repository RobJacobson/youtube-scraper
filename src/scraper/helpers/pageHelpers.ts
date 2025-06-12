import { Page } from "playwright";
import { getLogger } from "../../utils/globalLogger";

// Timeout constants
const CONSENT_DIALOG_TIMEOUT = 5000;
const VIDEO_SELECTOR_TIMEOUT = 5000;
const SCROLL_ITERATIONS = 5;
const SCROLL_DELAY = 1000;

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
  const { checkEnabled = false, successMessage = "Button clicked" } = options;
  const logger = getLogger();

  // Process all selectors in parallel - each handles check and click
  const results = await Promise.allSettled(
    selectors.map(async (selector) => {
      const locator = page.locator(selector).first();
      const visible = await locator.isVisible({ timeout: 500 });

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
}

export async function handleConsentDialog(page: Page): Promise<void> {
  const consentSelectors = [
    'button:has-text("Accept all")',
    'button:has-text("Reject all")',
  ];

  await findAndClickButton(page, consentSelectors, {
    successMessage: "✅ Consent dialog handled",
  });
}

export async function dismissPopups(page: Page): Promise<void> {
  const popupSelectors = ["button[aria-label='Dismiss']"];

  await findAndClickButton(page, popupSelectors, {
    successMessage: "✅ Popup dismissed",
  });
}

export async function pauseVideo(page: Page): Promise<void> {
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
}
export async function expandDescription(page: Page): Promise<void> {
  const selectors = ["tp-yt-paper-button#expand"];

  await findAndClickButton(page, selectors, {
    checkEnabled: true,
    successMessage: "✅ Description expanded",
  });
}

export async function enableTheaterMode(page: Page): Promise<void> {
  const theaterSelectors = [".ytp-size-button"];

  await findAndClickButton(page, theaterSelectors, {
    successMessage: "🎭 Theater mode enabled",
  });
}

export async function enableDarkMode(page: Page): Promise<void> {
  try {
    await page.emulateMedia({ colorScheme: "dark" });
    getLogger().debug("🌙 Dark mode enabled");
  } catch {
    // Dark mode might not be supported
  }
}

export async function hideSuggestedContent(page: Page): Promise<void> {
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
    getLogger().debug("🚫 Suggested content hidden");
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
