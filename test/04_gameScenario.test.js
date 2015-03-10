require("blanket")();
var app = require("../app.js");
var equals = require("assert").strictEqual;
var clientManager = require("./utils/clients.js");
var path = require("path");

describe("Game Scenario", function() {

  var clients = [];
  var roomId  = null;

  before(function(done) {
    __conf.password = null;
    __conf.dataPath = path.join(__dirname, "data");
    app.start(function() {
      done();
    });
  });

  after(function() {
    app.stop();
  });

  beforeEach(function() {
    clientManager.clearEventsMultiple(clients);
  });

  it("should init correctly", function(done) {

    var login = function() {
        clients[0].on("loginResult", create);
        for(var i = 0; i < 5; i++) {
            clients[i].emit("login", {username: "p" + i, password: __conf.password});
        }
    };

    var create = function() {
        clients[1].on("roomCreated", function(room) {
            roomId = room.id;
            join();
        });
        clients[0].emit("createRoom", {name: "Test Room", type: "raw"});
    };

    var join = function() {
        clients[3].on("roomJoined", function() {
            done();
        });
        for(var i = 1; i < 4; i++) {
            clients[i].emit("joinRoom", roomId);
        }
    };

    for(var i = 0; i < 6; i++) {
      clientManager.createClient(function(client) {
        clients.push(client);
        if(clients.length === 5) {
            login();
        }
      });
    }
  });

  it("should start the game", function(done) {
    clients[2].on("gameStarted", done);
    clients[0].emit("startRoom");
  });

});