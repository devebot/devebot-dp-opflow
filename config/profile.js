module.exports = {
  devebot: {
    opflow: {
      enabled: false,
      rpc_master: {
        uri: process.env.OPFLOW_TDD_URI || 'amqp://localhost',
        exchangeName: 'devebot-opflow-exchange',
        routingKey: 'devebot-opflow-rpc',
        responseName: 'devebot-opflow-response'
      },
      rpc_worker: {
        uri: process.env.OPFLOW_TDD_URI || 'amqp://localhost',
        exchangeName: 'devebot-opflow-exchange',
        routingKey: 'devebot-opflow-rpc',
        responseName: 'devebot-opflow-response',
        operatorName: 'devebot-opflow-operator'
      },
      verbose: false
    }
  }
}