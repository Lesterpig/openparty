/**
 * This is a sample configuration file for openparty.
 * Copy it to `config.js` in the same directory, and change it to fit your needs.
 */

module.exports = {

  port: 3040,                 // open party listenning port (http)
  bind: "0.0.0.0",            // bound ip - use 127.0.0.1 for localhost use only
  sessionSecret: "changeMe",  // not used yet, but you should change it for security reasons
  password: null,             // change it to set a server password for user access
  shutdownDelay: 0,           // delay before server kill on SIGTERM/SIGINT - useful in production

  maxRooms: 10,               // maximum number of rooms allowed
  maxPlayers: 100,            // maximum number of connected players allowed

  locales: ["en","fr", "es"],
  defaultLocale: "en",

  name: "",                   // custom server name
  welcomeMsg: "",             // shown on "home" page
  motd: "",                   // shown on "lobby" page
  description: "",            // shown on "about" page
};
