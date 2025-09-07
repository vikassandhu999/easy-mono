module.exports = {
  extends: ['@easy/eslint-config'],
  parserOptions: {
    parserOptions: { tsconfigRootDir: __dirname },
  },
  ignorePatterns: ['node_modules', 'dist'],
};
