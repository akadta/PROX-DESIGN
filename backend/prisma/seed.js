const adminSeeder = require("./seeders/adminSeeder");

async function main() {
  console.log("Running Seeders...\n");

  await adminSeeder();

  console.log("\nAll Seeders Completed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
