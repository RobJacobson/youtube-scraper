import { Page } from "playwright";
import { writeFile } from "node:fs/promises";
import { log } from "../../utils/logger";

export interface HtmlSaveService {
  savePageHtml: (page: Page, outputPath: string) => Promise<boolean>;
}

export const createHtmlSaveService = (): HtmlSaveService => {
  const savePageHtml = async (
    page: Page,
    outputPath: string
  ): Promise<boolean> => {
    try {
      log.debug(`📄 Saving HTML to: ${outputPath}`);

      const htmlContent = await page.content();
      await writeFile(outputPath, htmlContent, "utf8");

      log.debug(`📄 HTML saved successfully`);
      return true;
    } catch (error) {
      log.error(
        `❌ Error saving HTML: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  };

  return {
    savePageHtml,
  };
};
