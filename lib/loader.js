var path  = require('path');
var fs    = require('fs');
var color = require('colors');
var utils = require('./utils');
var attrs = require('./attrs');

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
        var instance = new module();

        checkMissingAttributes(instance, errorLog);
        checkWrongAttributes(instance, errorLog);

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

var checkMissingAttributes = function(instance, errorLog) {

    for(var attr in attrs) {
        if(!attrs[attr].m) {
            continue;
        }

        if(!instance[attr]) {
            errorLog.push("Missing '" + attr + "' mandatory attribute (" + attrs[attr].t + ")");
        }
    }

};

var checkType = function(e, t) {

    var fn;
    switch(t) {
        case "String":   fn = utils.isString; break;
        case "Function": fn = utils.isFunction; break;
        case "Integer":  fn = utils.isInteger; break;
        case "Array":    fn = utils.isArray; break;
        case "Object":   fn = utils.isObject; break;
    }
    return fn(e);

};

var checkWrongAttributes = function(instance, errorLog) {

    for(var attr in attrs) {
        if(instance[attr] && !checkType(instance[attr], attrs[attr].t)) {
            errorLog.push("'" + attr + "' must be of type (" + attrs[attr].t + ")");
        }
    }

    if(instance.maxPlayers <= 0) {
        errorLog.push("'maxPlayers' must be positive");
    }

    if(instance.minPlayers <= 0) {
        errorLog.push("'minPlayers' must be positive");
    }

    if(instance.maxPlayers < instance.minPlayers) {
        errorLog.push("'minPlayers' is greater than 'maxPlayers'");
    }
}
