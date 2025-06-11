import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { format } from 'date-fns';
import { Config } from '../types/Config';
import { VideoMetadata, ScrapingResult, FailedVideo } from '../types/VideoMetadata';
import { ExponentialBackoff } from '../utils/ExponentialBackoff';
import { saveResults } from '../utils/fileSystem';
import { Logger } from '../utils/Logger';

export class YouTubeScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private backoff: ExponentialBackoff;
  private logger: Logger;

  constructor(private config: Config) {
    this.backoff = new ExponentialBackoff(config.baseDelay, config.maxRetries);
    this.logger = new Logger(config.verbose);
  }

  async run(): Promise<ScrapingResult> {
    const startTime = Date.now();
    this.logger.info('🚀 Starting YouTube scraper...');

    try {
      await this.initialize();
      const videoUrls = await this.getVideoUrls();
      const results = await this.scrapeVideos(videoUrls);
      
      const scrapingResult = {
        ...results,
        summary: {
          total_attempted: videoUrls.length,
          successful: results.success.length,
          failed: results.failed.length,
          duration_ms: Date.now() - startTime
        }
      };

      await saveResults(scrapingResult, this.config.outputDir);
      this.logger.info(`📊 Results saved to: ${this.config.outputDir}`);

      return scrapingResult;
    } finally {
      await this.cleanup();
    }
  }

  private async initialize(): Promise<void> {
    this.logger.info('🔧 Initializing browser...');
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
  }

  private async getVideoUrls(): Promise<string[]> {
    this.logger.info('🔍 Discovering videos on channel...');
    
    const page = await this.context!.newPage();
    
    try {
      await page.goto(`${this.config.channelUrl}/videos`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Handle consent dialog if present
      await this.handleConsentDialog(page);

      // Scroll to load more videos
      await this.scrollToLoadVideos(page);

      // Extract video URLs
      const videoUrls = await page.evaluate((maxVideos, offset) => {
        const links = Array.from(document.querySelectorAll('a[href*="/watch?v="]'));
        const uniqueUrls = [...new Set(links.map(link => {
          const href = (link as HTMLAnchorElement).href;
          return href.split('&')[0]; // Remove extra parameters
        }))];
        
        return uniqueUrls.slice(offset, offset + maxVideos);
      }, this.config.maxVideos, this.config.offset);

      this.logger.info(`📹 Found ${videoUrls.length} videos to scrape`);
      return videoUrls;
    } finally {
      await page.close();
    }
  }

  private async handleConsentDialog(page: Page): Promise<void> {
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

  private async scrollToLoadVideos(page: Page): Promise<void> {
    this.logger.info('📜 Loading more videos...');
    
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

  private async scrapeVideos(videoUrls: string[]): Promise<{ success: VideoMetadata[], failed: FailedVideo[] }> {
    const success: VideoMetadata[] = [];
    const failed: FailedVideo[] = [];

    this.logger.info(`📊 Starting to scrape ${videoUrls.length} videos...`);

    for (let i = 0; i < videoUrls.length; i++) {
      const url = videoUrls[i];
      this.logger.info(`🎥 Processing video ${i + 1}/${videoUrls.length}: ${url}`);

      try {
        const metadata = await this.scrapeVideoMetadata(url);
        success.push(metadata);
        this.logger.success(`✅ Successfully scraped: ${metadata.title}`);

      } catch (error) {
        const failedVideo: FailedVideo = {
          url,
          error: error instanceof Error ? error.message : String(error),
          retries_attempted: this.config.maxRetries
        };
        failed.push(failedVideo);
        this.logger.error(`❌ Failed to scrape: ${url} - ${failedVideo.error}`);
      }

      // Respectful delay between requests
      if (i < videoUrls.length - 1) {
        await this.backoff.delay();
      }
    }

    return { success, failed };
  }

  private async scrapeVideoMetadata(url: string): Promise<VideoMetadata> {
    const page = await this.context!.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for video to load
      await page.waitForSelector('h1.ytd-video-primary-info-renderer', { timeout: 15000 });

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
          title: getTextContent('h1.ytd-video-primary-info-renderer'),
          description: getTextContent('#description-text'),
          author: getTextContent('#owner-name a'),
          channelUrl: getAttribute('#owner-name a', 'href'),
          viewCount: getTextContent('#info-text'),
          likeCount: getTextContent('button[aria-label*="like"] span[role="text"]'),
          publishedDate: getTextContent('#info-text'),
          duration: getTextContent('.ytp-time-duration'),
          thumbnailUrl: getAttribute('link[itemprop="thumbnailUrl"]', 'href'),
          category: getAttribute('meta[itemprop="genre"]', 'content'),
          uploadDate: getAttribute('meta[itemprop="uploadDate"]', 'content'),
        };
      }, url);

      // Extract video ID from URL
      const videoId = this.extractVideoId(url);
      
      // Complete metadata object
      const completeMetadata: VideoMetadata = {
        id: videoId,
        ...metadata,
        tags: await this.extractTags(page),
        language: await this.extractLanguage(page),
        scraped_at: new Date().toISOString()
      };

      // Take screenshot if not disabled
      if (!this.config.skipScreenshots) {
        const screenshotPath = await this.takeScreenshot(page, videoId);
        completeMetadata.screenshot_path = screenshotPath;
      }

      return completeMetadata;
    } finally {
      await page.close();
    }
  }

  private extractVideoId(url: string): string {
    const match = url.match(/[?&]v=([^&#]*)/);
    return match ? match[1] : '';
  }

  private async extractTags(page: Page): Promise<string[]> {
    try {
      return await page.evaluate(() => {
        const metaTags = Array.from(document.querySelectorAll('meta[property="og:video:tag"]'));
        return metaTags.map(tag => tag.getAttribute('content')).filter(Boolean) as string[];
      });
    } catch {
      return [];
    }
  }

  private async extractLanguage(page: Page): Promise<string> {
    try {
      return await page.evaluate(() => {
        const langMeta = document.querySelector('meta[itemprop="inLanguage"]');
        return langMeta?.getAttribute('content') || 'unknown';
      });
    } catch {
      return 'unknown';
    }
  }

  private async takeScreenshot(page: Page, videoId: string): Promise<string> {
    const filename = `${videoId}_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.png`;
    const screenshotPath = `${this.config.outputDir}/screenshots/${filename}`;
    
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      type: 'png'
    });

    return screenshotPath;
  }

  private async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    this.logger.info('🧹 Cleanup completed');
  }
} 