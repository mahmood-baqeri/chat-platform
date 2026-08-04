import fs from "fs";
import path from "path";

console.log("=========================================");
console.log("🌱 Seeding Production Database Initial Records...");
console.log("=========================================");

export const SEED_SQL = `
-- Seed Default Admin User
INSERT OR IGNORE INTO users (id, phone, username, first_name, last_name, display_name, avatar_url, bio, status, role)
VALUES (
  'user-1',
  '09121111111',
  'ali_rezaei',
  'علی',
  'رضایی',
  'علی رضایی (مدیر ارشد)',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'توسعه‌دهنده سیستم‌های توزیع‌شده | علاقه‌مند به هوش مصنوعی',
  'online',
  'owner'
);

-- Seed System Settings
INSERT OR IGNORE INTO system_settings (id, registration_enabled, login_enabled, otp_enabled, channels_enabled, groups_enabled, max_file_size_mb)
VALUES (1, 1, 1, 1, 1, 1, 25);
`;

async function runSeed() {
  try {
    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const seedFile = path.join(dbDir, "seed.sql");
    fs.writeFileSync(seedFile, SEED_SQL, "utf-8");
    console.log("✅ Seed execution completed successfully!");
    console.log("📁 Seed SQL saved to:", seedFile);
    console.log("=========================================");
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

runSeed();
