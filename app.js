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
global.__version = version;

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
        require("./lib/loader.js")(__conf.dataPath, function(err, gametypes) {
            if(err) {
                console.error(err);
                process.exit();
            }

            if(Object.keys(gametypes).length === 0) {
                return console.log("No gametype available. Please put some gametypes packages in data/ folder.".red);
            }

            global.__gametypes       = gametypes;
            global.__staticGametypes = {};
            global.__customCss       = [];
            for(type in gametypes) {
                __staticGametypes[type] = new gametypes[type]();

                // Has CSS extensions ?
                var css = __staticGametypes[type].css;
                if(css) {
                    __customCss = __customCss.concat(css);
                }

                if(isMain) {
                    console.log(("-- Successfully loaded gameplay file '" + type + "'").grey);
                }
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


    var exitHandled = false;
    function handleExit() {

        if(exitHandled)
            return;
        exitHandled = true;

        console.log(("-- Stopping OpenParty gracefully, please wait " + __conf.shutdownDelay + " seconds...").grey);
        for(var i = __conf.shutdownDelay; i > 0; i--) {
            setTimeout((function(i) {
                return function() {
                    if(i > 1)
                        __app.io.emit("emergencyMessage", "The server will shut down for technical reasons in " + i + " ...");
                    else
                        __app.io.emit("emergencyMessage", null);
                }
            })(i), 1000*(__conf.shutdownDelay - i));
        }
        setTimeout(function() {
            process.exit(0);
        },__conf.shutdownDelay * 1000);
    }

    if(__conf.shutdownDelay) {
        process.on("SIGINT",  handleExit);
        process.on("SIGTERM", handleExit);
    }

}
