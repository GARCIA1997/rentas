import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'uploads/**', 'prisma/migrations/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // El backend arroja objetos planos { status, message } como errores de dominio,
      // que el errorHandler traduce a respuestas HTTP. No es el patrón por defecto de
      // ESLint, pero es el que usa todo el servicio.
      'no-throw-literal': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
