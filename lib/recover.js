var rooms = require('./rooms');

// Try to reconnect a socket to left room after unexpected disconnection
module.exports = function(socket) {
  if(!socket.session.identifier) {
    return;
  }

  var found = false;
  for(var i = 0; i < rooms.rooms.length; i++) {
    var room = rooms.rooms[i];
    for(var j = 0; j < room.players.length; j++) {
      var so = room.players[j];
      if(so.player && so.player.disconnected
          && so.session.identifier === socket.session.identifier
          && so.session.username === socket.session.username) {

        // Update the player
        clearTimeout(so.player.disconnectionTimer);
        so.player.disconnected = undefined;
        socket.currentRoom = room;
        socket.player = so.player;
        socket.player.socket = socket; // Update circular reference
        socket.player.username = socket.username;
        room.players[j] = socket; // This is the magic part!

        // Refresh current game state
        socket.emit('roomJoined', room.getPublicInfo());
        socket.emit('gameStarted');
        socket.join('room_' + room.id);
        socket.player.sendWriteChannels();
        socket.player.sendAvailableActions();

        // Subscribe to lost channels
        /// Subscribe to personal channel
        socket.player.join('player-' + socket.username);
        /// Subscribe to role channels
        for(var role in socket.player.roles) {
          for(var channel in socket.player.roles[role].channels) {
            if(socket.player.roles[role].channels[channel].r) {
              socket.player.join(channel);
            }
          }
        }

        /// Subscribe or unsubscribe with personal channels (overrides default role behavior
        for(var channel in socket.player.channels) {
          if(socket.player.channels[channel].r) {
            socket.player.join(channel);
          } else {
            socket.player.leave(channel);
          }
        }

        // Inform player about the current situation
        socket.player.message(__i18n({phrase: "You have been reconnected after a network issue. Sorry, some information may not have been retrieved.", locale: socket.session.locale}))

        // Notify gameplay if needed
        if(room.gameplay.onReconnect)
          room.gameplay.onReconnect(room, socket.player);

        break;
      }
    }
    if(found) break;
  }
};
