function queryAsync(req, param) {
    const { mysql } = req;
    return new Promise((reslove, reject) => {
        mysql.query(param, function (error, results, fields) {
            if (error) {
                return reject(error);
            }
            return reslove({ results, fields });
        });
    })
}

function getConnection(req) {
    const { mysql } = req;
    return new Promise((resolve, reject) => {
        mysql.getConnection((err, connection) => {
            if (err) {
                return reject(err);
            }

            return resolve(connection);
        });
    });
}

module.exports = { queryAsync, getConnection };