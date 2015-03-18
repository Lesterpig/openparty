var path  = require('path');
var fs    = require('fs');
var color = require('colors');
var utils = require('./utils');

module.exports = function(basePath, callback) {

    if(!basePath)
        basePath = path.join(__dirname, "..", "data");
    if(!callback)
        callback = function(){};

    var gametypes = {};

    fs.readdir(basePath, function(err, files) {

        if(err) {
           return callback( "!! Unable to load game definitions\n".red +
                            "   Install gameplay definitions in data/ subdirectory\n".red +
                            ("   Was: " + err).red, null);
        }

        var ok = false;

        files.forEach(function(filePath) {
            if(fs.statSync(path.join(basePath, filePath)).isDirectory()) {

                var modulePath = path.join(basePath, filePath, "definition.js");
                if(!fs.existsSync(modulePath))
                    return;

                if((module = checkFile(modulePath))) {
                    ok = true;
                    gametypes[filePath] = module;
                }
            }
        });

        if(!ok) {
            return callback("!! No gameplay definition was correct. Aborting.".red, null);
        }

        callback(null, gametypes);

    });
};

var checkFile = function(path) {

    var errorLog = [];

    try {
        module = require(path);
        instance = new module();

        // Missing mandatory arguments

        if(!instance.name || !utils.isString(instance.name)) {
            errorLog.push("Missing 'name' attribute (String)");
        }

        if(!instance.start || !utils.isFunction(instance.start)) {
            errorLog.push("Missing 'start' attribute (Function)");
        }

        if(!instance.minPlayers || !utils.isInteger(instance.minPlayers)) {
            errorLog.push("Missing 'minPlayers' attribute (Integer)");
        }

        if(!instance.maxPlayers || !utils.isInteger(instance.maxPlayers)) {
            errorLog.push("Missing 'maxPlayers' attribute (Integer)");
        }

        // Wrong arguments
        
        if(instance.maxPlayers <= 0) {
            errorLog.push("'maxPlayers' must be positive");
        }

        if(instance.minPlayers <= 0) {
            errorLog.push("'minPlayers' must be positive");
        }

        if(instance.maxPlayers < instance.minPlayers) {
            errorLog.push("'minPlayers' is greater than 'maxPlayers'");
        }


        if(errorLog.length === 1) {
            throw new Error("One semantic failure");
        } else if(errorLog.length > 1) {
            throw new Error(errorLog.length + " semantic failures");
        }
            

        // Everything is ok!
        return module;
    } catch(e) {
        console.error(("~~ Cannot load '" + path + "'\n   " + e).yellow)
        errorLog.forEach(function(a) {
            console.error(("   - " + a).gray.italic);
        });
        return null;
    }
};