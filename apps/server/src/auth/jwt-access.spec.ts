import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import {
  JWT_ACCESS_ALGORITHM,
  JWT_ACCESS_VERIFY_OPTIONS,
} from "./jwt-access";

const secret = "test-access-secret-16";

describe("JWT access algorithm pin", () => {
  it("accepts HS256 and rejects a token signed with another alg", async () => {
    const jwt = new JwtService({
      secret,
      signOptions: { expiresIn: "15m", algorithm: JWT_ACCESS_ALGORITHM },
    });
    const hs256 = jwt.sign({ sub: "user-1" });
    await expect(
      jwt.verifyAsync(hs256, {
        secret,
        algorithms: [...JWT_ACCESS_VERIFY_OPTIONS.algorithms],
      }),
    ).resolves.toMatchObject({ sub: "user-1" });

    const hs384 = jwt.sign(
      { sub: "user-1" },
      { secret, algorithm: "HS384", expiresIn: "15m" },
    );
    await expect(
      jwt.verifyAsync(hs384, {
        secret,
        algorithms: [...JWT_ACCESS_VERIFY_OPTIONS.algorithms],
      }),
    ).rejects.toThrow();
  });
});
