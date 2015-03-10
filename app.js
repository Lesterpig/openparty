global.__conf = require("./config/config.js");

var app     = require("sockpress").init({ secret: __conf.sessionSecret });
var join    = require("path").join;
var colors  = require("colors");
var i18n    = require("i18n");
var version = require("./package.json").version;
var rooms   = require("./lib/rooms");
var isMain  = !module.parent;

global.__app  = app;
global.__i18n = i18n.__; // Note : do not use this variable in modules

i18n.configure({
    locales: __conf.locales,
    defaultLocale: __conf.defaultLocale,
    directory: join(__dirname, 'locales'),
    indent: "  ",
    extension: ".js"
});

app.use(i18n.init);
app.use(app.express.static(join(__dirname, "public")));
app.set('view engine', 'ejs');

require("./lib/router.js")(app);

var userCountInterval = null;

module.exports = {

    server: null,

    start: function(callback) {
        require("./lib/loader.js")(__conf.dataPath, function(gametypes) {
            if(Object.keys(gametypes).length === 0)
                return console.log("No gametype available. Please put some gametypes packages in data/ folder.".red);

            global.__gametypes = gametypes;
            global.__staticGametypes = {};
            for(type in gametypes) {
                __staticGametypes[type] = new gametypes[type]();
            }

            this.server = app.listen(__conf.port, __conf.bind, callback);
            userCountInterval = setInterval(function() {
                app.io.emit("userCount", app.io.sockets.sockets.length);
            }, 5000);

        }.bind(this));
    },

    stop: function() {
        clearInterval(userCountInterval);
        this.server.close();
    }

}

if(isMain) {
    module.exports.start(function() {
        console.log(("-- OpenParty " + version + " is ready on port " + __conf.port).green);
    });
}
