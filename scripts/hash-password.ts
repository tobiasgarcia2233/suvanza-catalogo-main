import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

async function main() {
  let password = process.argv[2];
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password: ");
    rl.close();
  }
  if (!password || password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log("\nPegá este hash en .env.local como ADMIN_PASSWORD_HASH:\n");
  console.log(hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
