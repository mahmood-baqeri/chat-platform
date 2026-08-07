import path from "path";
import fs from "fs";
import crypto from "crypto";

export const PORT = 3000;
export const uploadsDir = path.join(process.cwd(), "uploads");
export const UPLOADS_DIR = uploadsDir;

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function generateUUIDv4(): string {
  return crypto.randomUUID();
}

export function saveBase64ToFile(base64Data: string, originalFilename: string = "file"): string {
  if (!base64Data || !base64Data.startsWith("data:")) {
    return base64Data; // Already a URL or filename
  }

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Data;
    }

    const ext = matches[1].split("/")[1] || "png";
    const buffer = Buffer.from(matches[2], "base64");
    
    const sanitizeName = originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${sanitizeName}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Failed to save base64 file:", error);
    return base64Data;
  }
}
