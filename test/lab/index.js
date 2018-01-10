var Devebot = require('devebot');
var lodash = Devebot.require('lodash');

module.exports = {
	getDefaultTimeout: function() {
		return 600000;
	},
	getApp: function(bootFile) {
		bootFile = bootFile || 'index';
		return require('../app/' + bootFile);
	},
	getApiConfig: function(ext) {
		ext = ext || {};
		return lodash.merge({
			host: '127.0.0.1',
			port: 17779,
			path: '/demo-app',
			authen: {
				token_key: 'devebot',
				token_secret: 's3cr3tpa$$w0rd'
			},
			stateMap: {
				"definition": "definition",
				"started": "started",
				"progress": "progress",
				"timeout": "timeout",
				"failed": "failed",
				"cancelled": "cancelled",
				"completed": "completed",
				"done": "done",
				"noop": "noop"
			}
		}, ext);
	}
}
