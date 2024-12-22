const bodyParser = require('koa-bodyparser');

module.exports = bodyParser({
  enableTypes: ['json', 'form'],
  jsonLimit: '5mb',
  formLimit: '5mb',
});
