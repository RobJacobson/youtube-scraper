import { Page } from 'playwright';
import { VideoMetadata, FailedVideo } from '../types/VideoMetadata';
import { Config } from '../types/Config';
import { Logger } from '../utils/Logger';
import { ScrapingContext } from './scrapeYouTubeChannel';
import { dismissPopups, pauseVideo, enableDarkMode, enableTheaterMode, hideSuggestedContent } from './helpers/pageHelpers';
import { extractVideoId, extractTags, extractLanguage, expandDescriptionAndComments, takeScreenshot } from './helpers/contentHelpers';

export async function scrapeVideos(
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

    // Single page setup - combine all tasks
    await setupPage(page, config, logger);
    
    // Wait for content to load
    try {
      await page.waitForSelector('h1:not([hidden])', { state: 'visible', timeout: 10000 });
    } catch {
      await page.waitForSelector('title', { timeout: 3000 });
    }

    // Expand content and extract metadata
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

// Simplified page setup - one function, one popup dismissal
async function setupPage(page: Page, config: Config, logger: Logger): Promise<void> {
  // Wait for initial load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Single popup dismissal at the start
  await dismissPopups(page, logger);
  
  // Setup all features at once with Promise.allSettled
  const setupTasks = [pauseVideo(page, logger)];

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
} 