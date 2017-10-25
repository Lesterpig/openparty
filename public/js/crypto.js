angular.module('openparty').factory('crypto', ['$q', function($q) {

  openpgp.initWorker({ path:'js/openpgp.worker.min.js' });

  // Return instance
  return {

    generateKey: function(username) {
      var options = {
        userIds: { name: username, email: '' },
        numBits: 1024,
        unlocked: true,
      };

      return openpgp.generateKey(options).then(function(key) {
        localStorage['PGP_Username'] = username;
        localStorage['PGP_Secret']   = key.privateKeyArmored;
        localStorage['PGP_Public']   = key.publicKeyArmored;
      });
    },

    getChallengeResponse: function(challenge) {
      var k;
      return this.getKeys().then(function(keys) {
        k = keys; // Temporary store keys
        return openpgp.sign({
          data: challenge,
          privateKeys: keys.secretKey,
        });
      }).then(function(message) {
        return {
          key: k.publicKey.armor(),
          message: message.data,
        };
      });
    },

    getKeys: function() {
      return $q(function(resolve, reject) {
        var secret, pub;
        try {
          secret = openpgp.key.readArmored(localStorage['PGP_Secret']).keys[0];
          pub    = openpgp.key.readArmored(localStorage['PGP_Public']).keys[0];
        } catch(e) {
          return reject(e);
        }
        resolve({
          secretKey: secret,
          publicKey: pub,
        });
     });
    },

    importData: function(data) {
      try {
        data = JSON.parse(atob(data));
      } catch(e) { return false; }
      localStorage['PGP_Secret']  = data.secret;
      localStorage['PGP_Public']  = data.public;
      localStorage['PGP_Username'] = data.username;
      localStorage['fingerprints'] = data.fingerprints;
      window.location.reload();
      return true;
    },

    exportData: function() {
      var data = {
        secret       : localStorage['PGP_Secret'],
        public       : localStorage['PGP_Public'],
        username     : localStorage['PGP_Username'],
        fingerprints : localStorage['fingerprints'],
      };
      return btoa(JSON.stringify(data));
    },

  };

}]);
