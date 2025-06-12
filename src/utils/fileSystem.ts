import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'path';
import { ScrapingResult } from '../types/VideoMetadata';

export async function setupDirectories(outputDir: string): Promise<void> {
  await ensureDir(outputDir);
  await ensureDir(path.join(outputDir, 'screenshots'));
  await ensureDir(path.join(outputDir, 'data'));
}

export async function saveResults(results: ScrapingResult, outputDir: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scraping_results_${timestamp}.json`;
  const filepath = path.join(outputDir, 'data', filename);

  await writeFile(filepath, JSON.stringify(results, null, 2), 'utf8');
}

export async function saveScreenshot(buffer: Buffer, filepath: string): Promise<void> {
  await writeFile(filepath, buffer);
}

// Helper function to ensure directory exists (equivalent to fs.ensureDir)
async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
} 