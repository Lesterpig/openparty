Public API
==========

You can access and modify these objects through your ``definition.js`` file.

Room
----

.. js:class:: Room

  This object is frequently an argument for ``definition.js`` files.
  You can check a full list of features in ``lib/rooms.js``.

  Rooms are created (and destroyed) for you by the framework. You just have to interract with it.

.. js:attribute:: Room.id

  `String`

  A unique identifier for the room.

.. js:attribute:: Room.players

  `Array[Socket]`

  Contains players that is in this room.

  .. warning:: This is an array of ``socket`` objects, not ``player``! It's very important: to access the player objects, write something like this:

  .. code:: js

    var player0 = room.players[0].player;

  The first element of this array is the room creator.

.. js:attribute:: Room.name

  `String`

  The current name of the room.

.. js:attribute:: Room.size

  `Number`

  The number of available seats. If the room is started, it should be the total number of players.

.. js:attribute:: Room.started

  `Boolean`

  If the room is started (not in waiting stage).

.. js:attribute:: Room.currentStage

  `String`

  The name of the active stage, or ``null`` if not started.

.. js:function:: Room.broadcast([channel], event, [data])

  :param string event: Send an event to players browsers
  :param string channel: Send the event to this channel. If null, send to everyone in the room.
  :param data: Data to send through the event

  Here is some examples of available events:

  - ``chatMessage({sender: String, message: String})``: print a new message in game log
  - ``clearChat()``: clear the game log
  - ``setGameInfo(String)``: change the content of the box in the left-top on the game-screen
  - ``preloadSound(Sound)``: preload a sound in player browsers to avoid further latency
  - ``playSound(Sound)``
  - ``stopSound(Sound)``

.. js:function:: Room.playerInfo([channel], player, value)

  Send more information about a player.
  Client-side, it will be displayed in players list.

  :param Player|Socket player: The player to update
  :param string value: The new value to display (html allowed)
  :param string channel: Send the event to this channel. If null, send to everyone in the room.

.. js:function:: Room.message([channel], message)

  Send a chat message to players (system message)

  :param string message: The message to send (html allowed)
  :param string channel: Send the event to this channel. If null, send to everyone in the room.

.. js:function:: Room.nextStage(stage, [callback])

  End the current stage and start another one

  :param string stage: The new stage name
  :param function callback:

.. js:function:: Room.endStage()

  End the current stage, without starting another one

.. js:function:: Room.setStageDuration(duration)

  Change current stage duration

  :param number duration: duration in seconds

.. js:function:: Room.getRemainingTime()

  :return: Milliseconds before next stage. Can be "Infinity"

.. js:function:: Room.resolveUsername(username)

   Get player object from username

  :param string username:
  :return: Socket associated to this username, or null


Player
------

.. js:class:: Player

  One player object is created and associated for each user at room startup.

.. js:attribute:: Player.roles

  ``Object[Role]``

  Roles of this user. **You should not modify this object directly.**

.. js:attribute:: Player.channels

  ``Object[Channels]``

  Subscribed channels for this user, overrides ``Player.roles`` ones. **You should not modify this object directly.**

.. js:attribute:: Player.actions

  ``Object[Actions]``

  Subscribed actions for this user, overrides ``Player.roles`` ones. **You should not modify this object directly.**

.. js:attribute:: Player.socket

  ``Socket``

.. js:attribute:: Player.room

  ``Room``

.. js:attribute:: Player.username

  ``String``

.. js:function:: Player.setRole(role, value)

  Add, update or remove a role for a player. Actions and channels attached to the role are silently added for the player.

  :param String role: The name of the role (should be consistent)
  :param Role value: Role data, or ``null`` to remove the role

.. js:function:: Player.setAction(name, value)

  Add, update or remove an action for a player

  :param String name: The name of the action (should be consistent)
  :param Action value: Action data, or ``null`` to remove the action

.. js:function:: Player.setChannel(name, value)

  Add, update or remove a channel for a player

  :param String role: The name of the channel (should be consistent)
  :param Channel value: Channel data, or ``null`` to remove the player

.. js:function:: Player.sendAvailableActions()

  Call this function to update one's available actions (after updating some properties for instance).

.. js:function:: Player.emit(event, data)

  Emit an event for one player only

