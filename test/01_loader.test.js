require("blanket")();
var equals = require("assert").strictEqual;
var assert = require("assert");
var loader = require("../lib/loader.js");
var path   = require("path");

describe("Loader", function() {

    it("should work without any parameter", function() {
        loader();
    });

    it("should load game definitions", function(done) {
        loader(path.join(__dirname, "data"), function(err, data) {
            equals(null, err);
            assert(data.raw);
            done();
        });
    });

    it("should send error if invalid folder", function(done) {
        loader(path.join(__dirname, "wrongFolder"), function(err, data) {
            equals(null, data);
            assert(err);
            done();
        });
    });

    it("should send error if no definition found", function(done) {
        loader(path.join(__dirname, ".."), function(err, data) {
            equals(null, data);
            assert(err);
            done();
        });
    });

});