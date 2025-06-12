import { Page } from "playwright";
import { format } from "date-fns";
import { Config } from "../../types/Config";
import { Logger } from "../../utils/Logger";

// Constants for content extraction
const VIDEO_ID_REGEX_GROUP = 1;
const EXPAND_BUTTON_TIMEOUT = 2000;
const EXPAND_BUTTON_DELAY = 1000;
const SCREENSHOT_SCROLL_DELAY = 1000;
const MAX_EXPAND_ATTEMPTS = 3;

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
  logger.debug("📝 Attempting to expand description...");

  try {
    // Comprehensive YouTube description expand selectors
    const descriptionExpandSelectors = [
      // New YouTube layout selectors
      "tp-yt-paper-button#expand",
      "#expand.ytd-text-inline-expander",
      "ytd-text-inline-expander #expand",
      "ytd-expandable-video-description-body-renderer button",

      // Description specific selectors
      "#description-inline-expander button",
      '#description button[aria-label*="Show more"]',
      '#description button:has-text("Show more")',
      '#description button:has-text("more")',

      // Generic expand selectors
      "button#expand",
      'button[aria-label*="Show more"]',
      'button:has-text("Show more")',
      'button:has-text("...more")',
      'button:has-text("Read more")',

      // Secondary info renderer selectors
      'ytd-video-secondary-info-renderer button:has-text("more")',
      'ytd-video-secondary-info-renderer button[aria-label*="Show more"]',
    ];

    let expandedCount = 0;

    // Try multiple attempts to find and click expand buttons
    for (let attempt = 1; attempt <= MAX_EXPAND_ATTEMPTS; attempt++) {
      logger.debug(`📝 Expand attempt ${attempt}/${MAX_EXPAND_ATTEMPTS}`);
      let foundInThisAttempt = false;

      for (const selector of descriptionExpandSelectors) {
        try {
          const buttons = page.locator(selector);
          const count = await buttons.count();

          if (count > 0) {
            logger.debug(
              `🔍 Found ${count} button(s) with selector: ${selector}`
            );

            for (let i = 0; i < count; i++) {
              try {
                const button = buttons.nth(i);

                if (
                  await button.isVisible({ timeout: EXPAND_BUTTON_TIMEOUT })
                ) {
                  const isEnabled = await button.isEnabled();

                  if (isEnabled) {
                    logger.debug(
                      `✅ Clicking expand button: ${selector} (${
                        i + 1
                      }/${count})`
                    );
                    await button.click();
                    expandedCount++;
                    foundInThisAttempt = true;
                    await page.waitForTimeout(EXPAND_BUTTON_DELAY);
                    break; // Move to next selector after successful click
                  } else {
                    logger.debug(`⚠ Button not enabled: ${selector}`);
                  }
                } else {
                  logger.debug(`⚠ Button not visible: ${selector}`);
                }
              } catch (error) {
                logger.debug(
                  `❌ Error clicking button ${selector}[${i}]: ${error}`
                );
              }
            }
          }
        } catch (error) {
          logger.debug(`❌ Error with selector ${selector}: ${error}`);
        }

        if (foundInThisAttempt) break; // Don't try more selectors in this attempt
      }

      if (!foundInThisAttempt) {
        logger.debug(`ℹ No expand buttons found in attempt ${attempt}`);
        break; // No point in more attempts
      }

      // Wait between attempts
      if (attempt < MAX_EXPAND_ATTEMPTS) {
        await page.waitForTimeout(500);
      }
    }

    if (expandedCount > 0) {
      logger.debug(
        `✅ Successfully expanded ${expandedCount} description section(s)`
      );

      // Wait for content to load after expansion
      await page.waitForTimeout(EXPAND_BUTTON_DELAY);

      // Scroll description into view to ensure it's loaded
      await page.evaluate(() => {
        const description = document.querySelector(
          "#description, #description-text, #description-inline-expander"
        );
        if (description) {
          description.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });

      await page.waitForTimeout(500);
    } else {
      logger.debug(
        "ℹ No description expand buttons found or description already expanded"
      );
    }
  } catch (error) {
    logger.debug(`⚠ Error during description expansion: ${error}`);
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
