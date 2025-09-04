const auth = require('./auth');
const validation = require('./validation');
const upload = require('./upload');
const errorHandler = require('./errorHandler');

module.exports = {
  ...auth,
  ...validation,
  ...upload,
  errorHandler
};