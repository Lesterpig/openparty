require("blanket")();
var app = require("../app.js");
var clientManager = require("./utils/clients.js");
var equals = require("assert").strictEqual;
var path = require("path");

describe("Lobby Scenario", function() {

  var clients = [];
  var roomId1 = null;
  var roomId2 = null;

  before(function(done) {
    __conf.password = "a";
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

  it("should open connections for 10 clients", function(done) {
    var saveClient = function(c) {
      clients.push(c);
      if(clients.length === 10) done();
    }

    for(var i = 0; i < 10; i++) {
      clientManager.createClient(saveClient);
    }
  });

  it("should ping", function(done) {
    clients[0].on("o-pong", done);
    clients[0].emit("o-ping");
  });

  it("should have received challenges", function() {
    for(var i = 0; i < 10; i++) {
      equals(true, clients[i].challenge.length > 16);
    }
  });

  it("should refuse wrong username", function(done) {

    var nbHandled = 0;
    clients[0].on("loginResult", function(e) {
      if(!e.err)
        throw new Error("Expect error");

      if(++nbHandled === 3) done();
    });

    clients[0].emit("login", {username: "averyveryveryveryveryveryveryveryverylongusername", password: __conf.password});
    clients[0].emit("login", {username: "", password: __conf.password});
    clients[0].emit("login", {username: " ", password: __conf.password});

  });

  it("should connect the 4 first clients", function(done) {

    var nbLogged = 0;
    var nbErr    = 0;
    var handleLogged = function(e) {

      if(!e.err) nbLogged++;
      else nbErr++;

      if(nbLogged + nbErr >= 7) {
        equals(4, nbLogged);
        equals(3, nbErr);
        done();
      }
    };

    for(var i = 0; i < 4; i++) {
      var client = clients[i];

      client.on("loginResult", handleLogged);
      client.emit("login", {username: "test_"+i, password: __conf.password});

    }
    clients[4].on("loginResult", handleLogged);
    clients[4].emit("login", {username: "a"});
    clients[4].emit("login", {username: "a", password: "wrongPassword"});
    clients[4].emit("login", {password: "wrongPassword"});
  });

  it("should handle same username issues", function(done) {

    clients[6].on("loginResult", function(e) {
      equals(null, e.err);
      equals("tESt_0³", e.username);
      done();
    });

    clients[5].on("loginResult", function(e) {
      equals(null, e.err);
      equals("test_0²", e.username);
      clients[6].emit("login", {username: " tESt_0", password: __conf.password});
    });

    clients[5].emit("login", {username: "test_0", password: __conf.password});
  });

  it("should enable clients to post message in lobby chat", function(done) {

    var nbMessages = 0;
    var handleMessage = function(e) {
      equals("lobbyMsg", e.message);
      equals("test_0", e.sender);
      equals(true, e.lobby);
      if(++nbMessages >= 4) done();
    }

    clients[0].on("chatMessage", handleMessage);
    clients[1].on("chatMessage", handleMessage);
    clients[2].on("chatMessage", handleMessage);
    clients[3].on("chatMessage", handleMessage);
    clients[0].emit("sendMessage", {message: "lobbyMsg"});
  });

  it("should not create room if invalid gameplay", function() {

    clients[1].on("roomCreated", function() {
      throw new Error();
    });
    clients[0].emit("createRoom", {name: "Test Room", type: "invalid_gameplay"});

  });

  it("should create room only if connected", function(done) {

    var rooms = require("../lib/rooms.js").rooms;
    equals(0, rooms.length);

    clients[0].emit("createRoom", {name: "Test Room", type: "default"});
    clients[4].emit("createRoom", {name: "Wrong Room", type: "default"});

    clients[1].on("roomCreated", function(room) {
      equals("Test Room", room.name);
      setTimeout(function() {
        equals(1, rooms.length);
        equals("Test Room", rooms[0].name);
        equals(rooms[0].id, room.id);
        done();
      }, 200);
    });

  });

  it("should not create multiple rooms", function() {

    clients[1].on("roomCreated", function() {
      throw new Error();
    });
    clients[0].emit("createRoom", {name: "Test Room 2", type: "default"});

  });

  it("should get open rooms", function(done) {

    clients[4].on("roomsList", function() {
      throw new Error();
    });
    clients[3].on("roomsList", function(rooms) {
      equals(1, rooms.length);
      equals("Test Room", rooms[0].name);
      roomId1 = rooms[0].id;
      done();
    });

    clients[3].emit("getRooms");
    clients[4].emit("getRooms");

  });

  it("should join room if allowed", function(done) {

    var nbJoin = 0;
    var handleJoin = function(room) {
      equals(roomId1, room.id);
      equals("/raw/sound.mp3", room.gameplay.sounds[0].path);
      if(++nbJoin === 2) done();
    };
    clients[1].on("roomJoined", handleJoin);
    clients[2].on("roomJoined", handleJoin);
    clients[4].on("roomJoined", function() {
      throw new Error("Should not be able to join a room!");
    });

    clients[1].emit("joinRoom", {id: roomId1});
    clients[2].emit("joinRoom", {id: roomId1});
    clients[4].emit("joinRoom", {id: roomId1});
  });

  it("should not join multiple rooms", function() {

    clients[1].on("roomJoined", function() {
      throw new Error();
    });
    clients[0].emit("joinRoom", {id: roomId1});

  });

  it("should not join a full room", function(done) {

    require("../lib/rooms").rooms[0].size = 3;
    clients[3].emit("joinRoom", {id: roomId1});
    clients[3].on("roomJoined", function() {
      throw new Error("Should not be able to join this room (full)");
    });

    setTimeout(done, 50);

  });

  it("should change room size if user is the owner only", function(done) {
    var room = require("../lib/rooms").rooms[0];
    var def  = room.gameplay.minPlayers;

    var nb = 0;
    clients[0].on("roomUpdated", function(r) {
      equals(roomId1, r.id);
      if(nb === 0) {
        equals(def+1, room.size);
        equals(def+1, r.size);
      } else if(nb === 1) {
        equals(def, r.size);
        done();
      } else {
        throw new Error("Should not be updated");
      }
      nb++;
    });

    clients[0].emit("setRoomSize", def+1);
    setTimeout(function() { clients[0].emit("setRoomSize", def); }, 50);
    clients[0].emit("setRoomSize", def-1); //should not react
    clients[1].emit("setRoomSize", def+2); //should not react

  });

  it("should change a parameter if user is the owner only", function(done) {
    var room = require("../lib/rooms").rooms[0];
    var param  = room.gameplay.parameters[0].name;
    var value  = room.gameplay.parameters[0].value;

    var nb = 0;

    clients[1].on("roomUpdated", function(r) {
      equals(roomId1, room.id);
      if(nb === 0) {
        equals(value+1, room.gameplay.parameters[0].value);
      } else if(nb === 1) {
        require("assert").equal(true, isNaN(room.gameplay.parameters[0].value));
        done();
      } else {
        throw new Error("Should not be updated");
      }
      nb++;
    });

    clients[0].emit("setRoomParameter", { parameter: param, value: value+1 });
    setTimeout(function() { clients[0].emit("setRoomParameter", { parameter: param, value: "a" }); }, 20);
    clients[0].emit("setRoomParameter", { parameter: "wrong", value: value }); //should not react
    clients[1].emit("setRoomParameter", { parameter: param, value: value+1 });   //should not react

  });

  it("should broadcast chat messages in preChat and sanitize html", function(done) {

    var nb = 0;
    clients[0].on("chatMessage", function(data) {
      if(nb === 0) {
        equals("test_0", data.sender);
        equals("first", data.message);
      } else if(nb === 1) {
        equals("test_1", data.sender);
        equals("second message", data.message);
      } else if(nb === 2) {
        equals("test_1", data.sender);
        equals("&lt;b&gt; &lt;3", data.message);
        done();
      } else {
        throw new Error("Too much messages received.");
      }
      nb++;
    });

    clients[0].emit("sendMessage", {channel: "preChat", message: "first"});
    setTimeout(function() { clients[1].emit("sendMessage", {channel: "preChat", message: "second message"}); }, 20);
    setTimeout(function() { clients[1].emit("sendMessage", {channel: "preChat", message: "<b> <3"}); }, 40);

    // should not react from here :
    clients[1].emit("sendMessage", {channel: "wrong", message: "message"});
    clients[0].emit("sendMessage", {channel: "", message: "message"});
    clients[0].emit("sendMessage", {channel: "preChat", message: ""});

  });

  it("should leave room", function(done) {

    clients[4].emit("leaveRoom"); // no effect
    clients[2].emit("leaveRoom");
    clients[2].on("roomLeft", function() {
      equals(2, require("../lib/rooms").rooms[0].players.length);
      done();
    });

  });

  it("should not receive lobby messages when room left", function(done) {

    clients[2].on("chatMessage", function() {
      throw new Error("Should not receive this message");
    });
    clients[0].emit("sendMessage", {channel: "preChat", message: "hello"});

    setTimeout(done, 50);

  });

  it("should leave room and change owner", function(done) {

    clients[0].emit("leaveRoom");
    clients[0].on("roomLeft", function() {
      equals(1, require("../lib/rooms").rooms[0].players.length);
      done();
    });

  });

  it("should do nothing", function(done) {

    clients[0].emit("leaveRoom");
    clients[2].emit("leaveRoom");
    clients[4].emit("leaveRoom");

    clients[0].emit("joinRoom", "wrongId");

    clients[0].on("roomJoined", function() {
      throw new Error("Should not join a room.");
    });
    clients[0].on("roomRemoved", function() {
      throw new Error("Should not removed a room.");
    });
    clients[0].on("roomUpdated", function() {
      throw new Error("Should not update a room.");
    });

    setTimeout(function() {
      equals(1, require("../lib/rooms").rooms[0].players.length);
      done();
    }, 50);

  });

  it("should destroy the room", function(done) {

    clients[1].emit("leaveRoom");
    clients[0].on("roomRemoved", function(id) {
      equals(roomId1, id);
      equals(0, require("../lib/rooms").rooms.length);
      done();
    });

  });

  it("should send update notifications if needed", function(done) {

    clients[1].emit("createRoom", {name: "Test Disconnect", type: "default"});
    clients[1].on("roomJoined", function(room) {
      roomId2 = room.id;
      clients[2].emit("joinRoom", {id: room.id});
      clients[2].on("roomJoined", function() {
        clients[2].emit("leaveRoom");
      });
      clients[3].emit("joinRoom", {id: room.id});
    });

    var nbEvents = 0;
    clients[0].on("roomUpdated", function(room) {
      equals("Test Disconnect", room.name);
      if(++nbEvents === 4)
        done();
    });

  });

  it("should handle disconnections", function(done) {

    clients[0].on("roomRemoved", function(id) {
      equals(roomId2, id);
      done();
    });

    clients[1].disconnect();
    clients[2].disconnect();
    clients[3].disconnect();

  });

});
