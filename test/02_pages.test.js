require("blanket")();
var app = require("../app.js");
var request = require("supertest");
var path = require("path");

describe("Static pages", function() {

  before(function(done) {
    __conf.dataPath = path.join(__dirname, "data");
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

  it("should return the about page", function(done) {

    request(__app)
      .get('/about')
      .expect(200, done);

  });

  it("should return a dumb file", function(done) {

    request(__app)
      .get('/raw/dumb.txt')
      .expect(200, done);

  });

});
