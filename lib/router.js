var utils  = require("./utils");
var rooms  = require("./rooms");

module.exports = function(app) {

    /**
     * ROOT
     */
    app.get("/", function(req, res) {
        req.session.locale = req.getLocale();
        res.render("index", {types: __gametypes, passwordRequired: __conf.password !== null });
    });

    /**
     * IO : Ping
     */
    app.io.route("ping", function(socket) {
        socket.volatile.emit("pong");
    });

    /**
     * IO : Disconnect
     */
    app.io.route("disconnect", function(socket) {

        var room = utils.isInGame(socket);
        if(!room) return;

        rooms.leaveRoom(socket);
    });

    /**
     * IO : Login
     */
    app.io.route("login", function(socket, data) {

        var locale = socket.session.locale || __conf.defaultLocale;

        if(data.password !== __conf.password && __conf.password !== null || !data.username) {
            return socket.emit("loginResult", {err: __i18n({phrase: "Bad Credentials", locale: locale})});
        }

        // Check username
        try {
            var username = utils.checkUsername(data.username);
        } catch(e) {
            return socket.emit("loginResult", {err: __i18n({phrase: e.message, locale: locale})});
        }

        socket.join("lobby");
        socket.username = username;

        socket.emit("loginResult", {err: null, username: username, gametypes: __staticGametypes});
    });

    /**
     * IO : Get Rooms
     */
    app.io.route("getRooms", function(socket) {
        if(!utils.isInRoom(socket, "lobby"))
            return;
        socket.emit("roomsList", rooms.getRooms());
    });

    /**
     * IO : Create Room
     */
    app.io.route("createRoom", function(socket, data) {
        if(!utils.isInRoom(socket, "lobby"))
            return;
        if(utils.isInGame(socket))
            return;
        rooms.createRoom(data.name, data.type, socket);
    });

    /**
     * IO : Join Room
     */
    app.io.route("joinRoom", function(socket, data) {
        if(!utils.isInRoom(socket, "lobby"))
            return;
        if(utils.isInGame(socket))
            return;
        rooms.joinRoom(data, socket);
    });

    /**
     * IO : Leave Room
     */
    app.io.route("leaveRoom", function(socket) {
        rooms.leaveRoom(socket);
    });

    /**
     * IO : Room Parameters
     */
    app.io.route("setRoomSize", function(socket, data) {
        var room = utils.isInGame(socket);
        if(room && room.players[0] === socket)
            room.setSize(+data);
    });

    app.io.route("setRoomParameter", function(socket, data) {
        var room = utils.isInGame(socket);
        if(room && room.players[0] === socket)
            room.setParameter(data.parameter, data.value, socket);
    });

    /**
     * IO : Chat Management
     */
    app.io.route("sendMessage", function(socket, data) {
        var room = utils.isInGame(socket);
        var message = utils.sanitizeHtml(data.message);
        if(!message)
            return;
        if(room)
            room.sendMessage(data.channel, message, socket);
    });

    /**
     * IO : Start Game !
     */
    app.io.route("startRoom", function(socket) {
        var room = utils.isInGame(socket);
        if(room && room.players[0] === socket)
            room.start();
    });

    /**
     * IO : Execute Action
     */
    app.io.route("executeAction", function(socket, data) {

        if(!socket.player || !data.action)
            return; // Not authorized

        var actions = socket.player.getAvailableActions(false);

        if(!actions[data.action] || actions[data.action].locked)
            return; // Not ready for this action

        if(actions[data.action].type === "select"
            && actions[data.action].options.safeChoices.indexOf(data.value) < 0)
            return; // Bad value

        if(actions[data.action].type === "select"
            && actions[data.action].options.choices === "players") {
            data.value = socket.player.room.resolveUsername(data.value).player;
        }

        actions[data.action].locked = true;
        actions[data.action].execute(socket.player, data.value);
        actions[data.action].locked = false;
    });
}
