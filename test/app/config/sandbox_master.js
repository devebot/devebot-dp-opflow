module.exports = {
  plugins: {
    devebotDpOpflow: {
      opflow: {
        rpcMaster: {
          enabled: true
        },
        rpcWorker: {
          enabled: false
        }
      }
    }
  }
};
