var utils   = require("./utils.js");
var players = require("./players.js");


var Room = function(name, gameplay) {

    this.isRoom = true;
    this.id = utils.randomString(20);
    this.players = [];
    this.name = name;
    this.size = gameplay.minPlayers;
    this.creationDate = new Date();
    this.gameplay = gameplay;

    // Stages
    this.started = false;
    this.timeout = null;
    this.currentStage = null;

    this.gameplay.init(this);

}

Room.prototype.broadcast = function(channel, event, data) {

    if(data === undefined && channel) {
        data = event;
        event = channel;
        channel = "";
    } else if(channel !== "") {
        channel = "_" + channel;
    }

    __app.io.to("room_" + this.id + channel).emit(event, data);
}

Room.prototype.message = function(channel, message) {
    if(!message)
        this.broadcast("chatMessage", {message:channel});
    else
        this.broadcast(channel, "chatMessage", {message:channel});
}

Room.prototype.getPublicInfo = function() {

    var output = {};

    output.id = this.id;
    output.isRoom = true;
    output.name = this.name,
    output.players = [];
    output.size = this.size;
    output.started = this.started;

    for(var i = 0; i < this.players.length; i++) {
        output.players.push({username: this.players[i].username});
    }

    output.gameplay = {
        name: this.gameplay.name,
        description: this.gameplay.description,
        parameters: this.gameplay.parameters,
    }

    return output;

}


Room.prototype.setSize = function(size) {

    if(size >= this.gameplay.minPlayers && size <= this.gameplay.maxPlayers) {
        this.size = size;
        sendUpdateRoom(this);
    }
}

Room.prototype.setParameter = function(parameter, value, socket) {


    this.gameplay.parameters.forEach(function(e) {
        if(e.name === parameter) {
            e.value = e.type(value); //deal with it.
            sendUpdateRoom(this, socket);
            return;
        }
    }.bind(this));
}

Room.prototype.sendMessage = function(channel, message, socket) {

    var allowed = false;

    if(channel === "preChat") {
        if(this.started) return;
        allowed = true;
        channel = "";
    } else {
        if(!this.started) return;
        channels = socket.player.getWriteChannels();
        allowed = (true == channels[channel].w);
        if(allowed)
            socket.player.emit("message", {channel: channel, message: message});// TODO Check this line
    }

    if(allowed) {
        socket.emit("messageSent");
        if(this.gameplay.processMessage && this.started) {
            message = this.gameplay.processMessage(channel, message, socket.player);
            if(!message) return;
        }
        this.broadcast(channel, "chatMessage", {message: message, sender: socket.username});
    }
}

Room.prototype.start = function() {

    players.init(this);
    this.gameplay.start(this, function(err) {
        if(err)
            return socket.emit("chatMessage", { message: err });

        this.started = true;
        sendUpdateRoom(this);
        this.broadcast("gameStarted");

        if(room.gameplay.firstStage)
            this.nextStage(room.gameplay.firstStage);

    }.bind(this));
}

Room.prototype.nextStage = function(stage) {

    this.gameplay.stages[stage].start(this, function(err, duration) {
        this.currentStage = stage;
        this.setStageDuration(duration);

        // Send actions to players 

        this.players.forEach(function(player) {
            player.player.sendAvailableActions();
        });

    }.bind(this));

}

Room.prototype.endStage = function() {
    clearTimeout(this.timeout);
    this.gameplay.stages[this.currentStage].end(this, function() {});
}

Room.prototype.setStageDuration = function(duration) {

    clearTimeout(this.timeout);

    if(duration < 0) {
        this.broadcast("clearTimer");
        return;
    }

    this.broadcast("setTimer", duration);
    this.timeout = setTimeout(this.endStage.bind(this), duration * 1000);
}

Room.prototype.resolveUsername = function(username) {
    for(i = 0; i < this.players.length; i++) {
        if(this.players[i].username === username)
            return this.players[i];
    }
    return null;
}

rooms = module.exports = {

    rooms: [],

    getRooms: function() {

        var output = [];
        for(var i = 0; i < this.rooms.length; i++) {
            if(!this.rooms[i].started)
                output.push(this.rooms[i].getPublicInfo());
        }

        return output;
    },

    createRoom: function(name, type, socket) {

        if(!type || type === "default") {
            for(i in __gametypes) {
                type = i;
                break;
            }
        }

        if(!__gametypes[type])
            return;

        var gameplay = new __gametypes[type]();

        room = new Room(name, gameplay);

        this.rooms.push(room);
        __app.io.to("lobby").emit("roomCreated", room.getPublicInfo());
        this.joinRoom(room.id, socket);
    },

    getRoom: function(id) {

        for(var i = 0; i < this.rooms.length; i++) {
            if(this.rooms[i].id === id) return this.rooms[i];
        }

        return null;

    },

    joinRoom: function(id, socket) {

        var room = this.getRoom(id);
        if(!room)
            return;

        if(room.players.length >= room.size)
            return;

        if(room.players.indexOf(socket) < 0) {
            room.players.push(socket);
        };

        sendUpdateRoom(room);
        socket.emit("roomJoined", room.getPublicInfo());
        socket.join("room_" + id);
        socket.currentRoom = room;

        room.broadcast("chatMessage", {message: socket.username + " has joined the room"});

    },

    leaveRoom: function(socket) {

        var room = socket.currentRoom;
        if(!room)
            return;

        var i = room.players.indexOf(socket);
        if(i < 0)
            return;

        if(room.gameplay.onDisconnect && socket.player) {
            room.gameplay.onDisconnect(room, socket.player);
        }

        room.players.splice(i, 1);
        if(room.players.length === 0) {
            this.removeRoom(room);
        } else {
            sendUpdateRoom(room);
        }

        socket.currentRoom = null;
        socket.leave("room_" + room.id);
        try {
            socket.emit("roomLeft");
            room.broadcast("chatMessage", {message: socket.username + " has left the room"});
        } catch(e) {}

    },

    removeRoom: function(room) {

        for(var i = 0; i < this.rooms.length; i++) {
            if(this.rooms[i].id === room.id) {
                clearTimeout(this.rooms[i].timeout);
                this.rooms.splice(i, 1);
                __app.io.to("lobby").emit("roomRemoved", room.id);
                return;
            }
        }

    }

};

/** PRIVATE FUNCTIONS **/

function sendUpdateRoom(room, socket) {
    if(!socket)
        __app.io.to("lobby").emit("roomUpdated", room.getPublicInfo());

    else
        socket.broadcast.to("lobby").emit("roomUpdated", room.getPublicInfo());
}