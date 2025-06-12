import { Page } from 'playwright';
import { format } from 'date-fns';
import { Config } from '../../types/Config';
import { Logger } from '../../utils/Logger';

export function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&#]*)/);
  return match ? match[1] : '';
}

export async function extractTags(page: Page): Promise<string[]> {
  try {
    return await page.evaluate(() => {
      const metaTags = Array.from(document.querySelectorAll('meta[property="og:video:tag"]'));
      return metaTags.map(tag => tag.getAttribute('content')).filter(Boolean) as string[];
    });
  } catch {
    return [];
  }
}

export async function extractLanguage(page: Page): Promise<string> {
  try {
    return await page.evaluate(() => {
      const langMeta = document.querySelector('meta[itemprop="inLanguage"]');
      return langMeta?.getAttribute('content') || 'unknown';
    });
  } catch {
    return 'unknown';
  }
}

export async function expandDescriptionAndComments(page: Page, logger: Logger): Promise<void> {
  logger.debug('📝 Expanding description and comments...');
  
  try {
    await Promise.allSettled([
      expandDescription(page, logger),
      expandComments(page, logger)
    ]);
    
    await page.waitForTimeout(500);
  } catch (error) {
    logger.debug(`⚠ Could not expand content: ${error}`);
  }
}

export async function expandDescription(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('📝 Attempting to expand description...');
    
    await page.waitForTimeout(1000);
    
    const expandSelectors = [
      'tp-yt-paper-button#expand',
      '#expand.ytd-text-inline-expander',
      'ytd-text-inline-expander #expand',
      'button#expand',
      'button[aria-label*="Show more"]',
      'button[aria-label*="more"]',
      '#description button:has-text("more")',
      '#description button:has-text("Show more")',
      'ytd-video-secondary-info-renderer button:has-text("more")',
      'ytd-expandable-video-description-body-renderer button',
      'button:has-text("...more")',
      'button:has-text("Show more")',
      '#description-inline-expander button'
    ];

    for (const selector of expandSelectors) {
      try {
        logger.debug(`🔍 Trying selector: ${selector}`);
        const button = page.locator(selector).first();
        
        if (await button.count() > 0) {
          const isVisible = await button.isVisible({ timeout: 500 });
          if (isVisible) {
            logger.debug(`✅ Found expand button with: ${selector}`);
            await button.click();
            logger.debug('✅ Description expanded successfully');
            await page.waitForTimeout(1000);
            return;
          }
        }
      } catch (error) {
        logger.debug(`❌ Selector failed: ${selector} - ${error}`);
      }
    }

    logger.debug('ℹ No description expand button found or description already expanded');
    
  } catch (error) {
    logger.debug(`⚠ Could not expand description: ${error}`);
  }
}

export async function expandComments(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('💬 Attempting to expand comments...');
    
    await page.evaluate(() => {
      const commentsSection = document.querySelector('#comments, #comment, ytd-comments');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollBy(0, 1000);
      }
    });
    
    await page.waitForTimeout(2000);
    
    const commentExpandSelectors = [
      '#comments button[aria-label*="Read more"]',
      '#comments button:has-text("Read more")',
      '#comments button:has-text("Show more")',
      'ytd-comments button[aria-label*="Read more"]',
      'ytd-comment-thread-renderer button[aria-label*="Read more"]',
      '#comment-content button:has-text("Read more")',
      '.comment-content button:has-text("Read more")',
      'button[aria-label*="Show more replies"]'
    ];

    let expandedCount = 0;
    for (const selector of commentExpandSelectors) {
      try {
        const buttons = page.locator(selector);
        const count = await buttons.count();
        
        for (let i = 0; i < Math.min(count, 5); i++) {
          try {
            const button = buttons.nth(i);
            if (await button.isVisible({ timeout: 500 })) {
              await button.click();
              expandedCount++;
              await page.waitForTimeout(300);
            }
          } catch {
            // Continue to next button
          }
        }
      } catch {
        // Continue to next selector
      }
    }

    if (expandedCount > 0) {
      logger.debug(`✅ Expanded ${expandedCount} comments`);
    } else {
      logger.debug('ℹ No expandable comments found');
    }
    
  } catch (error) {
    logger.debug(`⚠ Could not expand comments: ${error}`);
  }
}

export async function takeScreenshot(page: Page, videoId: string, config: Config, logger: Logger): Promise<string> {
  logger.debug('📸 Preparing to take screenshot...');
  
  await page.waitForTimeout(5000);
  
  logger.debug('📄 Scrolling to top of page...');
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  
  await page.waitForTimeout(500);
  
  const filename = `${videoId}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.png`;
  const screenshotPath = `${config.outputDir}/screenshots/${filename}`;
  
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true,
    type: 'png'
  });

  logger.debug(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
} 