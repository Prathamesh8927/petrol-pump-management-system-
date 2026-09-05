import "dotenv/config";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import readline from "readline";
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

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function restoreDatabase() {
  try {
    console.log("========================================");
    console.log("   SHIVSHAMBHO DATABASE RESTORE");
    console.log("========================================");

    if (!fs.existsSync(BACKUP_DIR)) {
      console.error("❌ Backup directory does not exist.");
      console.error(`Expected: ${BACKUP_DIR}`);
      process.exit(1);
    }

    const backups = fs
      .readdirSync(BACKUP_DIR)
      .filter((item) =>
        fs.statSync(path.join(BACKUP_DIR, item)).isDirectory()
      )
      .sort()
      .reverse();

    if (backups.length === 0) {
      console.error("❌ No backups found.");
      process.exit(1);
    }

    console.log("\nAvailable backups:\n");

    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup}`);
    });

    console.log("");

    const selection = await askQuestion(
      "Enter backup number to restore: "
    );

    const selectedIndex = Number(selection) - 1;

    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= backups.length
    ) {
      console.error("❌ Invalid backup selection.");
      process.exit(1);
    }

    const selectedBackup = backups[selectedIndex];

    const backupPath = path.join(
      BACKUP_DIR,
      selectedBackup
    );

    console.log("");
    console.log(`Selected backup: ${selectedBackup}`);
    console.log(`Location: ${backupPath}`);
    console.log("");

    console.log("⚠️ WARNING");
    console.log(
      "This operation will replace existing database data."
    );
    console.log(
      "Make sure you have a current backup before continuing."
    );
    console.log("");

    const confirmation = await askQuestion(
      'Type "RESTORE" to continue: '
    );

    if (confirmation.trim() !== "RESTORE") {
      console.log("❌ Restore cancelled.");
      process.exit(0);
    }

    console.log("");
    console.log("⏳ Restoring MongoDB database...");

    const args = [
      `--uri=${MONGO_URI}`,
      `--dir=${backupPath}`,
      "--gzip",
      "--drop",
    ];

    await execFileAsync("mongorestore", args);

    console.log("");
    console.log("========================================");
    console.log("✅ DATABASE RESTORE SUCCESSFUL");
    console.log("========================================");
    console.log(`Restored from: ${selectedBackup}`);

  } catch (error) {
    console.error("========================================");
    console.error("❌ DATABASE RESTORE FAILED");
    console.error("========================================");

    if (error.code === "ENOENT") {
      console.error(
        "mongorestore was not found on this computer."
      );
      console.error(
        "Install MongoDB Database Tools and make sure mongorestore is in PATH."
      );
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

restoreDatabase();