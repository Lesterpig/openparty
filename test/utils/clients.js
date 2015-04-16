var socket = require('socket.io-client');

module.exports = {

  createClient: function(callback) {
    var client = socket("http://localhost:"+__conf.port, {forceNew: true});

    client.on("connect", function() {
      callback(client);
    });

  },

  clearEvents: function(client) {
    client.removeAllListeners();
  },

  clearEventsMultiple: function(clients) {
    for(var i = 0; i < clients.length; i++) {
      this.clearEvents(clients[i]);
    }
  }

}