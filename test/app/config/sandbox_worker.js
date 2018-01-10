module.exports = {
  plugins: {
    devebotDpOpflow: {
      opflow: {
        rpcMaster: {
          enabled: false
        },
        rpcWorker: {
          enabled: true
        }
      }
    }
  }
};
