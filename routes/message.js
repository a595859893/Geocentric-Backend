const { uniqueId, getToken, passwordHash } = require('../utils/uniqueId');
const mysqlUtils = require('../utils/mysqlUtils');
const { checkToken } = require('./validate')
const ERROR = require('../error')

const express = require('express');
const router = express.Router();


// 获取附近的消息
// userId(string):尝试获取消息的用户ID
// loc({log(float),lat(float)}):想要获取消息位置的经纬度
router.post('/get', async function (req, res, next) {
    const { loc, period, zoomLevel } = req.body;
    if (!loc || !period || !zoomLevel) {
        return res.json(ERROR.PARSE_FAIL)
    }
    const { start, end } = period;
    const { log, lat } = loc;
    if (typeof log != "number" ||
        typeof lat != "number" ||
        typeof zoomLevel != 'number' ||
        typeof start == "undefined" ||
        typeof end == "undefined"
    ) {
        return res.json(ERROR.PARSE_FAIL)
    }

    let range = 512 / Math.pow(2, zoomLevel);
    let startDate = new Date();
    let endDate = new Date();
    startDate.setTime(startDate.getTime() + start);
    endDate.setTime(endDate.getTime() + end);
    try {
        let { results } = await mysqlUtils.queryAsync(req, {
            sql: "SELECT msgId,userId,loc,msg,zoomLevel,good,sendtime FROM message" +
                " WHERE (st_distance(loc,POINT(?,?))<?) AND (sendTime BETWEEN ? AND ?) AND zoomLevel < (? + 0.5)" +
                " ORDER BY good DESC",
            values: [log, lat, range, startDate, endDate, zoomLevel],
            timeout: 100, // 0.1s
        });
        let respons = { ok: true, code: 0, results };
        return res.json(respons);
    } catch (e) {
        return res.json(ERROR.MYSQL_FAIL);
    }
});

router.use(checkToken);

// 发送消息
// userId(string):发送的消息用户ID
// loc({log(float),lat(float)}):发送的经纬度
// msg(string):发送的消息文本
router.post('/send', async function (req, res, next) {
    const { userId } = req;
    const { loc, msg } = req.body;
    const { log, lat } = loc;
    console.log(req.body)
    let zoomLevel = req.body.zoomLevel || 10.0;
    if (!loc || !msg) {
        return res.json(ERROR.PARSE_FAIL)
    }

    let msgId = uniqueId({ msg, userId }, 31);
    let conn = await mysqlUtils.getConnection(req);

    try {
        await new Promise(function (resolve, reject) {
            conn.beginTransaction(function (err) {
                return err ? reject({ conn, err }) : resolve(conn);
            })
        })
        await new Promise(function (resolve, reject) {
            conn.query("INSERT INTO message (msgId,userId,loc,msg,zoomLevel,sendtime)" +
                " VALUES(?,?,POINT(?,?),?,?,?)",
                [msgId, userId, log, lat, msg, zoomLevel, new Date()],
                (err, rows) => {
                    if (err) {
                        return reject({ conn, err });
                    }
                    if (rows.length > 0) {
                        return reject({ conn, err: ERROR.ACCOUNT_EXIST })
                    }
                    return resolve(conn);
                })
        })
        await new Promise(function (resolve, reject) {
            let disId = uniqueId({ msg, msgId, userId }, 31);
            conn.query("INSERT INTO discuss (disId,msgId,userId,content,timestamp)" +
                " VALUES(?,?,?,?,?)",
                [disId, msgId, userId, msg, new Date()],
                (err, rows) => {
                    if (err) {
                        return reject({ conn, err });
                    }
                    if (rows.length > 0) {
                        return reject({ conn, err: ERROR.ACCOUNT_EXIST })
                    }
                    return resolve(conn);
                })
        })
        await new Promise(function (resolve, reject) {
            conn.commit(function (err) {
                if (err) {
                    return reject(err)
                }

                conn.release();
                res.json({ ok: true, code: 0 });
                return resolve();
            });
        })
    } catch (err) {
        conn.rollback();
        console.log(err)
        return res.json(ERROR.MYSQL_FAIL);
    }

});
module.exports = router;
