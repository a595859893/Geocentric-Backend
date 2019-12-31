const os = require('os');
const crypto = require('crypto');

let seqIdx = 0;
let seqTime = new Date().getTime();
const ZERO_32 = new Array(32 + 1).join('0');

function getToken(account, passHash, timestamp) {
    timestamp = new Date(timestamp);
    let md5 = crypto.createHash('sha1');
    md5.update(account + passHash + timestamp.toString());
    return md5.digest("hex");
}

function passwordHash(password) {
    let md5 = crypto.createHash('sha1');
    md5.update(password);
    return md5.digest("hex");
}

// 根据当前时间（毫秒）以及毫秒内调用次数来生成
function getTimeSequence() {
    let time = new Date().getTime();
    if (seqTime < time) {
        seqIdx = 0;
    }

    return (ZERO_32 + seqTime.toString(36) + seqIdx.toString()).slice(-16);
}

// 不支持嵌套Object
function concatInfo(info) {
    let str = []
    for (let key in info) {
        str.push(info[key])
    }

    let final = crypto.createHash('md5')
        .update(str.join(''))
        .digest('hex');
    return final.slice(-8);
}

function uniqueId(info, length) {
    let nonce = Math.floor(Math.random() * 99999).toString(36);
    let concate = concatInfo(info || {});
    let sequence = getTimeSequence();
    let final = [ZERO_32, nonce, concate, sequence].join('').slice(-length);
    return final
}

module.exports = { uniqueId, getToken, passwordHash };