module.exports = {
  extends: [
    'eslint-config-alloy/typescript',
  ],
  globals: {
    // 这里填入你的项目需要的全局变量
    // 这里值为 false 表示这个全局变量不允许被重新赋值，比如：
    //
    // jQuery: false,
    // $: false
  },
  rules: {
    'eqeqeq': [
      'error',
      'always',
      {
        null: 'ignore'
      }
    ],
    'typescript/class-name-casing': 'error',
    'indent': [
      'error',
      2,
      {
        SwitchCase: 1,
        flatTernaryExpressions: true
      }
    ]
  }
};