angular.module('openparty', [
    'btford.socket-io',
    'ngSanitize',
    'luegg.directives', //for scrollGlue directive
    'ngAudio'
]).
filter('parseUrlFilter', function () { // the "linky" filter is not suitable due to the html sanitization
  var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
  return function (text, target) {
    return text.replace(urlPattern, '<a target="' + target + '" href="$&">$&</a>');
  };
}).
factory('socket', function (socketFactory) {
  return socketFactory();
}).
controller('controller', ['$scope', 'socket', '$interval', 'ngAudio', 'crypto', function ($scope, socket, $interval, ngAudio, crypto) {

  // Server data (served on login)

  $scope.gametypes = {};

  // Live data

  $scope.users    = {lobby: 0, playing: 0};
  $scope.lastPing = 0;

  // Game Status

  $scope.status           = 0;
  $scope.rooms            = [];
  $scope.joinedRoom       = null;
  $scope.selectedRoom     = null;
  $scope.localParams      = [];
  $scope.isMaster         = false;
  $scope.showMasterParams = false;

  // Game Chats

  $scope.preChat             = '';
  $scope.gameChat            = '';
  $scope.channels            = {};
  $scope.manualChannelChange = false;

  // Timer

  $scope.timer         = null;
  $scope.timerEnd      = null;
  $scope.remainingTime = {min: '--', sec: '--'};

  // Actions

  $scope.actions       = {};
  $scope.actionsValues = {};

  // Local data

  $scope.playersInfos = {};
  $scope.authUsername = localStorage['PGP_Username'];
  $scope.username     = $scope.authUsername || (window.location.hash ? window.location.hash.substr(1) : '');
  $scope.audio        = {};
  $scope.mute         = localStorage['mute'];
  var availableThemes = ['default', 'darkly'];
  $scope.theme        = +localStorage['theme'] || 0;
  $scope.overlay      = '';

  if($scope.mute === 'on') {
    ngAudio.mute();
  }

  // Header

  var baseTitle = document.title;

  $scope.updateTitle = function() {
    var output = baseTitle;
    if($scope.joinedRoom) {
      if($scope.joinedRoom.started) {
        output = '❱ ' + output;
      }
      else {
        output = '[' + $scope.joinedRoom.players.length + '/' + $scope.joinedRoom.size +'] ' + output;
      }
    }
    document.title = output;
  };

  $scope.printHelp = function(help) {
    $scope.roomHelpMessage = help;
  };

  $scope.getPlayerInfos  = function(player) {
    if(!$scope.playersInfos[player.username]) {
      return player.username;
    }
    return $scope.playersInfos[player.username];
  };

  $scope.changeSelectedRoom = function(id) {
    $scope.selectedRoom = id;
    $scope.invalidRoomPassword = false;
  };

  $scope.changeTheme = function(n) {
    if(n === undefined) {
      localStorage['theme'] = $scope.theme = ($scope.theme + 1) % availableThemes.length;
    }
    // Doing a raw update to optimize refresh
    document.getElementById('stylesheet').href = 'css/bootstrap.' + availableThemes[$scope.theme] + '.min.css';
  };
  $scope.changeTheme($scope.theme); // Initial call

  // UP
  $scope.loginSubmit = function() {
    var req = {username: $scope.username, password: $scope.password};

    if($scope.authUsername !== $scope.username) {
      $scope.authUsername = '';
    }

    if($scope.authUsername) {
      crypto.getChallengeResponse($scope.challenge).then(function(data) {
        req.key = data.key;
        req.message = data.message;
        socket.emit('login', req);
      }, function() {
        socket.emit('login', req);
      });
    } else {
      socket.emit('login', req);
    }
  };

  $scope.logout = function() {
    socket.emit('logout');
  };

  $scope.createRoom = function() {
    socket.emit('createRoom', {name: $scope.roomName, type: $scope.roomType, password: $scope.roomPassword});
  };

  $scope.leaveRoom = function() {
    socket.emit('leaveRoom');
  };

  $scope.startRoom = function() {
    socket.emit('startRoom');
  };

  $scope.joinRoom = function(id, password) {
    $scope.invalidRoomPassword = false;
    socket.emit('joinRoom', {id: id, password: password});
  };

  $scope.kickPlayer = function(username) {
    socket.emit('kickPlayer', username);
  };

  $scope.incSize = function(inc) {
    socket.emit('setRoomSize', $scope.joinedRoom.size + inc);
  };

  $scope.changeParameter = function(parameter, value) {
    socket.emit('setRoomParameter', {parameter: parameter, value: value});
  };

  $scope.keyChat = function(e, preChat) {
    if(e.keyCode === 13)
      $scope.sendMessage(preChat);
  };

  $scope.sendMessage = function(preChat) {
    if(preChat) {
      socket.emit('sendMessage', { channel: 'preChat', message: $scope.chatMessage });
    } else {
      socket.emit('sendMessage', { channel: $scope.selectedChannel, message: $scope.chatMessage });
    }
  };

  $scope.executeAction = function(action) {
    var data = {action: action};
    if($scope.actions[action].type !== 'button') {
      data.value = $scope.actionsValues[action];
    }
    socket.emit('executeAction', data);
  };

  $scope.register = function() {
   $scope.registering = true;
   crypto.generateKey($scope.username).then(function() {
    $scope.registered = true;
   });
  };

  $scope.unregister = function() {
    if(confirm('Confirm?')) {
      delete localStorage['PGP_Username'];
      $scope.overlay = $scope.authUsername = '';
    }
  };

  $interval(function() {
    $scope.lastPing = new Date().getTime();
    socket.emit('o-ping');
  }, 10000);

  // DISCONNECTION MANAGEMENT

  socket.on('emergencyMessage', function(msg) {
    $scope.emergencyMessage = msg;
  });

  socket.on('disconnect', function() {
    if(!$scope.disableWarning)
      $scope.status = -1;
  });

  socket.on('reconnect', function() {
    window.location.reload();
  });

  window.onbeforeunload = function() {
    $scope.disableWarning = true;
  };

  // DOWN

  socket.on('o-pong', function() {
    $scope.ping = new Date().getTime() - $scope.lastPing;
  });

  socket.on('userCount', function(c) {
    $scope.users = c;
  });

  socket.on('challenge', function(c) {
    $scope.challenge = c;
  });

  socket.on('reconnectInvitation', function(username) {
    $scope.username = username;
    $scope.loginSubmit();
  });

  socket.on('loginResult', function(o) {
    if(o.err) {
      $scope.loginError = 'has-error';
      $scope.loginErrorMessage = o.err;
      return;
    }

    // Write username in URL for further use
    window.location = window.location.origin + '/#' + $scope.username;

    $scope.gametypes = o.gametypes;
    for(var i in o.gametypes) {
      $scope.roomType = i; break;
    }
    $scope.status = 1;
    $scope.username = o.username;
    socket.emit('getRooms');
  });


  /** GLOBAL LOBBY FUNCTIONS **/

  socket.on('roomCreated', function(room) {
    $scope.rooms.push(room);
    $scope.updateTitle();
  });

  socket.on('roomRemoved', function(id) {
    for(var i = 0; i < $scope.rooms.length; i++) {
      if($scope.rooms[i].id === id) {
        $scope.rooms.splice(i, 1);
        return;
      }
    }
  });

  socket.on('roomUpdated', function(room) {

    for(var i = 0; i < $scope.rooms.length; i++) {
      if($scope.rooms[i].id === room.id) {
        $scope.rooms[i] = room;
        if(room.started) {
          $scope.rooms.splice(i,1); // remove from lobby
        }
        break;
      }
    }

    if($scope.joinedRoom) {
      if($scope.joinedRoom.id === room.id) {
        $scope.joinedRoom = room;
        updateLocalParameters(room);
        $scope.updateTitle();
      }
    }
  });

  socket.on('roomsList', function(rooms) {
    $scope.rooms = rooms;
  });

  /** PERSONNAL LOBBY FUNCTIONS **/

  socket.on('roomJoined', function(room) {
    $scope.joinedRoom = room;
    $scope.isMaster = false;
    $scope.preChat = '';
    updateLocalParameters(room);
    $scope.updateTitle();

    // Preload default sounds
    if(room.gameplay.sounds){
      room.gameplay.sounds.forEach(function(s){
        $scope.audio[s.id] = ngAudio.load(s.path);
      });
    }
  });

  socket.on('invalidRoomPassword', function() {
    $scope.invalidRoomPassword = true;
  });

  socket.on('roomLeft', function() {
    $scope.joinedRoom = null;
    $scope.isMaster   = false;
    $scope.preChat    = '';
    $scope.gameChat   = '';
    $scope.gameInfo = '';
    $scope.status     = 1;
    $scope.updateTitle();
  });

  /** CHAT **/

  socket.on('messageSent', function() {
    $scope.chatMessage = '';
  });

  socket.on('chatMessage', function(data) {

    if(data.sender)
      data.sender = getDate() + ' <strong>' + data.sender + '</strong> : ';
    else
      data.sender = '';

    if(!$scope.joinedRoom || !$scope.joinedRoom.started && !data.lobby)
      $scope.preChat += data.sender + data.message + '\n';
    else if(!data.lobby)
      $scope.gameChat += data.sender + data.message + '<br />';
  });

  socket.on('setAllowedChannels', function(data) {

    var channelsArray = [];
    for(var i in data) {
      data[i].id = i;
      channelsArray.push(data[i]);
    }
    channelsArray.sort(function(a, b) {
      if(!a.p)
        a.p = 0;
      if(!b.p)
        b.p = 0;
      return b.p - a.p; // reversed by priority
    });

    $scope.channels = channelsArray;

    if(!data[$scope.selectedChannel] || !$scope.manualChannelChange) {
      $scope.manualChannelChange = false;
      if(channelsArray.length > 0)
        $scope.selectedChannel = channelsArray[0].id; // the highest priority is selected by default
      else
        $scope.selectedChannel = null; // no channel available
    }

  });

  socket.on('clearChat', function() {
    $scope.gameChat = '';
    $scope.preChat  = '';
  });

  /** ROOM EVENTS */

  socket.on('gameStarted', function(room) {
    $scope.status = 2;
    $scope.playersInfos = {};
    $scope.updateTitle();
  });

  socket.on('setGameInfo', function(data) {
    $scope.gameInfo = data;
  });

  socket.on('setTimer', function(data) {
    $interval.cancel($scope.timer);
    $scope.timerEnd = data;
    $scope.timer = $interval($scope.writeTimer, 200);
    $scope.writeTimer();
  });

  socket.on('clearTimer', function(data) {
    $scope.remainingTime.min = '--';
    $scope.remainingTime.sec = '--';
    $interval.cancel($scope.timer);
  });

  socket.on('setAvailableActions', function(data) {
    $scope.actions = data;
    for(var action in $scope.actions) {
      if($scope.actions[action].type === 'select') {
        if($scope.actions[action].options.safeChoices.length >= 1)
          $scope.actionsValues[action] = $scope.actions[action].options.safeChoices[0];
      }
    }
  });

  socket.on('playerInfo', function(data) {
    $scope.playersInfos[data.username] = data.value;
  });

  /** Audio management */

  socket.on('preloadSound', function(data) {
    if(!$scope.audio[data.id]){
      $scope.audio[data.id] = ngAudio.load(data.path);
    }
  });

  socket.on('playSound', function(data) {
    if($scope.mute === 'on'){
      return;
    }

    if(!data.id){
      data = {id: data};
    }

    if(!$scope.audio[data.id]) {
      $scope.audio[data.id] = ngAudio.play(data.path);
    } else {
      $scope.audio[data.id].play();
    }
    var sound = $scope.audio[data.id];

    sound.pausing = false;
    if(data.loop !== undefined)
      sound.loop = data.loop;
    if(data.volume !== undefined)
      sound.setVolume(data.volume);
  });

  socket.on('stopSound', function(data) {
    if(!data.id){
      data = {id: data};
    }
    if($scope.audio[data.id]){
      $scope.audio[data.id].stop();
    }
  });

  $scope.writeTimer = function() {
    var now = new Date().getTime();
    var time = Math.round(($scope.timerEnd - now) / 1000);

    if(time === Infinity) {
      $scope.remainingTime.min = '--';
      $scope.remainingTime.sec = '--';
      $interval.cancel($scope.timer);
      return;
    }

    var min = Math.floor(time / 60);
    var sec = time % 60;

    if(min < 10) min = '0' + min;
    if(sec < 10) sec = '0' + sec;

    $scope.remainingTime.min = min;
    $scope.remainingTime.sec = sec;

  };

  $scope.toggleMute = function() {
    $scope.mute = ($scope.mute === 'on' ? 'off' : 'on');
    localStorage['mute'] = $scope.mute;
  };

  /** Authentication management **/

  var fingerprints = localStorage['fingerprints'];
  fingerprints = fingerprints ? JSON.parse(fingerprints) : {};

  // TODO This function is to be called many times. We should find a way to cache result in $scope or somewhere else...
  $scope.checkAuth = function(player) {
    if(player.username === $scope.username || !player.authentication)
      return 'none';

    var saved = fingerprints[player.authentication.username];
    if(!saved)
      return 'unknown';

    if(player.authentication.fingerprint === saved)
      return 'ok';

    return 'ko';
  };

  $scope.askFriend = function(player, remove) {
    $scope.friend  = player.authentication;
    $scope.overlay = remove ? 'rmFriend' : 'addFriend';
  };

  $scope.printIdentity = function() {
    $scope.exportData = crypto.exportData();
    $scope.overlay = 'registrationInfo';
  };

  $scope.setFriend = function(remove) {
    fingerprints[$scope.friend.username] = remove ? '' : $scope.friend.fingerprint;
    localStorage['fingerprints'] = JSON.stringify(fingerprints);
    $scope.overlay = false;
  };

  $scope.import = crypto.importData;

  /** PRIVATE **/

  function updateLocalParameters(room) {
    for(var i = 0; i < room.gameplay.parameters.length; i++) {
      $scope.localParams[i] = room.gameplay.parameters[i].value;
    }
    if(!room.players[0])
      return;
    if(room.players[0].username === $scope.username) {
      $scope.isMaster = true;
    }
  }

  function getDate() {
    var date = new Date();
    var h    = date.getHours();
    var i    = date.getMinutes();
    var j    = date.getSeconds();

    if(h < 10) h = '0' + h;
    if(i < 10) i = '0' + i;
    if(j < 10) j = '0' + j;

    return '['+h+':'+i+':'+j+']';
  }


}]);
