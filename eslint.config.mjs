// ESLint flat config for Recomp.
//
// The app is plain browser ES modules with Node test files, so this config
// deliberately has no plugins or shared presets: it depends only on `eslint`.
// The rules are the correctness-focused core of `eslint:recommended`, i.e. the
// ones that catch real bugs (unreachable code, duplicate keys, bad typeof
// checks, reassigned constants) rather than style.
//
// `no-unused-vars` is a warning, not an error, for now: several existing tests
// assert on the source text of app.js, so dead code there is tidied up in
// separate, focused changes rather than as part of the CI setup.
// `no-undef` is not enabled yet because it needs a full list of browser,
// service-worker and Node globals; that is a sensible next step.

const errors = Object.fromEntries([
  'constructor-super', 'for-direction', 'getter-return', 'no-async-promise-executor',
  'no-case-declarations', 'no-class-assign', 'no-compare-neg-zero', 'no-cond-assign',
  'no-const-assign', 'no-constant-binary-expression', 'no-constant-condition',
  'no-control-regex', 'no-debugger', 'no-delete-var', 'no-dupe-args',
  'no-dupe-class-members', 'no-dupe-else-if', 'no-dupe-keys', 'no-duplicate-case',
  'no-empty-character-class', 'no-empty-pattern', 'no-ex-assign', 'no-extra-boolean-cast',
  'no-fallthrough', 'no-func-assign', 'no-global-assign', 'no-import-assign',
  'no-invalid-regexp', 'no-irregular-whitespace', 'no-loss-of-precision',
  'no-misleading-character-class', 'no-new-native-nonconstructor', 'no-nonoctal-decimal-escape',
  'no-obj-calls', 'no-octal', 'no-prototype-builtins', 'no-redeclare', 'no-regex-spaces',
  'no-self-assign', 'no-setter-return', 'no-shadow-restricted-names', 'no-sparse-arrays',
  'no-this-before-super', 'no-unreachable', 'no-unsafe-finally', 'no-unsafe-negation',
  'no-unsafe-optional-chaining', 'no-unused-labels', 'no-useless-backreference',
  'no-useless-catch', 'no-useless-escape', 'no-with', 'require-yield', 'use-isnan',
  'valid-typeof',
].map((rule) => [rule, 'error']));

export default [
  {
    ignores: ['node_modules/**', 'android/**', 'coverage/**', '**/*.min.js'],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...errors,
      // Empty catch blocks are used on purpose for best-effort storage and
      // platform calls; other empty blocks are still errors.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { caughtErrors: 'none', argsIgnorePattern: '^_' }],
    },
  },
];
