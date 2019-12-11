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
    // CORS debugging
    if (DEBUG) {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080")
    }
    next();
});
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/message', messageRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
