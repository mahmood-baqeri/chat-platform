import { runMySQLMigrations } from "./mysql.js";

async function main() {
  console.log("🚀 Starting MySQL Database Migration...");
  const success = await runMySQLMigrations();
  if (success) {
    console.log("🎉 MySQL Database successfully migrated and ready!");
    process.exit(0);
  } else {
    console.error("❌ MySQL Migration Failed.");
    process.exit(1);
  }
}

main();
