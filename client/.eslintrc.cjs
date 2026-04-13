module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'public'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/jsx-no-target-blank': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off', // Bỏ qua bắt buộc khai báo PropTypes vì ta ko dùng TS
    'no-unused-vars': 'warn',  // Khai báo biến mà quên dùng sẽ báo vàng (Warning)
    'react-hooks/exhaustive-deps': 'warn' // Cảnh báo thiếu dependencies trong useEffect
  },
}
