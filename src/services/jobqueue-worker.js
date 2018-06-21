'use strict';

const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const chores = Devebot.require('chores');
const opflow = require('opflow');

function JobqueueWorker(params) {
  params = params || {};

  let self = this;
  let LX = params.loggingFactory.getLogger();
  let LT = params.loggingFactory.getTracer();

  LX.has('conlog') && LX.log('conlog', LT.add({ sandboxName: params.sandboxName }).toMessage({
    tags: [ 'constructor-begin' ],
    text: ' + constructor start in sandbox <{sandboxName}>'
  }));

  let sandboxRegistry = params['devebot/sandboxRegistry'];
  let pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  let rpcWorkerCfg = lodash.get(pluginCfg, 'rpcWorker', { enabled: false });
  rpcWorkerCfg.autoinit = false;
  let rpcWorker = null;

  self.ready = function() {
    if (rpcWorkerCfg.enabled !== false) {
      rpcWorker = rpcWorker || new opflow.RpcWorker(rpcWorkerCfg);
    }
    if (!rpcWorker) return Promise.resolve();
    let runhookManager = sandboxRegistry.lookupService('devebot/runhookManager');
    return rpcWorker.ready().then(function() {
      LX.has('conlog') && LX.log('conlog', LT.toMessage({
        text: ' - rpcWorker is available'
      }));
      return rpcWorker.process(function(routineId) {
        return true;
      }, function(body, headers, response) {
        let routineId = headers.routineId;
        let requestId = headers.requestId;
        let reqTr = LT.branch({ key: 'requestId', value: requestId });

        LX.has('trace') && LX.log('trace', reqTr.add({ routineId }).toMessage({
          text: '{routineId}#{requestId}: requested'
        }));

        let runhook = JSON.parse(body);
        let runhookInfo = lodash.omit(runhook, ['options', 'payload']);
        let runhookName = chores.getFullname([runhook.package, runhook.name]);

        if (runhookManager.isAvailable(runhook)) {
          LX.has('trace') && LX.log('trace', reqTr.add({ routineId, runhookName, runhookInfo }).toMessage({
            text: '{runhookName}#{requestId} - started: {runhookInfo}'
          }));
          response.emitStarted();

          runhookManager.process(runhook, {
            progressMeter: runhookManager.createProgressMeter({
              progress: response.emitProgress
            })
          }).then(function(result) {
            LX.has('trace') && LX.log('trace', reqTr.add({ runhookName, result }).toMessage({
              text: '{runhookName}#{requestId} - completed: {result}'
            }));
            response.emitCompleted(result);
          }).catch(function(error) {
            LX.has('error') && LX.log('error', reqTr.add({ runhookName, error }).toMessage({
              text: '{runhookName}#{requestId} - failed: {error}'
            }));
            response.emitFailed(error);
          });
        } else {
          LX.has('trace') && LX.log('trace', reqTr.add({ runhookName, runhookInfo }).toMessage({
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
    let tmpWorker = rpcWorker;
    rpcWorker = null;
    return tmpWorker.close();
  };

  LX.has('conlog') && LX.log('conlog', LT.toMessage({
    tags: [ 'constructor-end' ],
    text: ' - constructor has finished'
  }));
};

JobqueueWorker.referenceList = [ 'devebot/sandboxRegistry' ];

module.exports = JobqueueWorker;
