const { uniqueId, getToken, passwordHash } = require('../utils/uniqueId');
const mysqlUtils = require('../utils/mysqlUtils');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const ERROR = {
    PARSE_FAIL: { code: 10001, msg: "Param parse fail" },
    MYSQL_FAIL: { code: 20001, msg: "Connect SQL fail" },
    ACCOUNT_EXIST: { code: 30001, msg: "Account exist" },
    ACCOUNT_NOT_EXIST: { code: 30002, msg: "Account not exist" },
    WRONG_PASSWORD: { code: 30003, msg: "Password is wrong" },
    TOKEN_INVALID: { code: 30004, msg: "Token is invalid" }
}

function getClientIP(req) {
    return req.headers['x-forwarded-for'] || // 判断是否有反向代理 IP
        req.connection.remoteAddress || // 判断 connection 的远程 IP
        req.socket.remoteAddress || // 判断后端的 socket 的 IP
        req.connection.socket.remoteAddress;
};

router.post('/register', async function (req, res, next) {
    const { account, password } = req.body;
    const ip = getClientIP(req);

    mysqlUtils.getConnection(req).then(conn => new Promise(function (resolve, reject) {
        conn.beginTransaction(function (err) {
            return err ? reject({ conn, err }) : resolve(conn);
        })
    }).then(conn => new Promise(function (resolve, reject) {
        conn.query("SELECT account FROM user WHERE account=?", [account], (err, rows) => {
            if (err) {
                return reject({ conn, err });
            }
            if (rows.length > 0) {
                return reject({ conn, err: ERROR.ACCOUNT_EXIST })
            }
            return resolve(conn);
        })
    })).then(conn => new Promise(function (resolve, reject) {
        const passHash = passwordHash(password);
        const userId = uniqueId({ ip, account, password }, 31);
        conn.query("INSERT INTO user (account,passHash,userId) VALUES (?,?,?)", [account, passHash, userId], (err) => {
            return err ? reject({ conn, err }) : resolve({ conn, passHash, userId });
        })
    })).then(({ conn, passHash, userId }) => new Promise(function (resolve, reject) {
        conn.commit(function (err) {
            if (err) {
                return reject({ conn, err })
            }

            conn.release();

            const date = new Date();
            const token = getToken(account, passHash, date);
            const respons = { ok: true, code: 0, userId, account, date, token };
            res.json(respons);
            return resolve();
        });
    })).catch((errObj) => {
        if (!errObj.err) {
            console.log(errObj);
            return res.json(ERROR.MYSQL_FAIL);
        }

        const { conn, err } = errObj;
        console.log(err);
        conn.rollback();
        return res.json(err.code ? err : ERROR.MYSQL_FAIL);
    }));
});

router.post('/login', async function (req, res, next) {
    const { account, password } = req.body;
    if (!account || !password) {
        return res.json(ERROR.PARSE_FAIL);
    }
    try {
        const passHash = passwordHash(password);
        let { results } = await mysqlUtils.queryAsync(req, {
            sql: "SELECT account,passHash,userId FROM user WHERE account=?",
            values: [account],
            timeout: 100, // 0.1s
        });

        if (results.length <= 0) {
            return res.json(ERROR.ACCOUNT_NOT_EXIST);
        } else if (results[0].passHash != passHash) {
            return res.json(ERROR.WRONG_PASSWORD);
        }
        const date = new Date();
        const token = getToken(account, passHash, date);
        console.log(date);
        console.log(token);
        const respons = { ok: true, code: 0, userId: results[0].userId, account, date, token };
        return res.json(respons);
    } catch (e) {
        console.log(e);
        return res.json(ERROR.MYSQL_FAIL);
    }
});

router.post('/session', async function (req, res, next) {
    const { account, token, date } = req.body;
    if (!account || !token || !date) {
        return res.json(ERROR.PARSE_FAIL);
    }

    try {
        let { results } = await mysqlUtils.queryAsync(req, {
            sql: "SELECT account,passHash,userId FROM user WHERE account=?",
            values: [userId],
            timeout: 100, // 0.1s
        });
        const trueToken = getToken(account, results.passHash, date);

        if (trueToken == token) {
            const newToken = getToken(account, results.passHash, new Date());
            return res.json({ ok: true, code: 0, userId: results.userId, token: newToken });
        }

        return res.json(ERROR.TOKEN_INVALID);
    } catch (e) {
        return res.json(ERROR.MYSQL_FAIL);
    }
});

router.post('/get', async function (req, res, next) {
    let ip = getClientIP(req);
    let userId = uniqueId({ ip }, 31);

    try {
        let { results } = await mysqlUtils.queryAsync(req, {
            sql: "INSERT INTO user (userId) VALUES (?)",
            values: [userId],
            timeout: 100, // 0.1s
        });
        console.log(results);
        let respons = { ok: true, code: 0, userId };
        return res.json(respons);
    } catch (e) {
        return res.json(ERROR.MYSQL_FAIL);
    }
});

module.exports = router;
