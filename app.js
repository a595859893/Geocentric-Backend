const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mysql = require('mysql');
const { MYSQL_POOL_OPTIONS, DEBUG } = require('./config');

let pool = mysql.createPool(MYSQL_POOL_OPTIONS);
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const messageRouter = require('./routes/message');
const discussRouter = require('./routes/discuss');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    req.mysql = pool;
    res.setHeader("Access-Control-Allow-Headers", "content-type")
    // CORS debugging
    if (DEBUG) {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080")
    } else {
        res.setHeader("Access-Control-Allow-Origin", "https://geo.littlehumming.cn:3001")
    }
    next();
});
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/message', messageRouter);
app.use('/discuss', discussRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    console.log("???")
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    function getClientIP(req) {
        return req.headers['x-forwarded-for'] || // 判断是否有反向代理 IP
            req.connection.remoteAddress || // 判断 connection 的远程 IP
            req.socket.remoteAddress || // 判断后端的 socket 的 IP
            req.connection.socket.remoteAddress;
    };
    console.log(getClientIP(req));

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
