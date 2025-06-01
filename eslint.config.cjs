// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("eslint/config");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const globals = require("globals");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tsParser = require("@typescript-eslint/parser");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const parser = require("astro-eslint-parser");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const js = require("@eslint/js");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },

      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {},
    },

    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:astro/recommended",
      "plugin:astro/jsx-a11y-recommended",
      "prettier"
    ),

    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
  },
  {
    files: ["**/*.astro"],

    languageOptions: {
      parser: parser,

      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
    },

    rules: {},
  },
  {
    files: ["**/*.ts"],
    rules: {},
  },
]);
