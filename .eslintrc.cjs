module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:editorconfig/all'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'editorconfig'],
    root: true,

    env: {
        node: true,
    },

    ignorePatterns: ["dist/**", "**/output/**"],

    rules: {
        // These exceptions are only here because this is a library
        "@typescript-eslint/no-explicit-any": ["off"],
        "@typescript-eslint/no-empty-function": ["off"],
        "@typescript-eslint/ban-types": ["off"],

        // This allows us to use '_' in place of unused variables
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "_",
                varsIgnorePattern: "_",
            },
        ],

        // Rest of the rules are styling rules
        "max-len": ["error", { "code": 160 }],
        "curly": ["error", "all"],
        "semi": ["error", "always"],
        "comma-dangle": ["error", "always-multiline"],

        "brace-style": ["error", "stroustrup"],
        "no-trailing-spaces": "error",
        "eol-last": ["error", "always"],
        "object-curly-newline": ["error", { "consistent": true }],
    },
};
