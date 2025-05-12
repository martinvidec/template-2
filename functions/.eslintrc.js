module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
    ecmaVersion: 2020,
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*",
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2, { "SwitchCase": 1 }],
    "max-len": ["warn", { "code": 120, "ignoreUrls": true, "ignoreStrings": true, "ignoreTemplateLiterals": true, "ignoreComments": true }],
    "object-curly-spacing": ["error", "always"],
    "@typescript-eslint/no-unused-vars": ["warn"],
    "no-trailing-spaces": "warn",
    "padded-blocks": "off",
    "eol-last": ["warn", "always"],
    "comma-dangle": ["warn", "always-multiline"],
    "@typescript-eslint/no-explicit-any": "off",
    "no-multiple-empty-lines": ["warn", { "max": 1, "maxEOF": 0, "maxBOF": 0 }],
    "space-before-function-paren": ["warn", { "anonymous": "always", "named": "never", "asyncArrow": "always" }],
    "keyword-spacing": ["warn", { "before": true, "after": true }],
    "arrow-spacing": ["warn", { "before": true, "after": true }],
    "space-infix-ops": "warn",
  },
  overrides: [
    {
      files: ["*.js"],
      parserOptions: {
        project: null,
      },
      rules: {
        // Optional: Spezifische Regeln für JS-Dateien hier anpassen/deaktivieren
      },
    },
  ],
};
