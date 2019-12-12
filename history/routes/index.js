var express = require('express');
var router = express.Router();
var HttpStatus = require('http-status-codes');
var dal = require("../data/dal_mkt_history");

/* GET home page. */
router.get('/', function (req, res, next) {
  res.status(HttpStatus.NOT_IMPLEMENTED).send("Not implemented")
});

router.post('/', function (req, res, next) {
  if (!req.body) {
    res.status(HttpStatus.LENGTH_REQUIRED).send("Body message is required")
    return
  }

  if (!req.body.code) {
    res.status(HttpStatus.LENGTH_REQUIRED).send("Stock code is required")
    return
  }

  if (req.body.history.length === 0) {
    res.status(HttpStatus.LENGTH_REQUIRED).send("No history to process")
    return
  }

  // Adding new history to the database
  new dal().add_history(req.body, function (data) {
    res.status(HttpStatus.OK).send(data)
  }, function (data) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(data)
  })
});

module.exports = router;