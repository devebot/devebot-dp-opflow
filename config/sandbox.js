module.exports = {
  plugins: {
    devebotDpOpflow: {
      opflow: {
        enabled: true,
        rpcMaster: {
          uri: process.env.DEVEBOT_OPFLOW_URI || 'amqp://localhost',
          exchangeName: 'devebot-jobqueue-exchange',
          routingKey: 'devebot-jobqueue-rpc',
          autoinit: false
        },
        rpcWorker: {
          uri: process.env.DEVEBOT_OPFLOW_URI || 'amqp://localhost',
          exchangeName: 'devebot-jobqueue-exchange',
          routingKey: 'devebot-jobqueue-rpc',
          operatorName: 'devebot-jobqueue-operator',
          responseName: 'devebot-jobqueue-response',
          autoinit: false
        },
        verbose: false
      }
    }
  }
};
