module.exports = {
  extends: ["@easy/eslint-config"],
  ignorePatterns: ["node_modules", "dist", "dev-dist"],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    parser: "@typescript-eslint/parser",
    project: ["tsconfig.app.json", "tsconfig.node.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  root: true,
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    camelcase: ["off"],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/pages/**"],
            message:
              "Use app/features/entities/shared paths instead of legacy pages.",
          },
          {
            group: ["@/components/**"],
            message:
              "Use app/features/entities/shared paths instead of legacy components.",
          },
          {
            group: ["@/api/**"],
            message:
              "Use entities/shared api paths instead of legacy api paths.",
          },
          {
            group: ["@/features/**/../*"],
            message: "Cross-feature relative traversal is not allowed.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["src/features/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/app/**"],
                message: "Features must not import from app.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["src/entities/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/app/**", "@/features/**"],
                message: "Entities must not import from app or features.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["src/shared/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/app/**", "@/features/**", "@/entities/**"],
                message:
                  "Shared layer must not depend on app, features, or entities.",
              },
            ],
          },
        ],
      },
    },
  ],
};
