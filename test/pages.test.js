require("blanket")();
var app = require("../app.js");
var request = require("supertest");

describe("Main Page", function() {

  before(function(done) {
    app.start(function() {
      done();
    });
  });

  after(function() {
    app.stop();
  });

  it("should return the main page", function(done) {

    request(__app)
      .get('/')
      .expect(200, done);

  });

});