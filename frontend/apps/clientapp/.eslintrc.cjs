module.exports = {
  root: true,
  extends: ["@easy/eslint-config"],
  parserOptions: {
    parser: "@typescript-eslint/parser",
    tsconfigRootDir: __dirname,
    project: ["tsconfig.app.json", "tsconfig.node.json"],
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: "module",
  },
  ignorePatterns: ["node_modules", "dist", "dev-dist"],
  rules: {
    camelcase: ["off"],
  },
};
