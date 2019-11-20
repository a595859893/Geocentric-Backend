const { uniqueId } = require('../utils/uniqueId');
const mysqlUtils = require('../utils/mysqlUtils');
const express = require('express');
const router = express.Router();

const ERROR = {
    PARSE_FAIL: { code: 10001, msg: "Param parse fail" },
    MYSQL_FAIL: { code: 20001, msg: "Connect SQL fail" }
}

// 发送消息
// userId(string):发送的消息用户ID
// loc({log(float),lat(float)}):发送的经纬度
// msg(string):发送的消息文本
router.get('/send', async function (req, res, next) {
    try {
        const { userId, loc, msg } = req.body;
        const { log, lat } = loc;

        let msgId = uniqueId({ msg, userId }, 31);

        try {
            let { results } = await mysqlUtils.queryAsync(req, {
                sql: "INSERT INTO message (msgId,userId,loc,msg) VALUES(?,?,POINT(?,?),?)",
                values: [msgId, userId, log, lat, msg],
                timeout: 1000, // 1s
            });
            return res.json({ ok: true, code: 0 });
        } catch (err) {
            console.log(err)
            return res.json(ERROR.MYSQL_FAIL);
        }
    } catch (err) {
        console.log(err)
        return res.json(ERROR.PARSE_FAIL);
    }
});


// 获取附近的消息
// userId(string):尝试获取消息的用户ID
// loc({log(float),lat(float)}):想要获取消息位置的经纬度
// range(float):获取消息的范围
router.get('/get', async function (req, res, next) {
    const { userId, loc, range } = req.body;
    const { log, lat } = loc;
    try {
        let { results } = await mysqlUtils.queryAsync(req, {
            sql: "SELECT userId,loc,msg FROM message WHERE st_distance(loc,POINT(?,?))>?",
            values: [log, lat, range],
            timeout: 1000, // 1s
        });
        console.log(results);
        let respons = { ok: true, code: 0, ...results };
        return res.json(respons);
    } catch (e) {
        return res.json(ERROR.MYSQL_FAIL);
    }
});


module.exports = router;
