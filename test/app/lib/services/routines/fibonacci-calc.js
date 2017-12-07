'use strict';

var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');

var runhookSetting;

var runhookDialect = {
  info: {
    mode: 'direct',
    description: 'Fibonacci Generator',
    schema: {
      "type": "object",
      "properties": {
        "number": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        }
      }
    }
  },
  handler: function(opts, ctx) {
    var LX = this.loggingFactory.getLogger();
    var LT = this.loggingFactory.getTracer();

    LX.has('conlog') && LX.log('conlog', LT.toMessage({
      text: ' - runhook start'
    }));

    var number = opts.number;
    var result = fibonacci(number, number, ctx.progressMeter);

    var output = Promise.resolve([{
        type: 'json',
        title: 'Plugin2 - Routine1',
        data: { fibonacci: result }
    }]);

    LX.has('conlog') && LX.log('conlog', LT.toMessage({
      text: ' - runhook end'
    }));

    return output;
  }
};

module.exports = function(params) {
  runhookSetting = params || {};
  return runhookDialect;
};

function fibonacci(n, max, progressMeter) {
  if (progressMeter) {
    progressMeter.update(max - n + 1, max);
  }
  if (n == 0 || n == 1) return n;
  return fibonacci(n - 1, max, progressMeter) + fibonacci(n - 2);
}
