const { getToken } = require('../utils/uniqueId');
const mysqlUtils = require('../utils/mysqlUtils');
const ERROR = require('../error')

async function checkToken(req, res, next) {
    if (req.method != "POST") {
        return next();
    }

    if (req.body.userId && req.body.userId == "anonymous") {
        req.userId = "anonymous"
        return next();
    }

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
}


module.exports = {
    checkToken
}