module.exports = function() {

  var role1 = {
    channels: {
      a: {r: true, w: true, n: "Channel A"},
      b: {r: true, w: false,n: "Channel B"}
    },
    actions: {
      button: {
        isAvailable: function(player) {
          return player.socket.username === "p0";
        },
        type: "button",
        options: {
          submit: "Choose",
        },
        execute: function(player) {
          player.room.message("executed_ok");
        }
      },
      player: {
        isAvailable: function(player) {
          return true;
        },
        type: "select",
        options: {
          submit: "Choose",
        },
        execute: function(player, choice) {
          player.room.message(choice.socket.username);
        }
      },
      choose: {
        isAvailable: function(player) {
          return true;
        },
        type: "select",
        options: {
          choices: ["One", "Two"],
          submit: "Choose",
        },
        execute: function(player, choice) {
          player.room.message("general", choice);
        }
      },
      chooseFn: {
        isAvailable: function(player) {
          return player.room.currentStage === "stageA";
        },
        type: "select",
        options: {
          choices: function() { return [1,2,3]; },
          submit: "Choose",
        },
        execute: function(player, choice) {
          player.room.message("general", choice);
        }
      }
    }
  };

  var role2 = {
    channels: {
      b: {r: false, w: true, n: "Channel B"}
    },
    actions: {}
  }

  return {
    name: "Test",
    description: "A Test Gamepley",

    minPlayers: 4,
    maxPlayers: 6,
    firstStage: "stageA",
    reconnectDelay: 1,

    sounds: [
      {id: "sound", path: "sound.mp3"}
    ],

    parameters: [
      {
        name: "Number of things",
        type: Number,
        value: 1,
        help: "-"
      },
      {
        name: "Checkbox",
        type: Boolean,
        foo: "bar",
        value: true
      }
    ],

    stages: {
      "stageA": {
        start: function(room, cb) {
          cb(null, 5);
        },
        end: function(room) {}
      },
      "infinite": {
        start: function(room, cb) {
          cb(null, -1);
        },
        end: function(room) {}
      },
      "short": {
        start: function(room, cb) {
          cb(null, 0.2);
        },
        end: function(room) {
          room.nextStage("infinite");
        }
      }
    },

    processMessage: function(channel, message, player) {
      if(message === "remove_role_1") {
        player.setRole("role1", null);
        return false;
      } else if(message === "setup_action") {
        player.setAction("test", {
          isAvailable: function(player) {
            return true;
          },
          type: "button",
          options: {
            submit: "yolo",
          },
          execute: function(player) {
            player.room.message("executed_ok");
          }
        });
      } else if(message === "setup_channels") {
        player.setChannel("a", {r: false, w: false});
        player.setChannel("c", {r: true, w: true, n: "Channel C"});
      } else {
        return message;
      }
    },

    init: function() {},

    onDisconnect: function(room, player) {
      if(player.room !== room)
        throw new Error("Invalid callback");
    },

    onReconnect: function(room, player) {
      if(player.room !== room)
        throw new Error("Invalid callback");
    },

    start: function(room, callback) {

      if(!room.enableStart) return callback("not_enabled");

      room.players[0].player.setRole("role1", role1);
      room.players[1].player.setRole("role1", role1);
      room.players[2].player.setRole("role2", role2);
      room.players[3].player.setChannel("general", {r: false, w: false}); // Disable all channels
      callback(null);
    }
  }

};
