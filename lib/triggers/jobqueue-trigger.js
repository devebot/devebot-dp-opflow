'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');

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

Service.referenceList = [ 'jobqueueMaster', 'jobqueueWorker' ];

module.exports = Service;
