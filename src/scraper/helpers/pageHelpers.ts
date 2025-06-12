import { Page } from 'playwright';
import { Logger } from '../../utils/Logger';

export async function handleConsentDialog(page: Page): Promise<void> {
  try {
    const consentButton = page.locator('button:has-text("Accept all"), button:has-text("Reject all")').first();
    if (await consentButton.isVisible({ timeout: 5000 })) {
      await consentButton.click();
      await page.waitForTimeout(2000);
    }
  } catch {
    // Ignore if consent dialog not found
  }
}

export async function dismissPopups(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🚫 Automatically dismissing popups...');
    
    const popupSelectors = [
      'button[aria-label*="Close"]',
      'button[aria-label*="close"]',
      'button:has-text("×")',
      'button:has-text("Close")',
      'button:has-text("Dismiss")',
      'button:has-text("Got it")',
      'button:has-text("OK")',
      'button:has-text("No thanks")',
      'button:has-text("Skip")',
      'button:has-text("Not now")',
      'button[aria-label*="Skip trial"]',
      'button[aria-label*="Maybe later"]',
      'button[aria-label*="Dismiss"]'
    ];

    let dismissedCount = 0;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      let foundPopup = false;
      
      for (const selector of popupSelectors) {
        try {
          const buttons = page.locator(selector);
          const count = await buttons.count();
          
          for (let i = 0; i < count; i++) {
            try {
              const button = buttons.nth(i);
              if (await button.isVisible({ timeout: 200 })) {
                const isEnabled = await button.isEnabled();
                if (isEnabled) {
                  await button.click();
                  dismissedCount++;
                  foundPopup = true;
                  logger.debug(`✅ Dismissed popup via: ${selector}`);
                  await page.waitForTimeout(300);
                  break;
                }
              }
            } catch {
              // Continue to next button
            }
          }
          
          if (foundPopup) break;
        } catch {
          // Continue to next selector
        }
      }
      
      if (!foundPopup) break;
    }

    if (dismissedCount > 0) {
      logger.debug(`✅ Successfully dismissed ${dismissedCount} popup(s)`);
    } else {
      logger.debug('ℹ No popups found to dismiss');
    }
    
  } catch (error) {
    logger.debug(`⚠ Error while dismissing popups: ${error}`);
  }
}

export async function pauseVideo(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('⏸️ Pausing video...');
    
    await page.waitForSelector('video', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const paused = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) {
        if (!video.paused) {
          video.pause();
          return true;
        }
        return video.paused;
      }
      return false;
    });
    
    if (paused) {
      logger.debug('✅ Video paused via JavaScript');
    }
    
  } catch (error) {
    logger.debug(`⚠ Could not pause video: ${error}`);
  }
}

export async function enableTheaterMode(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🎭 Enabling theater mode...');
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    logger.debug('✅ Theater mode enabled');
  } catch (error) {
    logger.debug(`⚠ Could not enable theater mode: ${error}`);
  }
}

export async function enableDarkMode(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🌙 Enabling dark mode using native browser methods...');
    
    await page.emulateMedia({ colorScheme: 'dark' });
    logger.debug('✅ Browser color scheme set to dark');
    
  } catch (error) {
    logger.debug(`⚠ Could not enable dark mode: ${error}`);
  }
}

export async function hideSuggestedContent(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🚫 Hiding suggested content...');
    
    await page.addStyleTag({
      content: `
        #secondary,
        ytd-watch-next-secondary-results-renderer,
        .ytp-ce-element,
        .ytp-cards-teaser {
          display: none !important;
        }
      `
    });
    
    logger.debug('✅ Suggested content hidden');
    
  } catch (error) {
    logger.debug(`⚠ Could not hide suggested content: ${error}`);
  }
}

export async function scrollToLoadVideos(page: Page, logger: Logger): Promise<void> {
  logger.info('📜 Loading more videos...');
  
  let previousHeight = 0;
  let scrollAttempts = 0;
  const maxScrollAttempts = 10;

  while (scrollAttempts < maxScrollAttempts) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(2000);

    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    
    if (currentHeight === previousHeight) {
      break;
    }
    
    previousHeight = currentHeight;
    scrollAttempts++;
  }
} 