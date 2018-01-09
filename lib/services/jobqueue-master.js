'use strict';

var events = require('events');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var chores = Devebot.require('chores');
var opflow = require('opflow');

var Service = function(params) {
  var self = this;
  params = params || {};

  var getSandboxName = function() {
    return params.sandboxName;
  };

  var LX = params.loggingFactory.getLogger();
  var LT = params.loggingFactory.getTracer();

  LX.has('conlog') && LX.log('conlog', LT.add({
    sandboxName: getSandboxName()
  }).stringify({
    tags: [ 'constructor-begin' ],
    text: ' + constructor start in sandbox <{sandboxName}>'
  }));

  var pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  var rpcMaster = null;

  self.ready = function() {
    rpcMaster = rpcMaster || new opflow.RpcMaster(pluginCfg.opflow.rpcMaster);
    if (!rpcMaster) return Promise.resolve();
    return rpcMaster.ready();
  }

  self.close = function() {
    if (!rpcMaster) return Promise.resolve();
    return rpcMaster.close();
  }

  self.enqueueJob = function(runhook, context) {
    if (!rpcMaster) {
      return Promise.reject(util.format('jobqueue on sandbox[%s] is disabled', getSandboxName()));
    }

    context = context || {};
    runhook = runhook || {};
    runhook.requestId = runhook.requestId || LT.getLogID();
    runhook.optimestamp = Date.now();

    var runhook_name = chores.getFullname([runhook.package, runhook.name]);
    var runhook_info = lodash.omit(runhook, ['options', 'payload']);

    var reqTr = LT.branch({ key: 'requestId', value: runhook.requestId });

    return rpcMaster.request(runhook_name, runhook, {
      timeout: pluginCfg.opflowTimeout || 60000,
      requestId: runhook.requestId
    }).then(function(rpcTask) {
      var stdTask = new events.EventEmitter();
      rpcTask.on('started', function(info) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({
          runhookName: runhook_name
        }).toMessage({
          text: '{runhookName}#{requestId} - started'
        }));
        stdTask.emit('started', info);
      }).on('progress', function(percent, chunk) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({
          runhookName: runhook_name,
          percent: percent
        }).toMessage({
          text: '{runhookName}#{requestId} - progress: {percent}'
        }));
        stdTask.emit('progress', { progress: percent, data: chunk });
      }).on('timeout', function(info) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({
          runhookName: runhook_name
        }).toMessage({
          text: '{runhookName}#{requestId} - timeout'
        }));
        stdTask.emit('timeout', info);
      }).on('cancelled', function(info) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({
          runhookName: runhook_name
        }).toMessage({
          text: '{runhookName}#{requestId} - cancelled'
        }));
        stdTask.emit('cancelled', info);
      }).on('failed', function(error) {
        LX.has('error') && LX.log('error', reqTr.add({
          runhookName: runhook_name,
          error: error
        }).toMessage({
          text: '{runhookName}#{requestId} - failed: {error}'
        }));
        stdTask.emit('failed', error);
      }).on('completed', function(result) {
        LX.has('trace') && LX.log('trace', reqTr.add({
          runhookName: runhook_name
        }).toMessage({
          text: '{runhookName}#{requestId} - completed'
        }));
        LX.has('conlog') && LX.log('conlog', reqTr.add({
          runhookName: runhook_name,
          runhook: runhook_info,
          result: result
        }).toMessage({
          text: '{runhookName}#{requestId} - completed' +
                ' - runhook: {runhook} - result: {result}'
        }));
        stdTask.emit('completed', result);
      });
      return stdTask;
    });
  };

  LX.has('conlog') && LX.log('conlog', LT.stringify({
    tags: [ 'constructor-end' ],
    text: ' - constructor has finished'
  }));
};

module.exports = Service;
