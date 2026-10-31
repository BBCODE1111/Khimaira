import globals from 'globals';
export default [
 {ignores:['plugin/**','dist/music-core.js','dist/piano-motion*.js','dist/piano-pedal.js','**/fixtures/**','docs/**','node_modules/**']},
 {files:['**/*.{js,mjs,cjs}'],languageOptions:{ecmaVersion:'latest',globals:{...globals.browser,...globals.node}},rules:{
  'constructor-super':'error','for-direction':'error','getter-return':'error','no-async-promise-executor':'error',
  'no-class-assign':'error','no-compare-neg-zero':'error','no-cond-assign':['error','except-parens'],'no-const-assign':'error',
  'no-dupe-args':'error','no-dupe-class-members':'error','no-dupe-else-if':'error','no-dupe-keys':'error',
  'no-duplicate-case':'error','no-ex-assign':'error','no-func-assign':'error','no-new-native-nonconstructor':'error',
  'no-promise-executor-return':'error','no-self-assign':'error','no-sparse-arrays':'error','no-unreachable':'error',
  'no-unsafe-finally':'error','use-isnan':'error','valid-typeof':'error','no-undef':'error'
 }},
 {files:['**/*.cjs'],languageOptions:{sourceType:'commonjs'}}
];
