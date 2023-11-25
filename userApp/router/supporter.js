var express = require('express');
var router = express.Router();
var supporterService = require('./supporter_service');

/* GET supporters listing. */
// 서포터(상담사)용 모바일 웹 화면 매핑
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/service/chat', function (req, res) {
  res.render('chat_supporter.html')
});
router.get('/rooms', function (req, res) {
  res.render('index.html');
});
router.get('/chatHistory', function (req, res) {
  res.render('index.html');
});
router.get('/gcs', supporterService.getGCSPage);

module.exports = router;
