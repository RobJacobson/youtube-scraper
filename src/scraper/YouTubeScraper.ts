import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { format } from 'date-fns';
import { Config } from '../types/Config';
import { VideoMetadata, ScrapingResult, FailedVideo } from '../types/VideoMetadata';
import { ExponentialBackoff } from '../utils/ExponentialBackoff';
import { saveResults } from '../utils/fileSystem';
import { Logger } from '../utils/Logger';

interface ScrapingContext {
  browser: Browser;
  context: BrowserContext;
  backoff: ExponentialBackoff;
  logger: Logger;
  config: Config;
}

export async function scrapeYouTubeChannel(config: Config): Promise<ScrapingResult> {
  const startTime = Date.now();
  const logger = new Logger(config.verbose);
  logger.info('🚀 Starting YouTube scraper...');

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    const scrapingContext = await initializeScraping(config, logger);
    browser = scrapingContext.browser;
    context = scrapingContext.context;

    const videoUrls = await getVideoUrls(scrapingContext);
    const results = await scrapeVideos(videoUrls, scrapingContext);
    
    const scrapingResult = {
      ...results,
      summary: {
        total_attempted: videoUrls.length,
        successful: results.success.length,
        failed: results.failed.length,
        duration_ms: Date.now() - startTime
      }
    };

    await saveResults(scrapingResult, config.outputDir);
    logger.info(`📊 Results saved to: ${config.outputDir}`);

    return scrapingResult;
  } finally {
    await cleanupScraping(browser, context, new Logger(config.verbose));
  }
}

async function initializeScraping(config: Config, logger: Logger): Promise<ScrapingContext> {
  logger.info('🔧 Initializing browser...');
  
  const browser = await chromium.launch({
    headless: config.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1024, height: 720 },
    deviceScaleFactor: 1, // 125% zoom
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    colorScheme: config.useDarkMode ? 'dark' : 'light'
  });

  const backoff = new ExponentialBackoff(config.baseDelay, config.maxRetries);

  return { browser, context, backoff, logger, config };
}

