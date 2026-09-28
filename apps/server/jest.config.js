/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.spec.json",
        useESM: false,
      },
    ],
  },
  collectCoverageFrom: ["src/**/*.(t|j)s", "!src/emails/**", "!src/lib/**"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/src/test/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@nestjs/swagger$": "<rootDir>/src/test/swagger-mock.ts",
  },
};
