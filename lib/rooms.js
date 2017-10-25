var utils   = require('./utils.js');
var players = require('./players.js');
var Player  = players.Player;


var Room = function(name, password, gameplay) {

  this.isRoom = true;
  this.id = utils.randomString(20); // TODO make it better...
  this.players = [];
  this.name = name;
  this.size = gameplay.minPlayers;
  this.creationDate = new Date();
  this.password = password;

  this.gameplay = gameplay;
  this.gameplay.room = this; // circular

  // Stages
  this.started = false;
  this.timeout = null;
  this.currentStage = null;

  if(this.gameplay.init) {
    this.gameplay.init(this);
  }

};

/**
 * Broadcast a message to several sockets
 * @param  {String} [channel]
 * @param  {String} event
 * @param  {*}      [data]
 */
Room.prototype.broadcast = function(channel, event, data) {

  if(data === undefined && channel) {
    data = event;
    event = channel;
    channel = '';
  } else if(channel !== '') {
    channel = '_' + channel;
  }
  __app.io.to('room_' + this.id + channel).emit(event, data);
};

/**
 * Send more information about a player.
 * Client-side, it will be displayed in players list.
 *
 * @param  {String} [channel]
 * @param  {Object} player (socket or Player object)
 * @param  {String} value
 */
Room.prototype.playerInfo = function(channel, player, value) {

  if(!value) {
    if(channel instanceof Player) {
      channel = channel.socket;
    }
    this.broadcast('playerInfo', {username: channel.username, value: player});
  } else {
    if(player instanceof Player) {
      player = player.socket;
    }
    this.broadcast(channel, 'playerInfo', {username: player.username, value: value});
  }
};

/**
 * Send a chat message to players (system message)
 * @param  {String} [channel]
 * @param  {String} message
 */
Room.prototype.message = function(channel, message) {
  if(!message) {
    this.broadcast('chatMessage', {message:channel});
  }
  else {
    this.broadcast(channel, 'chatMessage', {message:message});
  }
};

/**
 * Get public information about the room and its players
 * @return {Object}
 */
Room.prototype.getPublicInfo = function() {
  var output = {};

  output.id       = this.id;
  output.isRoom   = true;
  output.name     = this.name;
  output.players  = [];
  output.size     = this.size;
  output.started  = this.started;
  output.password = !!this.password;

  for(var i = 0; i < this.players.length; i++) {
    output.players.push({
      username: this.players[i].username,
      authentication: this.players[i].authentication,
    });
  }

  var parameters = [];
  this.gameplay.parameters.forEach(function(p) {
    parameters.push({
      name      : p.name,
      value     : p.value,
      help      : p.help,
      isBoolean : p.type === Boolean
    });
  });

  output.gameplay = {
    name        : this.gameplay.name,
    description : this.gameplay.description,
    parameters  : parameters,
    maxPlayers  : this.gameplay.maxPlayers,
    minPlayers  : this.gameplay.minPlayers,
    sounds      : this.gameplay.sounds
  };

  return output;

};

/**
 * Set room size
 * @param {Number} size
 */
Room.prototype.setSize = function(size) {
  if(size >= this.gameplay.minPlayers && size <= this.gameplay.maxPlayers) {
    this.size = size;
    sendUpdateRoom(this);
  }
};

/**
 * Set room parameter
 * @param {}       parameter
 * @param {*}      value
 * @param {Socket} socket
 */
Room.prototype.setParameter = function(parameter, value, socket) {
  this.gameplay.parameters.forEach(function(e) {
    if(e.name === parameter) {
      e.value = e.type(value); //deal with it.
      sendUpdateRoom(this, socket);
      return;
    }
  }.bind(this));
};

Room.prototype.sendMessage = function(channel, message, socket) {
  var allowed = false;

  if(channel === 'preChat') {
    if(this.started) {
      return;
    }
    allowed = true;
    channel = '';
  } else {
    if(!this.started) {
      return;
    }
    var channels = socket.player.getWriteChannels();
    allowed = (channels[channel] ? (true === channels[channel].w) : false);
  }

  if(allowed) {
    socket.emit('messageSent');
    if(this.gameplay.processMessage && this.started) {
      message = this.gameplay.processMessage(channel, message, socket.player);
      if(!message) {
        return;
      }
    }
    this.broadcast(channel, 'chatMessage', {message: message, sender: socket.username});
  }
};

Room.prototype.start = function() {
  players.init(this);
  this.gameplay.start(this, function(err) {

    if(err) {
      return this.broadcast('chatMessage', { message: err });
    }

    this.started = true;
    sendUpdateRoom(this);
    this.broadcast('gameStarted');

    if(this.gameplay.firstStage) {
      this.nextStage(this.gameplay.firstStage);
    }

  }.bind(this));
};

/**
 * End the current stage and start another one
 * @param  {String}   stage    The new stage name
 * @param  {Function} [callback]
 */
Room.prototype.nextStage = function(stage, callback) {
  this.currentStage = stage;
  this.gameplay.stages[stage].start(this, function(err, duration) {
    this.setStageDuration(duration);

    // Send actions to players

    this.players.forEach(function(player) {
      player.player.sendAvailableActions();
    });

    if(callback) {
      callback(null);
    }
  }.bind(this));
};

/**
 * End the current stage, without starting another one
 */