async function getVideoUrls(scrapingContext: ScrapingContext): Promise<string[]> {
  const { context, config, logger } = scrapingContext;
  logger.info('🔍 Discovering videos on channel...');
  
  const page = await context.newPage();
  
  try {
    await page.goto(`${config.channelUrl}/videos`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Handle consent dialog if present
    await handleConsentDialog(page);
    
    // Dismiss any popups on the channel page
    await dismissPopups(page, logger);

    // Scroll to load more videos
    await scrollToLoadVideos(page, logger);
    
    // Dismiss popups again after scrolling (new content may trigger popups)
    await dismissPopups(page, logger);

    // Extract video URLs
    const videoUrls = await page.evaluate((configData) => {
      const links = Array.from(document.querySelectorAll('a[href*="/watch?v="]'));
      const uniqueUrls = [...new Set(links.map(link => {
        const href = (link as HTMLAnchorElement).href;
        return href.split('&')[0]; // Remove extra parameters
      }))];
      
      return uniqueUrls.slice(configData.offset, configData.offset + configData.maxVideos);
    }, { maxVideos: config.maxVideos, offset: config.offset });

    logger.info(`📹 Found ${videoUrls.length} videos to scrape`);
    return videoUrls;
  } finally {
    await page.close();
  }
}

async function handleConsentDialog(page: Page): Promise<void> {
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

async function scrollToLoadVideos(page: Page, logger: Logger): Promise<void> {
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

async function scrapeVideos(
  videoUrls: string[], 
  scrapingContext: ScrapingContext
): Promise<{ success: VideoMetadata[], failed: FailedVideo[] }> {
  const { config, logger, backoff } = scrapingContext;
  const success: VideoMetadata[] = [];
  const failed: FailedVideo[] = [];

  logger.info(`📊 Starting to scrape ${videoUrls.length} videos...`);

  for (let i = 0; i < videoUrls.length; i++) {
    const url = videoUrls[i];
    logger.info(`🎥 Processing video ${i + 1}/${videoUrls.length}: ${url}`);

    try {
      const metadata = await scrapeVideoMetadata(url, scrapingContext);
      success.push(metadata);
      logger.success(`✅ Successfully scraped: ${metadata.title}`);

    } catch (error) {
      const failedVideo: FailedVideo = {
        url,
        error: error instanceof Error ? error.message : String(error),
        retries_attempted: config.maxRetries
      };
      failed.push(failedVideo);
      logger.error(`❌ Failed to scrape: ${url} - ${failedVideo.error}`);
    }

    // Respectful delay between requests
    if (i < videoUrls.length - 1) {
      await backoff.delay();
    }
  }

  return { success, failed };
}

async function scrapeVideoMetadata(url: string, scrapingContext: ScrapingContext): Promise<VideoMetadata> {
  const { context, config, logger } = scrapingContext;
  const page = await context.newPage();
  
  try {
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for video to load with minimal delay
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Reduced from 3000ms
    
    // Immediately dismiss any popups that appear on page load
    await dismissPopups(page, logger);
    
    // Setup page features based on configuration
    const setupTasks = [
      pauseVideo(page, logger)
    ];

    // Add optional features based on config
    if (config.useDarkMode) {
      setupTasks.push(enableDarkMode(page, logger));
    }
    
    if (config.useTheaterMode) {
      setupTasks.push(enableTheaterMode(page, logger));
    }
    
    if (config.hideSuggestedVideos) {
      setupTasks.push(hideSuggestedContent(page, logger));
    }

    await Promise.allSettled(setupTasks);
    
    // Dismiss popups again after page setup
    await dismissPopups(page, logger);
    
    // Wait for title to be visible
    try {
      await page.waitForSelector('h1:not([hidden])', { state: 'visible', timeout: 10000 });
    } catch {
      await page.waitForSelector('title', { timeout: 3000 });
    }

    // Expand content after theater mode is enabled
    await expandDescriptionAndComments(page, logger);

    // Extract metadata
    const metadata = await page.evaluate((videoUrl) => {
      const getTextContent = (selector: string): string => {
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || '';
      };

      const getAttribute = (selector: string, attr: string): string => {
        const element = document.querySelector(selector);
        return element?.getAttribute(attr) || '';
      };

      return {
        url: videoUrl,
        title: getTextContent('h1[data-e2e="video-title"]') || getTextContent('h1.ytd-video-primary-info-renderer') || getTextContent('h1.title') || getTextContent('h1'),
        description: getTextContent('#description-text') || getTextContent('#description') || getTextContent('#description-inline-expander') || getTextContent('.description') || getTextContent('[data-e2e="video-description"]') || getTextContent('#watch-description-text'),
        author: getTextContent('#owner-name a') || getTextContent('.channel-name') || getTextContent('[data-e2e="video-author"]'),
        channelUrl: getAttribute('#owner-name a', 'href') || getAttribute('.channel-name a', 'href'),
        viewCount: getTextContent('#info-text') || getTextContent('.view-count') || getTextContent('[data-e2e="video-view-count"]'),
        likeCount: getTextContent('button[aria-label*="like"] span[role="text"]') || getTextContent('.like-count'),
        publishedDate: getTextContent('#info-text') || getTextContent('.date') || getTextContent('[data-e2e="video-publish-date"]'),
        duration: getTextContent('.ytp-time-duration') || getAttribute('meta[itemprop="duration"]', 'content'),
        thumbnailUrl: getAttribute('link[itemprop="thumbnailUrl"]', 'href') || getAttribute('meta[property="og:image"]', 'content'),
        category: getAttribute('meta[itemprop="genre"]', 'content') || getAttribute('meta[property="og:video:genre"]', 'content'),
        uploadDate: getAttribute('meta[itemprop="uploadDate"]', 'content') || getAttribute('meta[property="og:video:release_date"]', 'content'),
      };
    }, url);

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    
    // Complete metadata object
    const completeMetadata: VideoMetadata = {
      id: videoId,
      ...metadata,
      tags: await extractTags(page),
      language: await extractLanguage(page),
      scraped_at: new Date().toISOString()
    };

    // Take screenshot if not disabled
    if (!config.skipScreenshots) {
      const screenshotPath = await takeScreenshot(page, videoId, config, logger);
      completeMetadata.screenshot_path = screenshotPath;
    }

    return completeMetadata;
  } finally {
    await page.close();
  }
}

function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&#]*)/);
  return match ? match[1] : '';
}

async function dismissPopups(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🚫 Automatically dismissing popups...');
    
    // Comprehensive popup selectors for YouTube
    const popupSelectors = [
      // Generic close buttons
      'button[aria-label*="Close"]',
      'button[aria-label*="close"]',
      'button[title*="Close"]',
      'button[title*="close"]',
      'button:has-text("×")',
      'button:has-text("Close")',
      'button:has-text("Dismiss")',
      'button:has-text("Got it")',
      'button:has-text("OK")',
      'button:has-text("No thanks")',
      'button:has-text("Skip")',
      'button:has-text("Later")',
      'button:has-text("Not now")',
      
      // YouTube-specific popups
      'button[aria-label*="No thanks"]',
      'button[aria-label*="Skip"]',
      'button[aria-label*="Skip trial"]',
      'button[aria-label*="Maybe later"]',
      'button[aria-label*="Not now"]',
      'button[aria-label*="Dismiss"]',
      
      // YouTube Premium prompts
      'ytd-mealbar-promo-renderer button',
      'ytd-popup-container button:has-text("No thanks")',
      'ytd-popup-container button:has-text("Skip")',
      'ytd-popup-container button:has-text("Not now")',
      
      // Notification prompts (but avoid subscription actions)
      'button[aria-label*="Turn on notifications"]',
      
      // Overlay and modal close buttons
      '.ytd-popup-container button',
      '.overlay-close-button',
      '.close-button',
      '.modal-close',
      
      // Cookie consent (specific to consent dialogs only)
      'button:has-text("Accept all"):has([role="dialog"])',
      'button:has-text("Reject all"):has([role="dialog"])',
      
      // Survey and feedback popups
      'button:has-text("No, thanks")',
      'button:has-text("Maybe later")',
      'button[aria-label*="feedback"]',
      
      // Age verification and content warnings (specific contexts only)
      'button:has-text("I understand and wish to proceed")',
      '[role="dialog"] button:has-text("Continue")',
      '[role="dialog"] button:has-text("Proceed")',
      'button:has-text("I understand"):not(.ytp-button)',
      
      // Generic modal/dialog closes
      '[role="dialog"] button',
      '[role="alertdialog"] button',
      '.ytd-button-renderer button'
    ];

    let dismissedCount = 0;
    
    // Try to dismiss multiple popups (some pages have multiple)
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
                // Check if button is clickable and not disabled
                const isEnabled = await button.isEnabled();
                if (isEnabled) {
                  await button.click();
                  dismissedCount++;
                  foundPopup = true;
                  logger.debug(`✅ Dismissed popup via: ${selector}`);
                  await page.waitForTimeout(300); // Small delay for popup to close
                  break; // Move to next selector after successful click
                }
              }
            } catch {
              // Continue to next button
            }
          }
          
          if (foundPopup) break; // Move to next attempt after finding a popup
        } catch {
          // Continue to next selector
        }
      }
      
      if (!foundPopup) break; // No more popups found, exit loop
    }

    // Try keyboard shortcuts to dismiss any remaining popups
    const keyboardDismissals = ['Escape', 'Tab', 'Enter'];
    for (const key of keyboardDismissals) {
      try {
        await page.keyboard.press(key);
        await page.waitForTimeout(100);
      } catch {
        // Continue silently
      }
    }

    // Hide popup overlays with CSS as last resort
    await page.addStyleTag({
      content: `
        /* Hide common popup overlays */
        .ytd-popup-container,
        .ytd-mealbar-promo-renderer,
        .ytp-ce-element,
        .ytp-cards-teaser,
        .overlay,
        .modal-overlay,
        [role="dialog"]:not([aria-label*="Settings"]):not([aria-label*="Caption"]),
        [role="alertdialog"],
        .notification-topbar,
        .masthead-ad-control,
        ytd-consent-banner-renderer {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
        
        /* Remove popup backgrounds */
        .scrim,
        .backdrop,
        .overlay-background {
          display: none !important;
        }
      `
    }).catch(() => {});

    if (dismissedCount > 0) {
      logger.debug(`✅ Successfully dismissed ${dismissedCount} popup(s)`);
    } else {
      logger.debug('ℹ No popups found to dismiss');
    }
    
  } catch (error) {
    logger.debug(`⚠ Error while dismissing popups: ${error}`);
  }
}

