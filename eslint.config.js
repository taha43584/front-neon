// @ts-check
// Vérification du code Angular (A-10) : `npm run lint` (= ng lint). Objectif : aucune erreur, aucun avertissement.
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    // Les gabarits écrits DANS les fichiers .ts (template: `…`) sont aussi vérifiés
    processor: angular.processInlineTemplates,
    rules: {
      // Préfixe « app » pour tous les composants et directives (app-icon, appReveal…)
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      // Les pages sont nommées « …Page » (HomePage, CatalogPage) : suffixe Component ou Page accepté
      '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component', 'Page'] }],
      // OnPush partout (règle du plan A-10)
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      // Variables inutilisées : erreur, sauf celles qui commencent par « _ » (paramètres imposés)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
);
