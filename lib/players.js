var utils = require('./utils.js');

var Player = function(socket, room) {

  /**
   * roles = {
   *     <name>: {channels: {}, actions: {}},
   *     ...
   * }
   *
   */
  this.roles = {};

  this.channels = {};
  this.actions  = {};

  this.socket = socket; // circular
  this.room = room; // circular
  this.username = socket.username;

};

Player.prototype.join = function(channel) { this.socket.join('room_' + this.room.id + '_' + channel); };
Player.prototype.leave = function(channel) { this.socket.leave('room_' + this.room.id + '_' + channel); };

Player.prototype.setRole = function(role, value) {
  if(!value && this.roles[role]) {
    // Remove all registered channels
    for(var channel in this.roles[role].channels) {
      if(this.roles[role].channels[channel].r && !this.channels[channel]) {
        this.leave(channel);
      }
    }
  } else if(value) {
    // Join all channels
    for(var channel in value.channels) {
      if(value.channels[channel].r) {
        this.join(channel);
      }
    }
  }
  setAttributeObject(this, 'roles', role, value);
  this.sendWriteChannels();
};

Player.prototype.setAction = function(name, value) {
  setAttributeObject(this, 'actions', name, value);
};

Player.prototype.setChannel = function(name, rights, silent) {

  if(!rights) {
    if(this.channels[name]) {
      this.leave(name);
      delete this.channels[name];
      // Refreshing channels
      for(var role in this.roles) {
        for(var channel in this.roles[role].channels) {
          if(channel === name && this.roles[role].channels[channel].r)
            this.join(channel);
        }
      }
    }
  }

  else {
    if(rights.r) {
      this.join(name);
    }
    else {
      this.leave(name);
    }
    this.channels[name] = rights;
  }
  if(!silent) {
    this.sendWriteChannels();
  }
};

Player.prototype.getWriteChannels = function() {
  var channels = {};

  for(var role in this.roles) {
    for(var channel in this.roles[role].channels) {
      if(this.roles[role].channels[channel].w) {
        channels[channel] = this.roles[role].channels[channel];
      }
    }
  }

  for(var channel in this.channels) { // override 'default' behavior
    if(this.channels[channel].w) {
      channels[channel] = this.channels[channel];
    }
    else {
      delete channels[channel];
    }
  }

  return channels;
};

Player.prototype.sendWriteChannels = function() {
  return this.emit('setAllowedChannels', this.getWriteChannels());
};

Player.prototype.getAvailableActions = function(clone) {
  var output = {};

  // role actions
  for(var role in this.roles) {
    for(var action in this.roles[role].actions) {
      if(this.roles[role].actions[action].isAvailable(this)) {
        output[action] = this.roles[role].actions[action];
      }
    }
  }

  // personal actions (override)
  for(var action in this.actions) {
    if(this.actions[action].isAvailable && this.actions[action].isAvailable(this)) {
      output[action] = this.actions[action];
    } else {
      delete output[action];
    }
  }

  for(var action in output) {
    if(clone) {
      output[action] = {
        type:    output[action].type,
        options: output[action].options
      };
    }

    processActionOptions(output[action], this.room, this);
  }

  return output;
};

Player.prototype.sendAvailableActions = function() {
  return this.emit('setAvailableActions', this.getAvailableActions(true));
};

Player.prototype.emit = function(event, data) {
  if(!this.disconnected) {
    this.socket.emit(event,data);
    return true;
  } else {
    return false;
  }
};

Player.prototype.message = function(m) {
  return this.emit('chatMessage', {message: m});
};

module.exports = {

  init: function(room) {
    room.players.forEach(function(p) {
      p.player = new Player(p, room);
      p.player.setChannel('general', {r:true, w:true, n:'General'},       true);
      p.player.setChannel('player-' + p.player.username, {r: true, w: false}, true);
      p.player.sendWriteChannels();
    });
  },

  Player: Player

};

/** PRIVATE FUNCTIONS **/

function setAttributeObject(p, attr, name, value) {
  if(value === null || value === undefined) {
    delete p[attr][name];
  }

  else {
    p[attr][name] = value;
  }
}

function processActionOptions(action, room, player) {

  switch(action.type) {

    case 'select':

      if(!action.options.choices) {
        action.options.choices = 'players';
      }

      if(utils.isString(action.options.choices)) {

        var out = [];
        room.players.forEach(function(e) {
          out.push(e.username);
        });
        action.options.safeChoices = out;

      } else if(Array.isArray(action.options.choices)) {
        action.options.safeChoices = action.options.choices;
      } else {
        action.options.safeChoices = action.options.choices(room, player);
      }

      break;

    default:
      break;
  }

}