async function expandDescriptionAndComments(page: Page, logger: Logger): Promise<void> {
  logger.debug('📝 Expanding description and comments...');
  
  try {
    // Expand description and comments in parallel for speed
    await Promise.allSettled([
      expandDescription(page, logger),
      expandComments(page, logger)
    ]);
    
    // Minimal wait for UI changes
    await page.waitForTimeout(500);
  } catch (error) {
    logger.debug(`⚠ Could not expand content: ${error}`);
  }
}

async function pauseVideo(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('⏸️ Pausing video...');
    
    // Wait for video element to be ready
    await page.waitForSelector('video', { timeout: 10000 });
    await page.waitForTimeout(500); // Give video time to start playing
    
    // Method 1: Direct JavaScript control (most reliable)
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
      return;
    }
    
    // Method 2: Keyboard shortcuts as fallback
    try {
      await page.keyboard.press('k'); // YouTube pause/play toggle
      await page.waitForTimeout(200);
      
      // Verify if paused
      const isPaused = await page.evaluate(() => {
        const video = document.querySelector('video');
        return video ? video.paused : false;
      });
      
      if (isPaused) {
        logger.debug('✅ Video paused via keyboard (k)');
        return;
      }
      
      // Try spacebar as alternative
      await page.keyboard.press(' ');
      await page.waitForTimeout(200);
      
      const isPausedSpace = await page.evaluate(() => {
        const video = document.querySelector('video');
        return video ? video.paused : false;
      });
      
      if (isPausedSpace) {
        logger.debug('✅ Video paused via keyboard (space)');
        return;
      }
      
    } catch (error) {
      logger.debug(`⚠ Keyboard pause failed: ${error}`);
    }
    
    // Method 3: Click pause button as last resort
    try {
      const pauseButton = page.locator('.ytp-play-button[aria-label*="Pause"]').first();
      if (await pauseButton.isVisible({ timeout: 1000 })) {
        await pauseButton.click();
        logger.debug('✅ Video paused via button click');
        return;
      }
    } catch (error) {
      logger.debug(`⚠ Button click pause failed: ${error}`);
    }
    
    logger.debug('⚠ Could not confirm video pause');
    
  } catch (error) {
    logger.debug(`⚠ Could not pause video: ${error}`);
  }
}

