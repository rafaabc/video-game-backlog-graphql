module.exports = {
  spec: 'test/**/*.test.js',
  timeout: 10000,
  require: ['dotenv/config', 'test/hooks/auth.js'],
};
