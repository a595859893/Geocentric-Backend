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

module.exports = { queryAsync };