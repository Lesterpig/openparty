require("blanket")();
var equals = require("assert").strictEqual;
var assert = require("assert");
var utils  = require("../lib/utils.js");

describe("Utils", function() {

  describe("isString(s)", function() {

    it("should return true with strings", function() {
      equals(true, utils.isString("Hello!"));
      equals(true, utils.isString(new String("Hello!")));
    });

    it("should return false with non-strings", function() {
      equals(false, utils.isString(52));
      equals(false, utils.isString(true));
      equals(false, utils.isString());
    });

  });

  describe("GET_RANDOM(from,to)", function() {

    it("should return random number between from and to", function() {
      for(var i = 0; i < 1000; i++) {
        var _res = GET_RANDOM(5,59);
        assert(_res >= 5 && _res <= 59);
      }
    });

    it("should include from & to", function() {
      var found = {};
      while(1) {
        var _res = GET_RANDOM(1,4);
        found[_res] = true;
        if(found[1] && found[2] && found[3] && found[4]) break;
      }
    });

    it("should work is bounds are the same number", function() {
      for(var i = 0; i < 10; i++) {
        var _res = GET_RANDOM(5,5);
        assert.equal(5, _res);
      }
    });

    it("should work with negative numbers", function() {
      var found = {};
      while(1) {
        var _res = GET_RANDOM(-2,2);
        found[_res] = true;
        if(found[-2] && found[-1] && found[0] && found[1] && found[2]) break;
      }
    });

  });

});