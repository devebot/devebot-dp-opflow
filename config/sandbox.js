module.exports = {
  plugins: {
    devebotDpOpflow: {
      opflow: {
        rpcMaster: {
          enabled: false,
          uri: process.env.DEVEBOT_OPFLOW_URI || 'amqp://localhost',
          exchangeName: 'devebot-jobqueue-exchange',
          routingKey: 'devebot-jobqueue-rpc'
        },
        rpcWorker: {
          enabled: false,
          uri: process.env.DEVEBOT_OPFLOW_URI || 'amqp://localhost',
          exchangeName: 'devebot-jobqueue-exchange',
          routingKey: 'devebot-jobqueue-rpc',
          operatorName: 'devebot-jobqueue-operator',
          responseName: 'devebot-jobqueue-response'
        },
        verbose: false
      }
    }
  }
};
