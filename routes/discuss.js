const { uniqueId, getToken, passwordHash } = require('../utils/uniqueId');
const mysqlUtils = require('../utils/mysqlUtils');
const { checkToken } = require('./validate')
const ERROR = require('../error')

const express = require('express');
const router = express.Router();



// 获取附近的消息
router.post('/get', async function (req, res, next) {
    const { msgId } = req.body;
    if (!msgId) {
        return res.json(ERROR.PARSE_FAIL)
    }

    try {
        let { results } = await mysqlUtils.queryAsync(req, {
            sql: "SELECT disId,msgId,userId,content,timestamp FROM discuss" +
                " WHERE msgId=?" +
                " ORDER BY timestamp DESC",
            values: [msgId],
            timeout: 100, // 0.1s
        });
        let respons = { ok: true, code: 0, results };
        return res.json(respons);
    } catch (err) {
        console.log(err)
        return res.json(ERROR.MYSQL_FAIL);
    }
});

// 获取附近的消息(有限制)
router.post('/getlimit', async function (req, res, next) {
    const { msgId, limit } = req.body;
    if (!msgId || !limit) {
        return res.json(ERROR.PARSE_FAIL)
    }
    if (typeof limit !== 'number') {
        return res.json(ERROR.PARSE_FAIL)
    }

    try {
        let { results } = await mysqlUtils.queryAsync(req, {
            sql: "SELECT disId,msgId,userId,content,timestamp FROM discuss" +
                " WHERE msgId=?" +
                " ORDER BY timestamp DESC LIMIT ?",
            values: [msgId, limit],
            timeout: 100, // 0.1s
        });
        let respons = { ok: true, code: 0, results };
        return res.json(respons);
    } catch (err) {
        console.log(err)
        return res.json(ERROR.MYSQL_FAIL);
    }
});

router.use(checkToken);

// 发送消息
// userId(string):发送的消息用户ID
// loc({log(float),lat(float)}):发送的经纬度
// msg(string):发送的消息文本
router.post('/send', async function (req, res, next) {
    console.log(req.body)

    const { msgId, content } = req.body;
    const { userId } = req;

    if (!msgId || !content) {
        return res.json(ERROR.PARSE_FAIL)
    }

    let disId = uniqueId({ msgId, userId, content }, 31);
    try {
        await mysqlUtils.queryAsync(req, {
            sql: "INSERT INTO discuss (disId,msgId,userId,content,timestamp)" +
                " VALUES(?,?,?,?,?)",
            values: [disId, msgId, userId, content, new Date()],
            timeout: 1000, // 1s
        });
        return res.json({ ok: true, code: 0 });
    } catch (err) {
        console.log(err)
        return res.json(ERROR.MYSQL_FAIL);
    }

});
module.exports = router;
