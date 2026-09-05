import "dotenv/config";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.resolve(__dirname, "../backups");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not configured in Backend/.env");
  process.exit(1);
}

async function createBackup() {
  try {
    console.log("========================================");
    console.log("   SHIVSHAMBHO DATABASE BACKUP");
    console.log("========================================");

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const now = new Date();

    const timestamp = now
      .toISOString()
      .replace(/T/, "_")
      .replace(/:/g, "-")
      .replace(/\..+/, "");

    const backupPath = path.join(
      BACKUP_DIR,
      `mongodb-backup-${timestamp}`
    );

    console.log(`📁 Backup location: ${backupPath}`);
    console.log("⏳ Starting MongoDB backup...");

    const args = [
      `--uri=${MONGO_URI}`,
      `--out=${backupPath}`,
      "--gzip",
    ];

    await execFileAsync("mongodump", args);

    console.log("✅ MongoDB backup completed successfully.");
    console.log(`📦 Backup created at: ${backupPath}`);

    // Verify backup exists and contains files
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup directory was not created.");
    }

    const collections = fs.readdirSync(backupPath);

    if (collections.length === 0) {
      throw new Error("Backup directory is empty.");
    }

    console.log(`📊 Backup contains ${collections.length} database item(s).`);
    console.log("========================================");
    console.log("✅ BACKUP SUCCESSFUL");
    console.log("========================================");

  } catch (error) {
    console.error("========================================");
    console.error("❌ BACKUP FAILED");
    console.error("========================================");

    if (error.code === "ENOENT") {
      console.error(
        "mongodump was not found on this computer."
      );
      console.error(
        "Install MongoDB Database Tools and make sure mongodump is in PATH."
      );
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

createBackup();