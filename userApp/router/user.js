var express = require('express');
var router = express.Router();
var User = require('../../models').user_info;
var userService = require('./user_service');

/* GET home page. */
// 홈화면 (엔터테이먼트, AI ..)
router.get('/', userService.getHome);
// 서비스 리스트 (팬심, AI서비스(마인즈랩)...)
router.get('/services/:topCategory', userService.getServiceList);
// 서비스의 홈 (팬심의 홈)
router.get('/service/home/:service', userService.getServiceHome);

router.post('/service/category/faq', userService.getCategoryFaq);

// 채팅 리스트
router.get('/service/chat/list', userService.getChatList);

router.post('/service/chat/insertSession', userService.insertSession);

// 설정 화면
router.get('/service/setting', userService.getSetting);

// 로그인 화면
router.get('/login', userService.login);

// 로그인 확인
router.post('/loginCheck', userService.loginCheck);

// 로그아웃
router.get('/logout', userService.logout);

// 채팅 화면
router.post('/service/chat', userService.getSessionInfo);

// 채팅 종료 session 업데이트
router.post('/service/chat/updateSession', userService.updateSession);

router.get('/service/chat/grade', function (req, res) {
  res.render('index.html');
});

router.get('/chatHistory', function (req, res) {
  res.render('index.html');
});

router.get('/login/callback', function (req, res) {
  res.render('callback.html')
});
router.get('/chat', async(req, res, next) =>{
  res.render('chat_user.html')
});

module.exports = router;
