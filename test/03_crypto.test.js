require("blanket")();
var equals = require("assert").strictEqual;
var assert = require("assert");
var crypto  = require("../lib/crypto.js");

// Constants

var publicKey = "-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v2.1.0\nComment: http://openpgpjs.org\n\nxo0EVunDvgED/3eM2Ee7cd7RwJNiyZSvZMCAxPf1S5+v4uk7LFM81yCk3wqi\nM0WdqgNTxl2hJ9M+Do6VEy9KJWBKkNcZ912lhZfZtr/s8vNUqD1ogcV/aWQ/\njV52gn3FiaURcKSGGCuitD0mXizDR81WXqOdEsAuCCY3D5BSd0TYIXfs0uKh\n4hbbABEBAAHNDk15IFVzZXJuYW1lIDw+wrUEEAEIACkFAlbpw74GCwkIBwMC\nCRCEnDUVl8koIwQVCAIKAxYCAQIZAQIbAwIeAQAATVwD/090MOKy1zyfg8n/\nvwkbGkSJYxkiAFcEgX3YtxebUTLav+OvUmMhxd4zfYjyPqWDsd4G/kOMiETb\n4k6dMRIHH/LrfFA1Ga/aP+wWL8vALGJL0ZEXbFBhjUNDcP9Ekuo/zZDA1Gkb\nViXUewRy0VxdunwE6hF1huyKkWb6rzU+4xeUzo0EVunDvgEEAOnzv33VODLp\nEaQbMTSKRzlIfLtD50Zc1B3c993wOTblfhQc5H8WI+IfESVjHH34bp7gLymw\ngRRWLRvzU2OyHB4rHc11JmIZfELSJMymmmvLdii7ZxOy476LX/GAPylQ9ezY\nhUQJPOtq/BNyftA14xLEJFIW4d8lvaD7Bmx90G37ABEBAAHCnwQYAQgAEwUC\nVunDvgkQhJw1FZfJKCMCGwwAABpjA/9FGx/AX2zF/nJgeOiuHQsUd3YaCwYj\n2chPVzPzZgBw9Ommup/Pv3n/uoOX+y8lRVOKC2W8ugQC+Jx3L/NFRv1vdZpw\nRR6TTTzg5oP0BNovzusgBek1K4l7mS3Hj7rM6pMPJMladuE9xDZDOfTPOalq\n8/QWtiR0pAAKSi8Xd14Now==\n=9sR1\n-----END PGP PUBLIC KEY BLOCK-----"

var signature = "-----BEGIN PGP SIGNED MESSAGE-----\nHash: SHA256\n\nRandom challenge\n-----BEGIN PGP SIGNATURE-----\nVersion: OpenPGP.js v2.1.0\nComment: http://openpgpjs.org\n\nwpwEAQEIABAFAlbpw78JEIScNRWXySgjAABBegP/aPtecvCzMpa6SgZZxUW7\neHkucRcsl03t4xhVuyYZegx99euJU7vB3l1Png9+g2bvfOXnSd7KDOXgOMwW\nNZg0+VodBIO6zlX5UD01erAvUt5XV3k04D2T1d/jRIxt27o595RBhfaO8uLQ\nE7VZQ5xl0YW9gMxwD9bNfF4a2NRg/LA=\n=AjV4\n-----END PGP SIGNATURE-----"

describe("Crypto", function() {

  describe("generateChallenge()", function() {

    it("should generate a string long enough", function() {
      var challenge = crypto.generateChallenge();
      equals(true, challenge.length > 16);
    });

    it("should be unique and fast enough", function() {
      var lastChallenges = [];
      for(var i = 0; i < 2000; i++) {
        var challenge = crypto.generateChallenge();
        equals(-1, lastChallenges.indexOf(challenge));
        lastChallenges.push(challenge);
      }
    });

  });

  describe("verifyChallenge(challenge, key, message, callback)", function() {

    it("should check challenge response and get correct username and fingerprint", function(done) {
      var challenge = "Random challenge";
      var fingerprint = "be3cdd5edc62d1085082944b849c351597c92823";
      crypto.verifyChallenge(challenge, publicKey, signature, function(err, res) {
        equals(null, err);
        equals(true, res.success);
        equals(fingerprint, res.fingerprint);
        equals("My Username", res.username);
        done();
      });
    });

    it("should refuse invalid challenge", function(done) {
      crypto.verifyChallenge("BAD", publicKey, signature, function(err, res) {
        equals(false, res.success);
        done();
      });
    });

    it("should refuse forged signature", function(done) {
      var forgedSignature = signature.replace(/Random challenge/, "BAD");
      crypto.verifyChallenge("BAD", publicKey, forgedSignature, function(err, res) {
        equals(false, res.success);
        done();
      });
    });

    it("should refuse malformed keys", function(done) {
      crypto.verifyChallenge("BAD", "invalid key", signature, function(err, res) {
        equals(false, res.success);
        done();
      });
    });

    it("should refuse malformed signature", function(done) {
      crypto.verifyChallenge("BAD", publicKey, "invalid signature", function(err, res) {
        equals(false, res.success);
        done();
      });
    });
  });

});
