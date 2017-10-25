var socket = require("socket.io-client");
var request = require("request");

var url = "http://localhost:"+__conf.port;

module.exports = {

  createClient: function(callback) {

    var jar = request.jar();
    request({uri: url, jar: jar}, function(err, res, body) {
      var client = socket(url, {
        forceNew: true,
        extraHeaders: {
          Cookie: jar.getCookieString(url)
        }
      });

      client.on("error", function(e) {
        throw e;
      });

      client.on("connect", function() {
        callback(client);
      });

      client.on("challenge", function(c) {
        client.challenge = c;
      });
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
