// module import
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');

// Router
var indexRouter = require('./router/index');
var userRouter = require('./router/user');
var supporterRouter = require('./router/supporter');

var app = express();

app.use(session({
  secret: '@#@$MYSIGN#@$#$',
  resave: false,
  saveUninitialized: true,
}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*로그인 강제하도록*/
app.use((req, res, next) => {
  if (req.url.startsWith('/user') &&
  req.session.user === undefined &&
  req.url !== '/user/loginCheck' && req.url !== '/user/login/callback/') {
    console.log('app.js: user is undefined. ' + req.url);
    req.originalUrl = '/user/login';
    req.url = '/user/login';
  }
  next();
});

/*로그인 기능 사용하지 않을 때*/
/*app.use((req, res, next) => {
  req.session.user = 'test';
  next();
});*/

app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/supporter', supporterRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error.html');
});

module.exports = app;
