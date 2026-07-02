import js from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";

export default [
    js.configs.recommended,

    {
        files: ["src/**/*.js"],
        plugins: {
            "@stylistic": stylistic,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "@stylistic/indent": ["error", 4],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/space-before-blocks": "error",
            "@stylistic/keyword-spacing": "error",

            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-unused-vars": ["warn", { caughtErrors: "none" }],
            "no-var": "error",
            "prefer-const": "error",
        },
    },

    {
        ignores: ["node_modules/**", "css/**", "assets/**"],
    },
];