module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended'
    ],
    plugins: ['@typescript-eslint'],
    rules: {
      'camelcase': ['error', { properties: 'always' }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase']
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE']
        },
        {
          selector: 'parameter',
          format: ['camelCase']
        },
        {
          selector: 'property',
          format: ['camelCase']
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        }
      ]
    }
  };