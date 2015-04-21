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

.. js:function:: Room.resolveUsername(username)

   Get player object from username

  :param string username:
  :return: Socket associated to this username, or null


Player
------

Action
------

Channel
-------

Role
----

Global objects
--------------