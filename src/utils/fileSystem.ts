import fs from 'fs-extra';
import path from 'path';
import { ScrapingResult } from '../types/VideoMetadata';

export async function setupDirectories(outputDir: string): Promise<void> {
  await fs.ensureDir(outputDir);
  await fs.ensureDir(path.join(outputDir, 'screenshots'));
  await fs.ensureDir(path.join(outputDir, 'data'));
}

export async function saveResults(results: ScrapingResult, outputDir: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scraping_results_${timestamp}.json`;
  const filepath = path.join(outputDir, 'data', filename);

  await fs.writeJSON(filepath, results, { spaces: 2 });
}

export async function saveScreenshot(buffer: Buffer, filepath: string): Promise<void> {
  await fs.writeFile(filepath, buffer);
} 