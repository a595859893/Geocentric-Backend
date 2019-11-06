const express = require('express');
const mysqlUtils = require('../utils/mysqlUtils');
const router = express.Router();

router.get('/', async function (req, res, next) {
  try {
    let { results } = await mysqlUtils.queryAsync(req, {
      sql: "SELECT * FROM test",
      timeout: 1000, // 1s
    });
    return res.json(results);
  } catch (e) {
    return res.json({ err: 'error occur!' });
  }
});

module.exports = router;
