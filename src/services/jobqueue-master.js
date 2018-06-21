'use strict';

const events = require('events');
const util = require('util');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');
const chores = Devebot.require('chores');
const opflow = require('opflow');

function JobqueueMaster(params) {
  let self = this;
  params = params || {};

  let getSandboxName = function() {
    return params.sandboxName;
  };

  let LX = params.loggingFactory.getLogger();
  let LT = params.loggingFactory.getTracer();

  LX.has('conlog') && LX.log('conlog', LT.add({
    sandboxName: getSandboxName()
  }).stringify({
    tags: [ 'constructor-begin' ],
    text: ' + constructor start in sandbox <{sandboxName}>'
  }));

  let pluginCfg = lodash.get(params, ['sandboxConfig'], {});
  let rpcMasterCfg = lodash.get(pluginCfg, 'rpcMaster', { enabled: false });
  rpcMasterCfg.autoinit = false;
  let rpcMaster = null;

  self.ready = function() {
    if (rpcMasterCfg.enabled !== false) {
      rpcMaster = rpcMaster || new opflow.RpcMaster(rpcMasterCfg);
    }
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

    let runhookName = chores.getFullname([runhook.package, runhook.name]);
    let runhookInfo = lodash.omit(runhook, ['options', 'payload']);

    let reqTr = LT.branch({ key: 'requestId', value: runhook.requestId });

    return rpcMaster.request(runhookName, runhook, {
      timeout: pluginCfg.opflowTimeout || 60000,
      requestId: runhook.requestId
    }).then(function(rpcTask) {
      let stdTask = new events.EventEmitter();
      rpcTask.on('started', function(info) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({ runhookName }).toMessage({
          text: '{runhookName}[${requestId}] - started'
        }));
        stdTask.emit('started', info);
      }).on('progress', function(percent, chunk) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({ runhookName, percent }).toMessage({
          text: '{runhookName}[${requestId}] - progress: {percent}'
        }));
        stdTask.emit('progress', { progress: percent, data: chunk });
      }).on('timeout', function(info) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({ runhookName }).toMessage({
          text: '{runhookName}[${requestId}] - timeout'
        }));
        stdTask.emit('timeout', info);
      }).on('cancelled', function(info) {
        LX.has('conlog') && LX.log('conlog', reqTr.add({ runhookName }).toMessage({
          text: '{runhookName}[${requestId}] - cancelled'
        }));
        stdTask.emit('cancelled', info);
      }).on('failed', function(error) {
        LX.has('error') && LX.log('error', reqTr.add({ runhookName, error }).toMessage({
          text: '{runhookName}[${requestId}] - failed: {error}'
        }));
        stdTask.emit('failed', error);
      }).on('completed', function(result) {
        LX.has('trace') && LX.log('trace', reqTr.add({ runhookName }).toMessage({
          text: '{runhookName}[${requestId}] - completed'
        }));
        if (!LX.has('trace') && LX.has('conlog')) {
          LX.log('conlog', reqTr.add({ runhookName, runhookInfo, result }).toMessage({
            text: '{runhookName}[${requestId}] - completed' +
                  ' - runhook: {runhook} - result: {result}'
          }));
        }
        stdTask.emit('completed', result);
      });
      return stdTask;
    });
  };

  LX.has('conlog') && LX.log('conlog', LT.toMessage({
    tags: [ 'constructor-end' ],
    text: ' - constructor has finished'
  }));
};

module.exports = JobqueueMaster;
