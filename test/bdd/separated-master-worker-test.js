'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('pinbug')('bdd:devebot-dp-opflow:separated-master-worker');
var assert = require('chai').assert;
var expect = require('chai').expect;
var util = require('util');
var DT = require('devebot-test');
var TS = require('devebot-test').toolset;

describe('devebot-dp-opflow:separated-master-worker', function() {
	this.timeout(DT.DEFAULT_TIMEOUT);

	var appMaster, appWorker, api;

	before(function() {
		appMaster = DT.loadTestModule('app', 'app_master');
		appWorker = DT.loadTestModule('app', 'app_worker');
	});

	beforeEach(function(done) {
		Promise.all([
			appMaster.server.start(),
			appWorker.server.start()
		]).then(function() {
			api = DT.connectService({path: '/app_master'});
			done();
		});
	});

	afterEach(function(done) {
		api = null;
		Promise.all([
			appMaster.server.teardown(),
			appWorker.server.teardown()
		]).then(function() {
			done();
		});
	});

	it('direct runhook should return correct result', function(done) {
		var number = 15;
		var expectedValue = fibonacci(number);
		var expectedPrgr = [];
		lodash.range(number).map(function(n) {
			expectedPrgr.push(lodash.round((n + 1) * 100 / number));
		});
		var returnedPrgr = [];
		new Promise(function(resolved, rejected) {
			api.on('failed', function(result) {
				rejected(result);
			});
			api.on('completed', function(result) {
				resolved(result);
			});
			api.on('progress', function(status) {
				returnedPrgr.push(status.progress);
			});
			api.execCommand({
				name: 'fibonacci-generator',
				data: { 'number': number },
				mode: 'remote'
			});
		}).then(function(result) {
			debugx.enabled && debugx('Expected progress: %s', JSON.stringify(expectedPrgr));
			debugx.enabled && debugx('Returned progress: %s', JSON.stringify(returnedPrgr));
			assert.sameOrderedMembers(expectedPrgr, returnedPrgr);
			debugx.enabled && debugx(JSON.stringify(result, null, 2));
			assert.equal(result.details[0].data.fibonacci, expectedValue);
			done();
		}).catch(function(error) {
			debugx.enabled && debugx(JSON.stringify(error, null, 2));
			done(error);
		});
	});
});

var fibonacci = function fibonacci(n) {
	if (n == 0 || n == 1) return n;
	return fibonacci(n - 1) + fibonacci(n - 2);
}