async function enableTheaterMode(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🎭 Enabling theater mode...');
    
    // Fast theater mode - try keyboard shortcut first (fastest)
    await page.keyboard.press('t');
    await page.waitForTimeout(300);
    logger.debug('✅ Theater mode enabled');
    
  } catch (error) {
    logger.debug(`⚠ Could not enable theater mode: ${error}`);
  }
}

async function enableDarkMode(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🌙 Enabling dark mode using native browser methods...');
    
    // Method 1: Set browser context to prefer dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    logger.debug('✅ Browser color scheme set to dark');
    
    // Method 2: Set YouTube's localStorage preferences for dark mode
    await page.evaluate(() => {
      try {
        // YouTube stores theme preference in localStorage
        localStorage.setItem('yt-player-theme', 'dark');
        localStorage.setItem('yt-remote-device-id', JSON.stringify({
          'theme': 'dark'
        }));
        
        // YouTube's internal preference storage
        const ytInitialData = {
          'INNERTUBE_CONTEXT': {
            'theme': 'dark'
          }
        };
        
        // Set various YouTube preference keys that might control dark mode
        const darkModeKeys = [
          'yt-remote-session-app',
          'yt-remote-session-name', 
          'yt-player-quality',
          'yt-player-av1-pref'
        ];
        
        darkModeKeys.forEach(key => {
          try {
            const existing = localStorage.getItem(key);
            if (existing) {
              const parsed = JSON.parse(existing);
              parsed.theme = 'dark';
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch (e) {
            // Continue if parsing fails
          }
        });
        
        return true;
      } catch (error) {
        return false;
      }
    });
    
    // Method 3: Try YouTube's native dark mode toggle
    await page.waitForTimeout(500); // Give localStorage time to take effect
    
    // Look for the appearance/theme button in the top bar
    const themeSelectors = [
      'button[aria-label*="Switch to dark theme"]',
      'button[aria-label*="Dark theme"]',
      'button[title*="Dark theme"]',
      'button[data-tooltip-text*="Dark theme"]',
      '#button[aria-label*="Appearance"]'
    ];

    for (const selector of themeSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          await button.click();
          logger.debug('✅ Dark mode toggled via native YouTube button');
          await page.waitForTimeout(500);
          return;
        }
      } catch {
        // Continue to next selector
      }
    }

    // Method 4: Try accessing through user menu (three dots or avatar)
    try {
      const menuTriggers = [
        'button[aria-label*="Settings"]:visible',
        'button[aria-label*="Menu"]:visible',
        '#avatar-btn:visible',
        'ytd-topbar-menu-button-renderer button:visible'
      ];
      
      for (const trigger of menuTriggers) {
        try {
          const menuButton = page.locator(trigger).first();
          if (await menuButton.isVisible({ timeout: 1000 })) {
            await menuButton.click();
            await page.waitForTimeout(500);
            
            // Look for appearance/theme options
            const themeOptions = [
              'text="Appearance: Dark"',
              'text="Dark theme"',
              'text="Appearance"',
              '[role="menuitem"]:has-text("Appearance")',
              '[role="menuitem"]:has-text("Dark")'
            ];
            
            for (const option of themeOptions) {
              try {
                const themeOption = page.locator(option).first();
                if (await themeOption.isVisible({ timeout: 1000 })) {
                  await themeOption.click();
                  logger.debug('✅ Dark mode enabled via settings menu');
                  await page.waitForTimeout(500);
                  return;
                }
              } catch {
                // Continue
              }
            }
            
            // Close menu if theme option not found
            await page.keyboard.press('Escape');
            break;
          }
        } catch {
          // Continue to next trigger
        }
      }
    } catch (error) {
      logger.debug(`⚠ Settings menu approach failed: ${error}`);
    }

    // Method 5: Force dark mode via JavaScript (native YouTube methods)
    const darkModeApplied = await page.evaluate(() => {
      try {
        // Try to trigger YouTube's internal dark mode
        const html = document.documentElement;
        html.setAttribute('dark', '');
        html.setAttribute('data-theme', 'dark');
        
        // Try to find and trigger YouTube's theme controller
        const ytdApp = document.querySelector('ytd-app');
        if (ytdApp) {
          ytdApp.setAttribute('dark', '');
        }
        
        // Dispatch a theme change event
        const themeEvent = new CustomEvent('yt-theme-change', {
          detail: { theme: 'dark' }
        });
        document.dispatchEvent(themeEvent);
        
        return true;
      } catch (error) {
        return false;
      }
    });
    
    if (darkModeApplied) {
      logger.debug('✅ Dark mode applied via JavaScript theme controller');
    } else {
      logger.debug('⚠ Could not enable dark mode via native methods');
    }
    
  } catch (error) {
    logger.debug(`⚠ Could not enable dark mode: ${error}`);
  }
}

