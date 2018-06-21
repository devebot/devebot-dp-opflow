'use strict';

const Devebot = require('devebot');
const Promise = Devebot.require('bluebird');
const lodash = Devebot.require('lodash');

function JobqueueTrigger(params) {
  params = params || {};

  let self = this;
  let LX = params.loggingFactory.getLogger();
  let LT = params.loggingFactory.getTracer();

  LX.has('conlog') && LX.log('conlog', LT.add({ sandboxName: params.sandboxName }).toMessage({
    tags: [ 'constructor-begin' ],
    text: ' + constructor start in sandbox <{sandboxName}>'
  }));

  self.start = function() {
    return Promise.mapSeries(['jobqueueWorker', 'jobqueueMaster'], function(name) {
      return params[name].ready();
    });
  };

  self.stop = function() {
    return Promise.mapSeries(['jobqueueMaster', 'jobqueueWorker'], function(name) {
      return params[name].close();
    });
  };

  LX.has('conlog') && LX.log('conlog', LT.toMessage({
    tags: [ 'constructor-end' ],
    text: ' - constructor has finished'
  }));
};

JobqueueTrigger.referenceList = [ 'jobqueueMaster', 'jobqueueWorker' ];

module.exports = JobqueueTrigger;
