module.exports = function() {

    return {
        name: "Test",
        description: "A Test Gamepley",

        minPlayers: 6,
        maxPlayers: 30,

        parameters: [
            {
                name: "Number of things",
                type: Number,
                value: 1,
                help: "-"
            }
        ],

        init: function() {},

        start: function(room, callback) {
            callback(null);
        }
    }

};