async function hideSuggestedContent(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('🚫 Hiding suggested content...');
    
    // Inject CSS to hide all suggested content and distractions
    await page.addStyleTag({
      content: `
        /* Hide suggested videos sidebar */
        #secondary,
        #secondary-inner,
        ytd-watch-next-secondary-results-renderer,
        ytd-compact-video-renderer,
        ytd-shelf-renderer,
        
        /* Hide end screen suggestions */
        .ytp-ce-element,
        .ytp-cards-teaser,
        .ytp-endscreen-element,
        .ytp-pause-overlay,
        
        /* Hide video cards and annotations */
        .ytp-cards-button,
        .ytp-cards-teaser,
        .iv-click-target,
        .annotation,
        
        /* Hide autoplay toggle and suggestions */
        .ytp-autonav-endscreen-upnext-container,
        .ytp-upnext,
        ytd-compact-autoplay-renderer,
        
        /* Hide comments suggestions */
        ytd-comment-replies-renderer .ytd-expander,
        
        /* Hide channel suggestions */
        ytd-shelf-renderer[is-shorts],
        ytd-rich-shelf-renderer,
        
        /* Hide shorts shelf */
        ytd-reel-shelf-renderer,
        ytd-rich-section-renderer,
        
        /* Hide live chat */
        #chat-container,
        ytd-live-chat-frame,
        
        /* Hide merchandise shelf */
        ytd-merch-shelf-renderer,
        
        /* Hide playlist suggestions */
        ytd-playlist-panel-renderer .ytd-playlist-panel-video-renderer:not(:first-child) {
          display: none !important;
        }
        
        /* Clean up the layout */
        #primary {
          width: 100% !important;
          max-width: none !important;
        }
        
        /* Hide distracting elements */
        .ytp-gradient-bottom,
        .ytp-chrome-top,
        .ytp-show-cards-title {
          display: none !important;
        }
      `
    });
    
    logger.debug('✅ Suggested content hidden');
    
  } catch (error) {
    logger.debug(`⚠ Could not hide suggested content: ${error}`);
  }
}