Room.prototype.endStage = function() {
  clearTimeout(this.timeout);
  var endFn = this.gameplay.stages[this.currentStage].end;
  if(endFn)
    endFn(this, function() {});
};

/**
 * Change current stage duration
 * @param {Number} duration (sec)
 */
Room.prototype.setStageDuration = function(duration) {
  clearTimeout(this.timeout);

  if(duration < 0) {
    this.broadcast('clearTimer');
    this.currentStageEnd = Infinity;
    return;
  }

  this.currentStageEnd = new Date().getTime() + duration * 1000;
  this.broadcast('setTimer', this.currentStageEnd);
  this.timeout = setTimeout(this.endStage.bind(this), duration * 1000);
};

/**
 * @return Number Milliseconds before next stage. Can be 'Infinity'.
 */
Room.prototype.getRemainingTime = function() {
  return this.currentStageEnd - new Date().getTime();
};

/**
 * Get player object from username
 * @param  {String} username
 * @return {Socket}
 */
Room.prototype.resolveUsername = function(username) {
  for(var i = 0; i < this.players.length; i++) {
    if(this.players[i].username === username) {
      return this.players[i];
    }
  }
  return null;
};

module.exports = {

  rooms: [],

  getRooms: function() {

    var output = [];
    for(var i = 0; i < this.rooms.length; i++) {
      if(!this.rooms[i].started) {
        output.push(this.rooms[i].getPublicInfo());
      }
    }

    return output;
  },

  createRoom: function(name, password, type, socket) {

    if(__conf.maxRooms && this.rooms.length >= __conf.maxRooms) {
      return;
    }

    if(!type || type === 'default') {
      for(var i in __gametypes) {
        type = i;
        break;
      }
    }

    if(!__gametypes[type]) {
      return;
    }

    var gameplay = new __gametypes[type]();

    // Set sounds path
    if(gameplay.sounds) {
      var sounds = [];
      gameplay.sounds.forEach(function(s){
        if(!s.distant)
          sounds.push({
            id   : s.id,
            path : '/' + type + '/' + s.path
          });
        else
          sounds.push(s);
      });
      gameplay.sounds = sounds;
    }

    var room = new Room(name, password, gameplay);

    this.rooms.push(room);
    __app.io.to('lobby').emit('roomCreated', room.getPublicInfo());
    this.joinRoom(room.id, password, socket);
  },

  getRoom: function(id) {

    for(var i = 0; i < this.rooms.length; i++) {
      if(this.rooms[i].id === id) {
        return this.rooms[i];
      }
    }

    return null;

  },

  joinRoom: function(id, password, socket) {

    var room = this.getRoom(id);
    if(!room) {
      return;
    }

    if(room.players.length >= room.size) {
      var d = (new Date()).getTime();
      if(!room.lastFullNotice || room.lastFullNotice < (d - 60*1000)) {
        room.lastFullNotice = d;
        room.broadcast('chatMessage', {message: '<span class="glyphicon glyphicon-user"></span> <strong>Someone</strong> would like to join this room. Could you add some slots?'});
      }
      return;
    }

    if(room.password && room.password !== password) {
      socket.emit('invalidRoomPassword');
      return;
    }

    if(room.players.indexOf(socket) < 0) {
      room.players.push(socket);
    }

    sendUpdateRoom(room);
    socket.emit('roomJoined', room.getPublicInfo());
    socket.join('room_' + id);
    socket.currentRoom = room;

    room.broadcast('chatMessage', {message: '<span class="glyphicon glyphicon-ok-circle"></span> <strong>' + socket.username + '</strong> has joined the room'});

  },

  leaveRoom: function(socket) {

    var room = socket.currentRoom;
    if(!room) {
      return;
    }

    var i = room.players.indexOf(socket);
    if(i < 0) {
      return;
    }

    room.players.splice(i, 1);

    if(room.gameplay.onDisconnect && socket.player) {
      room.gameplay.onDisconnect(room, socket.player);
    }

    if(!room.started && socket.username) {
      room.broadcast('chatMessage', {message: '<span class="glyphicon glyphicon-remove-circle"></span> <strong>' + socket.username + '</strong> has left the room'});
    }

    if(room)

    if(room.players.length === 0) {
      this.removeRoom(room);
    } else {
      sendUpdateRoom(room);
    }

    socket.player = null;
    socket.currentRoom = null;

    // Leave concerned socket rooms
    // Buffered, because socket.rooms is dynamically updated by socket.io
    var regex  = /^room\_/;
    var buffer = [];
    for(var r in socket.rooms) {
      if(regex.test(socket.rooms[r])) {
        buffer.push(r);
      }
    }

    try {
      buffer.forEach(function(r) {
        socket.leave(r);
      });
      socket.emit('roomLeft');
    } catch(e) {}

  },

  removeRoom: function(room) {

    for(var i = 0; i < this.rooms.length; i++) {
      if(this.rooms[i].id === room.id) {
        clearTimeout(this.rooms[i].timeout);
        this.rooms.splice(i, 1);
        __app.io.to('lobby').emit('roomRemoved', room.id);
        return;
      }
    }

  }

};

/** PRIVATE FUNCTIONS **/

function sendUpdateRoom(room, socket) {
  if(!socket) {
    __app.io.to('lobby').emit('roomUpdated', room.getPublicInfo());
  }
  else {
    socket.broadcast.to('lobby').emit('roomUpdated', room.getPublicInfo());
  }
}
