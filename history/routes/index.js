var express = require('express');
var router = express.Router();
var HttpStatus = require('http-status-codes');
var dal = require("../data/dal_mkt_history");
const cacheDb = require("sosi_cache_db_manager");
const cacheDbKey_DividendAnalysis = "sosi_ms0003_stock_mkt_history.dividend_analysis"

/* FUNCTIONS */

//Gest the last price from a given stock history
var getLastPrice = function (input_json_arr) {
  var return_data = {}

  if (input_json_arr != null && input_json_arr.history != null) {
    //Sorting
    input_json_arr.history.sort(function (a, b) {
      var a_date = a.date.split("/")
      var b_date = b.date.split("/")

      if (a_date == null || b_date == null || a_date.length < 3 || b_date.length < 3) {
        return
      }

      return new Date(Number(b_date[2]), Number(b_date[1]), Number(b_date[0])) - new Date(Number(a_date[2]), Number(a_date[1]), Number(a_date[0]))
    })

    return_data = input_json_arr.history[0]

  }

  return return_data
}

//Gets the avarage result of a given column within a json array
var getAvarageResult = function (input_json_arr, column_name) {
  var calc_result = 0.0
  var found_values_count = 0
  var values_sum = 0.0

  if ((input_json_arr == null) || (String(column_name) == '')) {
    return calc_result
  }

  for (var index = 0; index < input_json_arr.length; index++) {
    if (column_name in input_json_arr[index]) {
      found_values_count += 1
      values_sum += parseFloat(input_json_arr[index][column_name])
    }
  }

  calc_result = values_sum / (found_values_count > 0 ? found_values_count : 1)
  return calc_result
}

var getDividendAnalysisData = function (data) {
  if (data === undefined || data === null) {
    return undefined;
  }

  let adjusted_close_aux = 0.00
  let last_price_aux = getLastPrice(data);
  let volume_aux = getAvarageResult(data.history, "volume")

  if (last_price_aux === undefined || last_price_aux === null || last_price_aux === {}) {
    adjusted_close_aux = 0.00
  } else if (!('adjusted_close' in last_price_aux)) {
    adjusted_close_aux = 0.00
  } else {
    adjusted_close_aux = last_price_aux.adjusted_close
  }

  let result_json = {
    code: data.code,
    last_price: adjusted_close_aux,
    volume: volume_aux,
  }

  return result_json
}

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

router.get('/stats', function (req, res, next) {
  if ((Object.keys(req.query).length === 0) || (Object.keys(req.query).indexOf("code") < 0)) {
    res.status(HttpStatus.EXPECTATION_FAILED).send("Stock code not informed")
  }

  new dal().get_history(req.query["code"], function (data) {
    result_json = {
      code: req.query["code"],
      last_price: getLastPrice(data),
      avarage_values: {
        days: data.history.length,
        openning: getAvarageResult(data.history, "openning"),
        high: getAvarageResult(data.history, "high"),
        close: getAvarageResult(data.history, "close"),
        adjusted_close: getAvarageResult(data.history, "adjusted_close"),
        low: getAvarageResult(data.history, "low"),
        volume: getAvarageResult(data.history, "volume"),
      }
    }

    res.status(HttpStatus.OK).send(result_json);
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

/* **********************************

  DIVIDEND ANALYSIS ENDPOINT SECTION

************************************* */

router.get('/dividend_analysis', function (req, res, next) {
  var cacheDbMngr = new cacheDb(cacheDbKey_DividendAnalysis)

  //Trying to get data from Redis
  cacheDbMngr.getValue(function (obj) {
    if (obj.data !== null) {
      console.log("FROM REDIS...")
      res.status(HttpStatus.OK).send(JSON.parse(obj.data));
    } else {
      //Going to main db to retrieve the data if some error occurr when getting from Redis
      new dal()
        .get_all_history(function (data) {
          var result = getDividendAnalysisData(data)
          res.status(HttpStatus.OK).send(result);
        }, function (data) {
          res.status(HttpStatus.METHOD_FAILURE).send(data);
        });
    }
  }, function (obj) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(obj);
  })
});

router.put('/dividend_analysis', function (req, res, next) {
  new dal().get_all_history(function (data) {
    var cacheDbMngr = new cacheDb(cacheDbKey_DividendAnalysis)
    var lstData = []

    if (data === null || data === undefined) {
      res.status(HttpStatus.EXPECTATION_FAILED).send("No data");
    } else {
      data.forEach(d => {
        var result = getDividendAnalysisData(d)
        lstData.push(result);
      })

      cacheDbMngr.setValue(lstData, function (obj) {
        res.status(HttpStatus.OK).send(obj)
      }, function (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error)
      });
    }
  }, function (data) {
    res.status(HttpStatus.METHOD_FAILURE).send(data)
  });
});

module.exports = router;