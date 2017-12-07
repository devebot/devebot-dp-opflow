module.exports = {
  devebot: {
    jobqueue: {
      enabled: true,
      pluginId: 'devebot-dp-opflow'
    }
  },
  logger: {
    transports: {
      console: {
        type: 'console',
        level: 'trace',
        json: false,
        timestamp: true,
        colorize: true
      }
    }
  }
}