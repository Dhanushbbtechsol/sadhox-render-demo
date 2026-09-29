import bcrypt from "bcryptjs";
import postgres from "postgres";
import { randomBytes } from "crypto";
import { writeFileSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pwd = `Sx-${randomBytes(18).toString("base64url")}!9A`;
const hash = await bcrypt.hash(pwd, 12);
const sql = postgres(url, { max: 1 });
await sql`
  update users
  set password_hash = ${hash}
  where email in (
    'admin@sadhox.local',
    'agent@sadhox.local',
    'user@sadhox.local'
  )
`;
await sql.end();
writeFileSync(".seed-password", pwd, { mode: 0o600 });
console.log("PASSWORD_RESET_OK");
