import mgolConfig from 'eslint-config-mgol';
import globals from 'globals';

export default [
    {
        ignores: ['node_modules/**'],
    },

    ...mgolConfig,

    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
    },

    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.mocha,
            },
        },
    },
];
