import bodyParser from 'koa-bodyparser';

export default bodyParser({
  enableTypes: ['json', 'form'],
  jsonLimit: '5mb',
  formLimit: '5mb',
  textLimit: '5mb'
});
