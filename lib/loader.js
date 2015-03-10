var path  = require('path');
var fs    = require('fs');

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

                ok = true; // TODO definition.js check.
                gametypes[filePath] = require(modulePath);
            }
        });

        if(!ok) {
            return callback("!! No gameplay definition was correct. Aborting.".red, null);
        }

        callback(null, gametypes);

    });
};