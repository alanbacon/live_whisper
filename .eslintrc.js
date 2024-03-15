module.exports = {
  parser: "@typescript-eslint/parser",
  env: {
    node: true,
    browser: false,
    commonjs: false,
    es2021: true,
  },
  plugins: ["@typescript-eslint/eslint-plugin"],
  extends: "eslint:recommended",
  overrides: [],
  parserOptions: {
    ecmaVersion: "latest",
  },
  rules: {},
  engines: {
    node: ">=12.13.0",
  },
};
