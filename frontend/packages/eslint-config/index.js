module.exports = {
    env: {
        amd: true,
        browser: true,
        node: true,
    },
    extends: [
        'plugin:jsx-a11y/recommended',
        'standard',
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'plugin:perfectionist/recommended-natural-legacy',
    ],
    ignorePatterns: ['vite-env.d.ts', 'node_modules/', 'dist/'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: '2020',
        sourceType: 'module',
    },
    plugins: ['react', '@typescript-eslint', 'prettier', 'jsx-a11y', 'perfectionist'],
    root: true,
    rules: {
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-use-before-define': 'off',
        'no-use-before-define': 'off',
        'perfectionist/sort-imports': [
            'error',
            {
                order: 'asc',
                type: 'natural',
            },
        ],
        'perfectionist/sort-variable-declarations': [
            'error',
            {
                ignoreCase: true,
                order: 'asc',
                type: 'natural',
            },
        ],
        'prettier/prettier': [
            'error',
            {
                arrowParens: 'always',
                bracketSpacing: false,
                printWidth: 120,
                singleAttributePerLine: true,
                singleQuote: true,
                tabWidth: 4,
                trailingComma: 'all',
            },
        ],
        'react/no-unescaped-entities': 'off',
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
                paths: ['src'],
            },
        },
        react: {
            version: 'detect',
        },
    },
};
