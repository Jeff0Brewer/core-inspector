module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
        'standard'
    ],
    ignorePatterns: ['dist'],
    parser: '@typescript-eslint/parser',
    plugins: ['react-refresh'],
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        indent: ['error', 4, { SwitchCase: 1 }],
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
}