.. js:function:: Player.message(m)

  Send a chat message for one player only

Action
------

.. js:class:: Action

  This object contains all mandatory data to build dynamic forms for players ingame.

.. js:attribute:: Action.isAvailable

  ``function(player) {}``

  Must return ``true`` if the action is available for the player.

.. js:attribute:: Action.type

  ``String``

  - ``button``
  - ``select``

.. js:attribute:: Action.options

  ``Object``

  Contains additionnal information for specific actions.

  - ``submit: String`` (for all): the submit message printed on the button
  - ``choices: String | Function | Array`` (for select): the list of available choices for select actions. If the value is ``players``, default choices is players' usernames.


.. js:attribute:: Action.execute

  ``function(player[, choice])``

  Called during action execution by a player. You don't need to check the availability, OpenParty does it for you :)

Examples:

.. code:: javascript

  var action1 = {
    isAvailable: function(player) {
      return true;
    },
    type: "button",
    options: {
      submit: "BOUM",
    },
    execute: function(player) {
      player.room.message("EVERYTHING IS EXPLODED!");
    }
  };

  var action2 = {
    isAvailable: function(player) {
      return true;
    },
    type: "select",
    options: {
      choices: ["One", "Two"],
      submit: "Choose",
    },
    execute: function(player, choice) {
      player.room.message(choice);
    }
  };

  var action3 = {
    isAvailable: function(player) {
      return player.room.currentStage === "stageA";
    },
    type: "select",
    options: {
      choices: function() { return [1,2,3]; },
      submit: "Choose",
    },
    execute: function(player, choice) {
      player.room.message("general", choice);
    }
  };

Channel
-------

.. js:class:: Channel

  A very simple object for channel management. A channel is a virtual chat room: players can read and/or speak in that channel.

  By default, each player is in ``general`` channel (read and write accesses). You can remove this behavior by executing the following code:

  .. code:: javascript

    room.players.forEach(function(p) {
      p.player.setChannel("general", null);
    });

  Each player is also in a private channel (read-only). The name of the channel is

  .. code::

    player-<username>

  with <username> replaced by the effective username of the user. This feature is just an helper for gamemaster features or private messages (for instance).

.. js:attribute:: Channel.r

  ``Boolean``

  Determines read access

.. js:attribute:: Channel.w

  ``Boolean``

  Determines write access

.. js:attribute:: Channel.n

  ``String``

  The channel name. Players will see this name on their game screens.

.. js:attribute:: Channel.p

  ``Number``

  The channel priority. Highest priority element is in the top in channels list, and selected by default. It is an optional parameter.

Example of read-only channel:

.. code:: javascript

  var channel = {r: true, w: false, n: "My Channel", p: 10};

Role
----

.. js:class:: Role

  A role is a combination of some **channels** and some **actions**. Because in roleplay games, some players could share the same channels and actions...

.. js:attribute:: Role.channels

  ``Object[Channel]``

.. js:attribute:: Role.actiond

  ``Object[Action]``


Example:

.. code:: javascript

  var role = {

    channels: {
      "channelA": {...},
      "channelB": {...}
    },

    actions: {
      "actionA": {...},
      "actionB": {...}
    }

  }

Sound
-----

.. js:class:: Sound

  A sound is a minimal object containing several information for browsers.

.. js:attribute:: Sound.id

  ``String``

  A unique identifier for the sound.

.. js:attribute:: Sound.path

  ``String``

  Relative, or absolute path of the sound. You should store your sounds in **/public** directory.

.. js:attribute:: Sound.distant

  ``Boolean``

  Is it an absolute path, or not ? Defaults to false.

.. js:attribute:: Sound.loop

  ``Boolean``

  Define if the sound should be restarted at the end or not.

.. js:attribute:: Sound.volume

  ``Number``

  A number between 0 and 1 for setting sound volume.

Global objects
--------------

Some usefull objects are loaded as global variables by OpenParty.

.. js:function:: GET_RANDOM(from, to)

  :param number from:
  :param number to:
  :return: A random integer between from (included) and to (included).

.. js:data:: __app

  The sockpress app for OpenParty. You can use it to add custom routes if required. Check the documentation_.

  .. _documentation: https://github.com/Lesterpig/sockpress
