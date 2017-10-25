module.exports = {

  name           : {m: true, t: 'String'},
  start          : {m: true, t: 'Function'},
  minPlayers     : {m: true, t: 'Integer'},
  maxPlayers     : {m: true, t: 'Integer'},

  init           : {t: 'Function'},
  firstStage     : {t: 'String'},
  parameters     : {t: 'Array'},
  stages         : {t: 'Object'},
  processMessage : {t: 'Function'},
  onDisconnect   : {t: 'Function'},
  onReconnect    : {t: 'Function'},
  version        : {t: 'String'},
  description    : {t: 'String'},
  opVersion      : {t: 'String'},
  css            : {t: 'Array'},
  sounds         : {t: 'Array'},
  reconnectDelay : {t: 'Integer'},

};
