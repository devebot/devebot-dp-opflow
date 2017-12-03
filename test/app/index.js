'use strict';

var app = require('devebot').launchApplication({
  appRootPath: __dirname
}, [
	{
		name: 'devebot-dp-opflow',
		path: __dirname + '/../../index'
	}
], []);

if (require.main === module) app.server.start();

module.exports = app;
