var openpgp = require('openpgp');
var uuid = require('node-uuid');

module.exports = {

  generateChallenge: function() {
    return uuid.v4();
  },

  verifyChallenge: function(challenge, key, message, callback) {

    var m, k;
    try {
      k = openpgp.key.readArmored(key).keys[0];
      m = openpgp.cleartext.readArmored(message);
    } catch(e) {
      return callback(e, { success: false });
    }

    openpgp.verify({
      publicKeys: k,
      message: m,
    })
    .then(function(r) {

      var rawUsername = k.users[0].userId.userid;

      callback(null, {
        success: challenge === r.data,
        username: rawUsername.substr(0, rawUsername.length - 3), // remove ugly ' <>' added by openpgp
        fingerprint: k.primaryKey.fingerprint,
      });

    })
    .catch(function(e) { callback(e, { success: false }); });
  },

};

/*
console.log(module.exports.generateChallenge());


var options = {
  userIds: { name:'My Username', email:'' },
  numBits: 1024,
  unlocked: true,
};

var k;
var p;
var challenge = 'Random challenge';

openpgp.generateKey(options)
.then(function(key) {

  p = key.publicKeyArmored;
  console.log(p);
  k = key;
  return openpgp.sign({data: challenge, privateKeys: k.key});

})
.then(function(message) {

  var key = openpgp.key.readArmored(p).keys;
  console.log(message.data);
  message = openpgp.cleartext.readArmored(message.data);
  return openpgp.verify({publicKeys: key, message: message});

})
.then(function(result) {

  var key = openpgp.key.readArmored(p).keys;
  console.log('Fingerprint:', key[0].primaryKey.fingerprint);

})
.catch(function(e) {
  console.log(e);
});

*/
