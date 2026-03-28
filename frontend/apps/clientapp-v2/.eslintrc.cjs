module.exports = {
  extends: ["@easy/eslint-config"],
  ignorePatterns: ["node_modules", "dist", "dev-dist", "ios", "android", "capacitor.config.ts"],
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
};
