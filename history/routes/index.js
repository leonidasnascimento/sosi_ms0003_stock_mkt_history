var express = require('express');
var router = express.Router();
var HttpStatus = require('http-status-codes');
var dal = require("../data/dal_mkt_history");

/* GET home page. */
router.get('/', function (req, res, next) {
  if ((Object.keys(req.query).length === 0) || (Object.keys(req.query).indexOf("code") < 0)) {
    res.status(HttpStatus.EXPECTATION_FAILED).send("Stock code not informed")
  }

  new dal().get_history(req.query["code"], function (data) {
    res.status(HttpStatus.OK).send(data);
  }, function (data) {
    res.status(HttpStatus.METHOD_FAILURE).send(data)
  });
});

router.get('/last_price', function (req, res, next) {
  if ((Object.keys(req.query).length === 0) || (Object.keys(req.query).indexOf("code") < 0)) {
    res.status(HttpStatus.EXPECTATION_FAILED).send("Stock code not informed")
  }

  new dal().get_history(req.query["code"], function (data) {
    if (data != null && data.history != null) {
      var return_data = {
        code: null,
        last_price: null
      }

      //Sorting
      data.history.sort(function (a, b) {
        var a_date = a.date.split("/")
        var b_date = b.date.split("/")

        if (a_date == null || b_date == null || a_date.length < 3 || b_date.length < 3) {
          return
        }

        return new Date(Number(b_date[2]), Number(b_date[1]), Number(b_date[0])) - new Date(Number(a_date[2]), Number(a_date[1]), Number(a_date[0]))
      })
      
      return_data.code = data.code
      return_data.last_price = data.history[0]

      res.status(HttpStatus.OK).send(return_data);
    } else {
      res.status(HttpStatus.METHOD_FAILURE).send(data)
    }
  }, function (data) {
    res.status(HttpStatus.METHOD_FAILURE).send(data)
  });
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

  // Adding new history to the database
  new dal().add_history(req.body, function (data) {
    res.status(HttpStatus.OK).send(data)
  }, function (data) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(data)
  })
});

module.exports = router;