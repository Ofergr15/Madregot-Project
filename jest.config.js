/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      roots: ["<rootDir>/src"],
      testMatch: [
        "<rootDir>/src/__tests__/lib/**/*.spec.ts",
        "<rootDir>/src/__tests__/api/**/*.spec.ts",
      ],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.json",
          },
        ],
      },
    },
    {
      displayName: "components",
      testEnvironment: "jsdom",
      roots: ["<rootDir>/src"],
      testMatch: ["<rootDir>/src/__tests__/components/**/*.spec.tsx"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.json",
          },
        ],
      },
      setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
    },
  ],
};

module.exports = config;
