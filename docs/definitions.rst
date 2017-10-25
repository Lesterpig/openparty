Definition files
================

Gameplay definitions are hosted under ``data/<gameplayName>/definition.js``. This file must be a **node.js module**: it means that it must return a javascript object. These two structures are valid:

.. code:: js

  module.exports = {

    element: "value",
    another: "bar"

  }

.. code:: js

  module.exports = function() {

    this.element = "value";
    this.another = "bar";

  }

This file is the **entry point** of your gameplay definition: you can create many javascript files in the gameplay directory if you need it! There is no restriction of size or compute time.

.. note::

  You must provide valid keys in your definition file: it will be parsed at startup and invalid files will be rejected.

  You can view a list of checked keys here_.

  .. _here: https://github.com/Lesterpig/openparty/blob/master/lib/attrs.js

Mandatory keys
--------------

.. js:data:: 'name'

  `String`

  The name of the gameplay. It will be displayed in room properties.

.. js:data:: 'minPlayers'

  `Number`

  The minimum/default number of players per room.

.. js:data:: 'maxPlayers'

  `Number`

.. js:data:: 'start'

  `function (room, callback) {}`

  Called when the start command is emitted by the room creator. The callback must be called with **null** to confirm the room start. If ``callback`` is called with another value, a message would be printed in game chat.

Optional keys
-------------

.. js:data:: 'version'

  `String`

  The current version of this gameplay.

.. js:data:: 'opVersion'

  `String`

  The required version of OpenParty. Must be in **semver** format.

  Examples:

  .. code:: js

    "0.1.*"
    ">=0.1"
    "<1.0.0"

.. js:data:: 'description'

  `String`

  A short description of the gameplay, displayed in room list.

.. js:data:: 'stages'

  `Object`

  An object containing all available stages for this gameplay. This object can be dynamically updated by your gameplay. A **stage** is just a period of time and contains only two functions: ``start`` and ``end``.

  The key used to define a stage is saved in ``room.currentStage`` variable, and a room is **always** in a specific stage.

  .. js:data:: 'start'

    `function (room, cb) {}`

    Called by the engine when a stage is started. ``cb`` must be called with two parameters: the first one is an error indicator, and the second is the **duration** of the stage (seconds). A duration can be -1 for infinite.

  .. js:data:: 'end'

    `function (room) {}`

    Called when a stage ends.

  Example of stages object 

  .. code:: js

    stages: {
      "default": {
        start: function(room, cb) {
            cb(null, 5);
        },
        end: function(room) {}
      }
    }

.. js:data:: 'firstStage'

  `String`

  The first stage to start.

.. js:data:: 'css'

  `Array[String]`

  You can include custom css files in the web browser. Just place your css files in a ``data/<gameplayName>/css`` folder and specify their names in the ``css`` array.

  .. code:: js

    css: ["file1.css", "file2.css"]

.. js:data:: 'parameters'

  `Array[Object]`

  Used to define specific parameters for room. Players can interract with these parameters to customize their gameplay experience.

  .. warning:: This feature is currently in development.

  Example of parameter:

  .. code:: js

    {
      name: "The name of the parameter",
      type: Number, // the type
      value: 1,     // default value
      help: "An help text for this parameter"
    }

.. js:data:: 'init'

  `function (room) {}`

  Called just after room creation.

.. js:data:: 'processMessage'

  `function (channel, message, player) {}`

  Called for each message sent by players.

  You **must** return the message to broadcast it, modified or not. Return ``false`` to ignore the message.

.. js:data:: 'onDisconnect'

  `function (room, player) {}`

.. js:data:: 'onReconnect'

  `function (room, player) {}`

.. js:data:: 'reconnectDelay'

  `Integer`

  After a disconnection, a player has this delay (in second) to reconnect. Use -1 to disable reconnection. Defaults to one minute.

.. js:data:: 'sounds'

  `Array[Sound]`

  An array of Sound objects to be preloaded automatically at start. Please provide only tiny sounds to avoid large bandwidth usage.
