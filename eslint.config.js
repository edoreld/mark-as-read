import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: ["dist/", "node_modules/"]
    },
    js.configs.recommended,
    {
        files: ["markasread/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.serviceworker,
                chrome: "readonly"
            }
        }
    },
    {
        files: ["tests/**/*.js", "scripts/**/*.js", "*.config.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.node
        }
    }
];
