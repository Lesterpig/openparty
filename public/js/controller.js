angular.module('openparty', [
    'btford.socket-io',
    'ngSanitize',
    'luegg.directives' //for scrollGlue directive
]).
factory('socket', function (socketFactory) {
    return socketFactory();
}).
controller('controller', ['$scope', 'socket', '$interval', function ($scope, socket, $interval) {

    // Server data (served on login)

    $scope.gametypes        = {};

    // Live data

    $scope.users = 0;
    $scope.lastPing = 0;

    // Game Status

    $scope.status       = 0;
    $scope.rooms        = [];
    $scope.joinedRoom   = null;
    $scope.selectedRoom = null;
    $scope.localParams  = [];
    $scope.isMaster     = false;
    $scope.showMasterParams = true;

    // Game Chats

    $scope.preChat = "";
    $scope.gameChat = "";
    $scope.channels = {};

    // Timer

    $scope.timer = null;
    $scope.remainingTime = {raw: 0, min: "--", sec: "--"};

    // Actions

    $scope.actions = {};
    $scope.actionsValues = {};

    // Local data

    $scope.playersInfos = {};

    $scope.getPlayerInfos  = function(player) {
        if(!$scope.playersInfos[player.username]) {
            return player.username;
        }
        return $scope.playersInfos[player.username];
    };

    $scope.changeSelectedRoom = function(id) {
        $scope.selectedRoom = id;
    };

    // UP
    $scope.loginSubmit = function() {
        socket.emit("login", {username: $scope.username, password: $scope.password});
    }

    $scope.createRoom = function() {
        socket.emit("createRoom", {name: $scope.roomName, type: $scope.roomType});
    }

    $scope.leaveRoom = function() {
        socket.emit("leaveRoom");
    }

    $scope.startRoom = function() {
        socket.emit("startRoom");
    }

    $scope.joinRoom = function(id) {
        socket.emit("joinRoom", id)
    }

    $scope.incSize = function(inc) {
        socket.emit("setRoomSize", $scope.joinedRoom.size + inc);
    }

    $scope.changeParameter = function(parameter, value) {
        socket.emit("setRoomParameter", {parameter: parameter, value: value});
    }

    $scope.keyChat = function(e, preChat) {
        if(e.keyCode === 13)
            $scope.sendMessage(preChat);
    }

    $scope.sendMessage = function(preChat) {
        if(preChat) {
            socket.emit("sendMessage", { channel: "preChat", message: $scope.chatMessage });
        } else {
            socket.emit("sendMessage", { channel: $scope.selectedChannel, message: $scope.chatMessage });
        }
    }

    $scope.executeAction = function(action) {
        var data = {action: action};
        if($scope.actions[action].type !== "button") {
            data.value = $scope.actionsValues[action];
        }
        socket.emit("executeAction", data);
    }

    $interval(function() {
        $scope.lastPing = new Date().getTime();
        socket.emit("ping");
    }, 5000);

    // DISCONNECTION MANAGEMENT

    socket.on("disconnect", function() {
        $scope.status = -1;
    });

    socket.on("reconnect", function() {
        window.location = "/";
    });

    // DOWN

    socket.on("pong", function() {
        $scope.ping = new Date().getTime() - $scope.lastPing;
    });

    socket.on("userCount", function(c) {
        $scope.users = c;
    });

    socket.on("loginResult", function(o) {
        if(o.err) {
            $scope.loginError = "has-error";
            $scope.loginErrorMessage = o.err;
            return;
        }

        $scope.gametypes = o.gametypes;
        for(i in o.gametypes) {
            $scope.roomType = i; break;
        }
        $scope.status = 1;
        $scope.username = o.username;
        socket.emit("getRooms");
    });


    /** GLOBAL LOBBY FUNCTIONS **/
    socket.on("roomCreated", function(room) {
        $scope.rooms.push(room);
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
            }
        }
    });

    socket.on("roomsList", function(rooms) {
        $scope.rooms = rooms;
    });

    /** PERSONNAL LOBBY FUNCTIONS **/
    socket.on("roomJoined", function(room) {
        $scope.joinedRoom = room;
        $scope.isMaster = false;
        updateLocalParameters(room);
    });

    socket.on("roomLeft", function() {
        $scope.joinedRoom = null;
        $scope.isMaster   = false;
        $scope.preChat    = "";
        $scope.gameChat   = "";
        $scope.status     = 1;
    });

    /** CHAT **/
    socket.on("messageSent", function() {
        $scope.chatMessage = "";
    });

    socket.on("chatMessage", function(data) {

        if(data.sender)
            data.sender += ": ";
        else
            data.sender = "";

        if(!$scope.joinedRoom.started)
            $scope.preChat += getDate() + " " + data.sender + data.message + "\n";

        else {
            $scope.gameChat += data.sender + data.message + "<br />";
        }
    });

    socket.on("setAllowedChannels", function(data) {

        $scope.channels = data;

        if(!$scope.selectedChannel && data.general)
            $scope.selectedChannel = "general";
    });

    socket.on("clearChat", function() {
        $scope.gameChat = "";
        $scope.preChat  = "";
    });

    /** ROOM EVENTS */

    socket.on("gameStarted", function(room) {
        $scope.status = 2;
        $scope.gameInfo = "";
        $scope.gameChat = "";
        $scope.playersInfos = {};
    });

    socket.on("setGameInfo", function(data) {
        $scope.gameInfo = data;
    });

    socket.on("setTimer", function(data) {
        $interval.cancel($scope.timer);
        $scope.remainingTime.raw = +data;
        $scope.timer = $interval($scope.writeTimer, 1000);
        $scope.writeTimer();
    });

    socket.on("clearTimer", function(data) {
        $scope.remainingTime.min = "--";
        $scope.remainingTime.sec = "--";
        $interval.cancel($scope.timer);
    });

    socket.on("setAvailableActions", function(data) {
        $scope.actions = data;
        for(action in $scope.actions) {
            if($scope.actions[action].type === "select") {
                if($scope.actions[action].options.safeChoices.length >= 1)
                    $scope.actionsValues[action] = $scope.actions[action].options.safeChoices[0];
            }
        }
    });

    socket.on("playerInfo", function(data) {
        $scope.playersInfos[data.username] = data.value;
    });

    $scope.writeTimer = function() {

        var time = $scope.remainingTime.raw--;

        if(time <= 0) {
            $scope.remainingTime.min = "--";
            $scope.remainingTime.sec = "--";
            $interval.cancel($scope.timer);
            return;
        }

        var min = Math.floor(time / 60);
        var sec = time % 60;

        if(min < 10) min = "0" + min;
        if(sec < 10) sec = "0" + sec;

        $scope.remainingTime.min = min;
        $scope.remainingTime.sec = sec;

    };

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
    };

    function getDate() {
        var date = new Date();
        var h    = date.getHours();
        var i    = date.getMinutes();

        if(h < 10) h = "0" + h;
        if(i < 10) i = "0" + i;

        return "["+h+":"+i+"]";
    };


}]);
