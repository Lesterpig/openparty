require("blanket")();
var app = require("../app.js");
var equals = require("assert").strictEqual;
var assert = require("assert");
var clientManager = require("./utils/clients.js");
var path = require("path");

var error = function() { throw new Error(); };

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
      clients[0].on("loginResult", function() {
        setTimeout(create, 500);
      });
      for(var i = 0; i < 5; i++) {
        clients[i].emit("login", {username: "p" + i, password: __conf.password});
      }
    };

    var create = function() {
      clients[1].on("roomCreated", function(room) {
          roomId = room.id;
          setTimeout(join, 500);
      });
      clients[0].emit("createRoom", {name: "Test Room", type: "raw"});
    };

    var join = function() {
      clients[3].on("roomJoined", function() {
          done();
      });
      for(var i = 1; i < 4; i++) {
          clients[i].emit("joinRoom", {id: roomId});
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

  it("should not start the game yet", function(done) {
    clients[2].on("gameStarted", error);
    clients[0].emit("startRoom");
    setTimeout(done, 20);
  });

  it("should start the game, the first stage and send appropriate channel information", function(done) {
    var room = require("../lib/rooms").rooms[0];
    room.enableStart = true;
    var i = 0;
    var handleOk = function() {
      if(++i >= 5) done();
    }

    clients[0].on("setAllowedChannels", function(data) {
      if(!clients[0].firstAllowedChannels) {
        return clients[0].firstAllowedChannels = true; // Note : the first event is always for general channel.
      }
      assert.deepEqual({
        general: {r: true, w: true, n: "General"},
        a: {r: true, w: true, n: "Channel A"}
      }, data);
      handleOk();
    });
    clients[2].on("setAllowedChannels", function(data) {
      if(!clients[2].firstAllowedChannels) {
        return clients[2].firstAllowedChannels = true;
      }
      assert.deepEqual({
        general: {r: true, w: true, n: "General"},
        b: {r: false, w: true, n: "Channel B"}
      }, data);
      handleOk();
    });
    clients[3].on("setAllowedChannels", function(data) {
      if(!clients[3].firstAllowedChannels) {
        return clients[3].firstAllowedChannels = true;
      }
      assert.deepEqual({}, data);
      handleOk();
    });
    clients[2].on("setTimer", handleOk);
    clients[2].on("gameStarted", handleOk);
    clients[0].emit("startRoom");
  });

  it("should not start the game another time", function(done) {
    clients[2].on("gameStarted", error);
    clients[0].emit("startRoom");
    setTimeout(done, 20);
  });

  describe("Chat Messages", function() {

    it("should not emit chat messages in not-allowed channels", function(done) {

      clients[0].on("messageSent", error);
      clients[1].on("messageSent", error);
      clients[3].on("messageSent", error);

      clients[0].emit("sendMessage", {channel: "general"});
      clients[0].emit("sendMessage", {channel: "general", message: ""});
      clients[0].emit("sendMessage", {channel: "preChat", message: "hi"});
      clients[1].emit("sendMessage", {channel: "b", message: "wrong message" });
      clients[1].emit("sendMessage", {channel: "c", message: "wrong message" });
      clients[3].emit("sendMessage", {channel: "general", message: "wrong message" });
      setTimeout(done, 50);

    });

    it("should emit and receive chat messages in general", function(done) {

      var i = 0;
      var handleOk = function() {
        if(++i >= 2) done();
      }

      clients[0].on("messageSent", handleOk);
      clients[3].on("chatMessage", error);

      clients[2].on("chatMessage", function(data) {
        equals("p0", data.sender);
        equals("Hello World!", data.message);
        handleOk();
      });

      clients[0].emit("sendMessage", {channel: "general", message: "Hello World!" });

    });

    it("should emit a private message for player 1", function(done) {

      clients[0].on("chatMessage", error);
      clients[1].on("chatMessage", function(data) {
        equals("GAMEMASTER", data.sender);
        done();
      });

      var room = require("../lib/rooms").rooms[0];
      room.broadcast("player-p1", "chatMessage", {sender: "GAMEMASTER"});

    });

    it("should emit and receive chat messages in roles channels", function(done) {
      var i = 0;
      var handleOk = function(data) {
        equals("p0", data.sender);
        equals("Hello Channel A!", data.message);
        if(++i >= 2) done();
      }

      clients[0].on("chatMessage", handleOk);
      clients[1].on("chatMessage", handleOk);

      clients[2].on("chatMessage", error);
      clients[3].on("chatMessage", error);

      clients[0].emit("sendMessage", {channel: "a", message: "Hello Channel A!" });
    });


    it("should emit and receive chat messages in r/w only channels", function(done) {

      var i = 0;
      var handleOk = function(data) {
        equals("p2", data.sender);
        equals("Hello Channel B!", data.message);
        if(++i >= 2) done();
      }

      clients[0].on("chatMessage", handleOk);
      clients[1].on("chatMessage", handleOk);

      clients[0].on("messageSent", error);
      clients[2].on("chatMessage", error);
      clients[3].on("chatMessage", error);

      clients[0].emit("sendMessage", {channel: "b", message: "Wrong Message"});
      clients[2].emit("sendMessage", {channel: "b", message: "Hello Channel B!"});

    });

    it("should remove role and its channel", function(done) {

      clients[0].on("setAllowedChannels", error);
      clients[1].on("setAllowedChannels", function(data) {
        assert.deepEqual({
          general: {r: true, w: true, n: "General"}
        }, data);
        clients[0].emit("sendMessage", {channel: "a", message: "you should not receive this message"});
        setTimeout(done, 50);
      });
      clients[2].on("setAllowedChannels", function(data) {
        assert.deepEqual({
          general: {r: true, w: true, n: "General"},
          b: {r: false, w: true, n: "Channel B"}
        }, data);
      });

      clients[1].on("chatMessage", error);

      clients[1].emit("sendMessage", {channel: "general", message: "remove_role_1"});
      clients[2].emit("sendMessage", {channel: "general", message: "remove_role_1"}); // no effect

    });

    it("should be masked", function(done) {
      var i = 0;
      clients[0].on("chatMessage", function(data) {
        equals("p0", data.sender);
        equals("ok", data.message);
        done();
      });
      clients[0].on("setAllowedChannels", function(channels) {
        if(++i !== 2) return;
        assert.deepEqual({
          "general": {r: true, w: true, n: "General"},
          "c": {r: true, w: true, n: "Channel C"}
        }, channels);
        clients[0].emit("sendMessage", {channel: "a", message: "ko"});
        clients[0].emit("sendMessage", {channel: "b", message: "ko"});
        clients[0].emit("sendMessage", {channel: "c", message: "ok"});
      });
      clients[0].emit("sendMessage", {channel: "general", message: "setup_channels"});
    });

    it("should be released", function(done) {

      clients[0].on("chatMessage", function() {
        done();
      });

      var player = require("../lib/rooms").rooms[0].players[0].player;
      player.setChannel("a", null);
      clients[0].emit("sendMessage", {channel: "a", message: "released"});
    });
  });

  describe("Player information", function() {

    it("should send some player information in channels", function(done) {
      var room = require("../lib/rooms").rooms[0];
      clients[0].on("playerInfo", function(data) {
        equals("p0", data.username);
        equals("- <strong>MASTER</strong> -", data.value);
        done();
      });
      clients[2].on("playerInfo", error);
      clients[3].on("playerInfo", error);
      room.playerInfo("b", room.players[0], "- <strong>MASTER</strong> -");
    });

    it("should send some player information in general channel", function(done) {
      var room = require("../lib/rooms").rooms[0];
      clients[3].on("playerInfo", function() { done() });
      room.playerInfo(room.players[1], "Slave");
    });

    it("should send some player information even if player object on param", function(done) {
      var room = require("../lib/rooms").rooms[0];
      var i = 0;
      clients[0].on("playerInfo", function(data) {
        if(++i === 2)
          done();
      });

      room.playerInfo(room.players[0].player, "a");
      room.playerInfo("b", room.players[0].player, "a");
    });

  });

  describe("Actions", function() {

    it("should not work if not available", function(done) {
      clients[0].on("chatMessage", error);
      clients[0].emit("executeAction");
      clients[0].emit("executeAction", {});
      clients[1].emit("executeAction", {action: "button"});
      clients[4].emit("executeAction", {action: "button"});
      setTimeout(done, 20);
    });

    describe("Button", function() {

      it("should execute correctly", function(done) {
        clients[0].on("chatMessage", function() { done() });
        clients[0].emit("executeAction", {action: "button"});
      });

      it("should work correctly with individual actions", function(done) {
        clients[2].on("chatMessage", function() {
          done();
        });
        clients[2].emit("sendMessage", { message: "setup_action", channel: "general" });
        setTimeout(function() {
          clients[2].emit("executeAction", {action: "test"});
        }, 50);
      });

      it("should be masked", function(done) {
        clients[0].on("chatMessage", error);

        var player = require("../lib/rooms").rooms[0].players[0].player;
        player.setAction("button", {}); //here, we disabled the action
        clients[0].emit("executeAction", {action: "button"});

        setTimeout(done, 20);
      });

      it("should be released", function(done) {
        clients[0].on("chatMessage", function() { done() });

        var player = require("../lib/rooms").rooms[0].players[0].player;
        player.setAction("button", null); //here, we released the action mask
        clients[0].emit("executeAction", {action: "button"});
      });

    });

    describe("Select", function() {
      it("should not accept invalid entries/players", function(done) {
        clients[0].on("chatMessage", error);
        clients[0].emit("executeAction", {action: "chooseFn"});
        clients[0].emit("executeAction", {action: "chooseFn", value: "1"});
        clients[0].emit("executeAction", {action: "choose"});
        clients[0].emit("executeAction", {action: "choose", value: "Three"});
        clients[0].emit("executeAction", {action: "choose", value: "p0"});
        clients[0].emit("executeAction", {action: "player"});
        clients[0].emit("executeAction", {action: "player", value: "invalid"});
        setTimeout(done, 20);
      });

      it("should accept valid entries", function(done) {
        clients[0].on("chatMessage", function(data) {
          equals("One", data.message);
          done();
        });
        clients[0].emit("executeAction", {action: "choose", value: "One"});
      });

      it("should accept valid entries with types", function(done) {
        clients[0].on("chatMessage", function(data) {
          equals(1, data.message);
          done();
        });
        clients[0].emit("executeAction", {action: "chooseFn", value: 1});
      });

      it("should accept valid players", function(done) {
        clients[0].on("chatMessage", function(data) {
          equals("p1", data.message);
          done();
        });
        clients[0].emit("executeAction", {action: "player", value: "p1"});
      });
    });

  });

  describe("Stages", function() {

    it("should start a new infinite stage", function(done) {
      var room = require("../lib/rooms").rooms[0];
      clients[0].on("clearTimer", function() {
        equals(Infinity, room.getRemainingTime());
        done();
      });
      room.nextStage("infinite");
    });

    it("should change the stage duration", function(done) {
      var room = require("../lib/rooms").rooms[0];
      clients[0].on("setTimer", function(duration) {
        assert(duration > new Date().getTime());
        var r = room.getRemainingTime();
        assert(500 < r && r <= 1000);
        done();
      });
      room.setStageDuration(1);
    });

    it("should start a short stage and end it to the previous stage", function(done) {
      var room = require("../lib/rooms").rooms[0];
      clients[0].on("clearTimer", done);
      room.nextStage("short");
    });

    it("should trigger callback", function(done) {
      var room = require("../lib/rooms").rooms[0];
      room.nextStage("infinite", function(err) {
        equals(null, err);
        done();
      });
    });

  });

  describe("Leave", function() {

    it("should leave chat rooms", function(done) {

      clients[2].on("chatMessage", function() {
        throw new Error("Should not receive this message");
      });
      clients[2].on("roomLeft", function() {
        clients[0].emit("sendMessage", {channel: "general", message: "hello"});
      });

      clients[2].emit("leaveRoom");

      setTimeout(done, 50);
    });

  });

  describe("Disconnection", function() {

    it("should handle ingame reconnections", function(done) {
      var room   = require("../lib/rooms").rooms[0];
      var player = room.resolveUsername("p1").player;
      clients[1].disconnect();
      setTimeout(function() {
        player.emit("this message will not crash");
        assert(player.disconnected);
        clients[1].connect();
        clients[1].emit("login", {username: "p1", password: __conf.password});
      }, 100);
      clients[1].on("gameStarted", done);
    });

    it("should handle ingame disconnections", function(done) {
      var room   = require("../lib/rooms").rooms[0];
      clients[3].disconnect();
      setTimeout(function() {
        assert(null === room.resolveUsername("p3"));
        done();
      }, 1100);
    });

    it("should not leave if not in room", function() {
      /**
       * This case should never happen.
       * It's a kind of "last protection" before crash, that's why we need a test
       */
      require("../lib/rooms").leaveRoom({
        invalid: "socket",
        currentRoom: {
          players: ["a"]
        }
      });
    });

  });
});
