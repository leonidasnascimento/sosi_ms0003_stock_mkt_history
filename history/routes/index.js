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

  if (req.body.history.length === 0) {
    res.status(HttpStatus.LENGTH_REQUIRED).send("Only 30 days of history are allowed")
    return
  }

  new dal().get_history(req.body.code, function (data) {
    let db_history_length = 0

    if (data) {
      db_history_length = data.history.length

      //'Desc' sorting 
      data.history.sort(function (start, end) {
        return new Date(end.date) - new Date(start.date)
      })
    }

    history_index_count = 31 - req.body.history.length
    history_index_count = history_index_count <= db_history_length ? history_index_count : db_history_length

    for (let index = 0; index < history_index_count; index++) {
      req.body.history.push(data.history[index])
    }

    // Adding new history to the database
    new dal().add_history(req.body, function (data) {
      res.status(HttpStatus.OK).send(data)
    }, function (data) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(data)
    })
  }, function (data) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(data);
  });
});

module.exports = router;