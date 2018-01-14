'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('pinbug')('bdd:devebot-dp-opflow:multiple-worker-processes');
var assert = require('chai').assert;
var expect = require('chai').expect;
var util = require('util');
var DT = require('devebot-test');
var TS = require('devebot-test').toolset;

describe('devebot-dp-opflow:multiple-worker-processes', function() {
	this.timeout(DT.DEFAULT_TIMEOUT);

	var appMaster, appWorker, api;

	beforeEach(function(done) {
		Promise.resolve()
		.then(function() {
			return TS.processRunner.deleteAll();
		})
		.then(function(infos) {
			return TS.processRunner.start({
				apps: [
					{
						name: 'app_master',
						script: DT.getTestPath('app', 'app_master.js')
					},
					{
						name: 'app_worker',
						script: DT.getTestPath('app', 'app_worker.js'),
						exec_mode: 'cluster',
						instances : 2
					}
				]
			});
		})
		.then(function(procs) {
			return DT.isServiceReady({
				url: 'http://localhost:17779',
				retryMax: 10,
				statusCode: 200
			})
		})
		.then(function(info) {
			api = DT.connectService({path: '/app_master'});
			done();
		})
		.catch(function(error) {
			done(error);
		});
	});

	afterEach(function(done) {
		api = null;
		Promise.resolve()
			.then(function(info) {
				return TS.processRunner.stop(['app_master', 'app_worker']);
			})
			.then(function(info) {
				return TS.processRunner.delete(['app_master', 'app_worker']);
			})
			.then(function(info) {
				done();
			})
			.catch(function(error) {
				done(error);
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