async function expandDescription(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('📝 Attempting to expand description...');
    
    // Wait for description area to load
    await page.waitForTimeout(1000);
    
    // Modern YouTube description expand selectors (updated for current YouTube)
    const expandSelectors = [
      // New YouTube layout selectors
      'tp-yt-paper-button#expand',
      '#expand.ytd-text-inline-expander',
      'ytd-text-inline-expander #expand',
      'button#expand',
      
      // Alternative selectors
      'button[aria-label*="Show more"]',
      'button[aria-label*="more"]',
      '#description button:has-text("more")',
      '#description button:has-text("Show more")',
      'ytd-video-secondary-info-renderer button:has-text("more")',
      'ytd-expandable-video-description-body-renderer button',
      
      // Fallback selectors
      'button:has-text("...more")',
      'button:has-text("Show more")',
      '#description-inline-expander button'
    ];

    // Try each selector with better error handling
    for (const selector of expandSelectors) {
      try {
        logger.debug(`🔍 Trying selector: ${selector}`);
        const button = page.locator(selector).first();
        
        // Check if button exists and is visible
        if (await button.count() > 0) {
          const isVisible = await button.isVisible({ timeout: 500 });
          if (isVisible) {
            logger.debug(`✅ Found expand button with: ${selector}`);
            await button.click();
            logger.debug('✅ Description expanded successfully');
            await page.waitForTimeout(1000); // Wait for expansion animation
            return;
          }
        }
      } catch (error) {
        logger.debug(`❌ Selector failed: ${selector} - ${error}`);
      }
    }

    // Try JavaScript approach as fallback
    try {
      logger.debug('🔧 Trying JavaScript fallback...');
      const expanded = await page.evaluate(() => {
        // Look for expand button using various methods
        const expandButton = document.querySelector('#expand') || 
                            document.querySelector('button[aria-label*="more"]') ||
                            document.querySelector('button[aria-label*="Show more"]') ||
                            document.querySelector('ytd-text-inline-expander button');
        
        if (expandButton && expandButton instanceof HTMLElement) {
          expandButton.click();
          return true;
        }
        return false;
      });
      
      if (expanded) {
        logger.debug('✅ Description expanded via JavaScript');
        await page.waitForTimeout(1000);
        return;
      }
    } catch (error) {
      logger.debug(`❌ JavaScript fallback failed: ${error}`);
    }

    logger.debug('ℹ No description expand button found or description already expanded');
    
  } catch (error) {
    logger.debug(`⚠ Could not expand description: ${error}`);
  }
}

async function expandComments(page: Page, logger: Logger): Promise<void> {
  try {
    logger.debug('💬 Attempting to expand comments...');
    
    // Scroll down to comments section to ensure it loads
    await page.evaluate(() => {
      const commentsSection = document.querySelector('#comments, #comment, ytd-comments');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Scroll down to trigger comments loading
        window.scrollBy(0, 1000);
      }
    });
    
    await page.waitForTimeout(2000); // Wait for comments to load
    
    // Try to find and click "Show more" buttons in comments
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
        
        for (let i = 0; i < Math.min(count, 5); i++) { // Limit to first 5 expand buttons
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

async function extractTags(page: Page): Promise<string[]> {
  try {
    return await page.evaluate(() => {
      const metaTags = Array.from(document.querySelectorAll('meta[property="og:video:tag"]'));
      return metaTags.map(tag => tag.getAttribute('content')).filter(Boolean) as string[];
    });
  } catch {
    return [];
  }
}

async function extractLanguage(page: Page): Promise<string> {
  try {
    return await page.evaluate(() => {
      const langMeta = document.querySelector('meta[itemprop="inLanguage"]');
      return langMeta?.getAttribute('content') || 'unknown';
    });
  } catch {
    return 'unknown';
  }
}

async function takeScreenshot(page: Page, videoId: string, config: Config, logger: Logger): Promise<string> {
  logger.debug('📸 Preparing to take screenshot...');
  
  // Wait 5000ms before taking screenshot to ensure page is fully settled
  await page.waitForTimeout(5000);
  
  // Scroll to the top of the page before taking screenshot
  logger.debug('📄 Scrolling to top of page...');
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  
  // Small delay to ensure scroll completes
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

async function cleanupScraping(browser: Browser | null, context: BrowserContext | null, logger: Logger): Promise<void> {
  if (context) {
    await context.close();
  }
  if (browser) {
    await browser.close();
  }
  logger.info('🧹 Cleanup completed');
} 