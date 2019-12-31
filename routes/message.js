const { uniqueId, getToken, passwordHash } = require('../utils/uniqueId');
const mysqlUtils = require('../utils/mysqlUtils');
const express = require('express');
const router = express.Router();

const ERROR = {
    PARSE_FAIL: { code: 10001, msg: "Param parse fail" },
    MYSQL_FAIL: { code: 20001, msg: "Connect SQL fail" },
    ACCOUNT_EXIST: { code: 30001, msg: "Account exist" },
    ACCOUNT_NOT_EXIST: { code: 30002, msg: "Account not exist" },
    TOKEN_INVALID: { code: 30004, msg: "Token is invalid" }
}


// 获取附近的消息
// userId(string):尝试获取消息的用户ID
// loc({log(float),lat(float)}):想要获取消息位置的经纬度
router.post('/get', async function (req, res, next) {
    const { loc, period, zoomLevel } = req.body;

    if (!loc || !period || !zoomLevel) {
        return res.json(ERROR.PARSE_FAIL)
    }

    if (typeof zoomLevel != 'number') {
        return res.json(ERROR.PARSE_FAIL)
    }

    const { log, lat } = loc;
    const { start, end } = period;

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

router.use(
    async function chekcToken(req, res, next) {
        const { account, token, date } = req.body;
        if (!account || !token || !date) {
            return res.json(ERROR.PARSE_FAIL);
        }

        try {
            let { results } = await mysqlUtils.queryAsync(req, {
                sql: "SELECT account,passHash,userId FROM user WHERE account=?",
                values: [account],
                timeout: 100, // 0.1s
            });

            if (results.length == 0) { return res.json(ERROR.ACCOUNT_NOT_EXIST); }
            if (getToken(account, results[0].passHash, date) != token) {
                return res.json(ERROR.TOKEN_INVALID);
            }

            req.userId = results[0].userId;
            next();
        } catch (e) {
            console.log(e);
            return res.json(ERROR.MYSQL_FAIL);
        }
    })

// 发送消息
// userId(string):发送的消息用户ID
// loc({log(float),lat(float)}):发送的经纬度
// msg(string):发送的消息文本
router.post('/send', async function (req, res, next) {
    const { userId } = req;
    const { loc, msg } = req.body;
    const { log, lat } = loc;

    let zoomLevel = req.body.zoomLevel || 10.0;
    if (!loc || !msg) {
        return res.json(ERROR.PARSE_FAIL)
    }

    let msgId = uniqueId({ msg, userId }, 31);

    try {
        await mysqlUtils.queryAsync(req, {
            sql: "INSERT INTO message (msgId,userId,loc,msg,zoomLevel,sendtime)" +
                " VALUES(?,?,POINT(?,?),?,?,?)",
            values: [msgId, userId, log, lat, msg, zoomLevel, new Date()],
            timeout: 1000, // 1s
        });
        return res.json({ ok: true, code: 0 });
    } catch (err) {
        console.log(err)
        return res.json(ERROR.MYSQL_FAIL);
    }

});
module.exports = router;
