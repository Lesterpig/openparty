var crypto = require('crypto');

global.GET_RANDOM = function(from, to) {
  return Math.floor(Math.random() * (to - from + 1)) + from;
};

module.exports = {

  randomString: function(len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
      .toString('base64')   // convert to base64 format
      .slice(0, len)        // return required number of characters
      .replace(/\+/g, '0')  // replace '+' with '0'
      .replace(/\//g, '0'); // replace '/' with '0'
  },

  isInRoom: function(socket, room) {
    return !!socket.rooms[room];
  },

  isInGame: function(socket) {

    if(!socket.currentRoom)
      return false;
    else
      return socket.currentRoom;

  },

  sanitizeHtml: function(string) {
    if(!string)
      return '';
    string = string.replace(/</ig,'&lt;');
    string = string.replace(/>/ig,'&gt;');
    return string;
  },

  checkUsername: function(username) {
    if(username.length > 20)
      throw new Error('Username is too long.');

    username = this.sanitizeHtml(username);
    username = username.trim();

    if(username.length === 0)
      throw new Error('Username is invalid.');

    // already connected ?
    var index = 2;
    var newUsername = username;
    var sockets = __app.io.sockets.sockets;
    while(true) {
      var ok = true;
      for(var socket in sockets) {
        var s_username = sockets[socket].username;
        if(s_username && s_username.toLowerCase() === newUsername.toLowerCase()) {
          ok = false;
          newUsername = username + this.intToExpString(index++);
          break;
        }
      }
      if(ok) break;
    }
    return newUsername;
  },

  intToExpString: function(n) {
    var data = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

    if(n <= 0) {
      return data[0];
    }

    var out = '';
    while(n > 0) {
      out = data[n%10] + out;
      n = Math.floor(n/10);
    }
    return out;
  },

  /** TYPES */

  isString: function(s) {
    return typeof s === 'string' || s instanceof String;
  },

  isFunction: function(f) {
    return typeof f === 'function';
  },

  isInteger: function(i) {
    return i === parseInt(i, 10);
  },

  isArray: function(a) {
    return require('util').isArray(a);
  },

  isObject: function(o) {
    return typeof o === 'object';
  }
};
