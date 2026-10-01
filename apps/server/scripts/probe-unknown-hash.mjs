import "dotenv/config";
import { createHash } from "crypto";
import postgres from "postgres";

const target =
  "486f350a8a9eb71de0f682d172bdbca2d33aa9a8d42b6377b36afc2f1d6e0797";

const candidates = [
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" numeric;',
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" numeric;\n',
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" numeric;--> statement-breakpoint\n',
  'ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "purchase_cost" numeric;',
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" double precision;',
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" integer;',
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" decimal;',
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" numeric(12,2);',
  'ALTER TABLE "assets" ADD COLUMN "purchase_cost" money;',
  `-- assets.purchase_cost\nALTER TABLE "assets" ADD COLUMN "purchase_cost" numeric;`,
];

for (const c of candidates) {
  const h = createHash("sha256").update(c).digest("hex");
  console.log(h === target ? "MATCH" : "no", JSON.stringify(c).slice(0, 80), h.slice(0, 12));
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8 });
const col = await sql`
  select column_name, data_type, numeric_precision, numeric_scale, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'assets' and column_name = 'purchase_cost'
`;
console.log("purchase_cost def", col);
await sql.end({ timeout: 2 });
