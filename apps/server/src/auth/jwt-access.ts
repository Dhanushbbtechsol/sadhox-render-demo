/** Access tokens are HMAC only. Verify must reject every other alg, including `none`. */
export const JWT_ACCESS_ALGORITHM = "HS256" as const;

export const JWT_ACCESS_SIGN_OPTIONS = {
  expiresIn: "15m" as const,
  algorithm: JWT_ACCESS_ALGORITHM,
};

export const JWT_ACCESS_VERIFY_OPTIONS = {
  algorithms: [JWT_ACCESS_ALGORITHM],
};
