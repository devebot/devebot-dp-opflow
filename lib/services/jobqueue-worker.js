'use strict';

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

  var runhookManager = params['devebot/runhookManager'];
  var pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  var rpcWorkerCfg = lodash.get(pluginCfg, 'rpcWorker', { enabled: false });
  rpcWorkerCfg.autoinit = false;
  var rpcWorker = null;

  self.ready = function() {
    if (rpcWorkerCfg.enabled !== false) {
      rpcWorker = rpcWorker || new opflow.RpcWorker(rpcWorkerCfg);
    }
    if (!rpcWorker) return Promise.resolve();
    return rpcWorker.ready().then(function() {
      LX.has('conlog') && LX.log('conlog', LT.toMessage({
        text: ' - rpcWorker is available'
      }));
      return rpcWorker.process(function(routineId) {
        return true;
      }, function(body, headers, response) {
        var routineId = headers.routineId;
        var requestId = headers.requestId;
        var reqTr = LT.branch({ key: 'requestId', value: requestId });

        LX.has('trace') && LX.log('trace', reqTr.add({
          routineId: routineId
        }).stringify({
          text: '{routineId}#{requestId}: requested'
        }));

        var runhook = JSON.parse(body);
        var runhookInfo = lodash.omit(runhook, ['options', 'payload']);
        var runhookName = chores.getFullname([runhook.package, runhook.name]);

        if (runhookManager.isAvailable(runhook)) {
          LX.has('trace') && LX.log('trace', reqTr.add({
            routineId: routineId,
            runhookName: runhookName,
            runhookInfo: runhookInfo
          }).stringify({
            text: '{runhookName}#{requestId} - started: {runhookInfo}'
          }));
          response.emitStarted();

          runhookManager.process(runhook, {
            progressMeter: runhookManager.createProgressMeter({
              progress: response.emitProgress
            })
          }).then(function(result) {
            LX.has('trace') && LX.log('trace', reqTr.add({
              runhookName: runhookName,
              result: result
            }).stringify({
              text: '{runhookName}#{requestId} - completed: {result}'
            }));
            response.emitCompleted(result);
          }).catch(function(error) {
            LX.has('error') && LX.log('error', reqTr.add({
              runhookName: runhookName,
              error: error
            }).stringify({
              text: '{runhookName}#{requestId} - failed: {error}'
            }));
            response.emitFailed(error);
          });
        } else {
          LX.has('trace') && LX.log('trace', reqTr.add({
            runhookName: runhookName,
            runhookInfo: runhookInfo
          }).stringify({
            text: '{runhookName}#{requestId}: {runhookInfo} - not found'
          }));
          response.emitFailed({
            message: 'runhook not found'
          });
        }
      });
    })
  }

  self.close = function() {
    if (!rpcWorker) return Promise.resolve();
    var tmpWorker = rpcWorker;
    rpcWorker = null;
    return tmpWorker.close();
  };

  LX.has('conlog') && LX.log('conlog', LT.toMessage({
    tags: [ 'constructor-end' ],
    text: ' - constructor has finished'
  }));
};

Service.referenceList = [ 'devebot/runhookManager' ];

module.exports = Service;
