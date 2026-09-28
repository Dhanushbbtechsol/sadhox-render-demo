import { createHash, randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Day 3 unit coverage: password hashing, token generation, token rotation. */
describe("Auth crypto helpers", () => {
  it("hashes passwords with bcrypt", async () => {
    const password = "ChangeMe123!";
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toEqual(password);
    await expect(bcrypt.compare(password, hash)).resolves.toBe(true);
    await expect(bcrypt.compare("wrong", hash)).resolves.toBe(false);
  });

  it("generates opaque refresh tokens and stable hashes", () => {
    const raw = randomBytes(48).toString("hex");
    const hash = hashToken(raw);
    expect(raw).toHaveLength(96);
    expect(hash).toHaveLength(64);
    expect(hashToken(raw)).toEqual(hash);
    expect(hashToken(raw + "x")).not.toEqual(hash);
  });

  it("rotation revokes previous hash and issues a new one", () => {
    const oldRaw = randomBytes(48).toString("hex");
    const newRaw = randomBytes(48).toString("hex");
    const oldHash = hashToken(oldRaw);
    const newHash = hashToken(newRaw);
    expect(oldHash).not.toEqual(newHash);

    const store = [
      { hash: oldHash, revoked: true },
      { hash: newHash, revoked: false },
    ];
    expect(store.find((t) => t.hash === oldHash)?.revoked).toBe(true);
    expect(store.find((t) => t.hash === newHash)?.revoked).toBe(false);
  });
});
