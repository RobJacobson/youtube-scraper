import { writeFile } from "node:fs/promises";
import { log } from "../../utils/logger";

export interface ImageDownloadService {
  downloadAndSaveImage: (
    imageUrl: string,
    outputPathWithoutExtension: string
  ) => Promise<string | null>;
}

export const createImageDownloadService = (): ImageDownloadService => {
  const downloadAndSaveImage = async (
    imageUrl: string,
    outputPathWithoutExtension: string
  ): Promise<string | null> => {
    try {
      if (!imageUrl) {
        log.info("🖼️  No image URL provided");
        return null;
      }

      log.debug(`🖼️  Downloading image from: ${imageUrl}`);

      const response = await fetch(imageUrl);
      if (!response.ok) {
        log.error(
          `❌ Failed to download image: ${response.status} ${response.statusText}`
        );
        return null;
      }

      // Determine file extension from URL or Content-Type
      let extension = "";
      const urlExtension = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
      if (urlExtension) {
        extension = urlExtension[1].toLowerCase();
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("jpeg")) extension = "jpg";
        else if (contentType?.includes("png")) extension = "png";
        else if (contentType?.includes("webp")) extension = "webp";
        else if (contentType?.includes("gif")) extension = "gif";
        else extension = "jpg"; // default fallback
      }

      const outputPath = `${outputPathWithoutExtension}.${extension}`;
      const buffer = await response.arrayBuffer();
      await writeFile(outputPath, new Uint8Array(buffer));

      log.debug(`🖼️  Image saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      log.error(
        `❌ Error downloading image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return null;
    }
  };

  return {
    downloadAndSaveImage,
  };
};
