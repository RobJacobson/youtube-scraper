import { ScrapingContext } from './scrapeYouTubeChannel';
import { handleConsentDialog, dismissPopups, scrollToLoadVideos } from './helpers/pageHelpers';

export async function getVideoUrls(scrapingContext: ScrapingContext): Promise<string[]> {
  const { context, config, logger } = scrapingContext;
  logger.info('🔍 Discovering videos on channel...');
  
  const page = await context.newPage();
  
  try {
    await page.goto(`${config.channelUrl}/videos`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Handle consent and popups once
    await handleConsentDialog(page);
    await dismissPopups(page, logger);

    // Scroll to load more videos
    await scrollToLoadVideos(page, logger);

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