Gameplays installation
======================

One OpenParty web server can handle **many different gameplays** on the *same* processus. Gameplays are stored in the `data` directory (then, one subdirectory per gameplay).

::

  openparty/
    config/
    data/
      gameplay1/
        definition.js
        ...
      gameplay2/
        definition.js
        ...
      ...
    docs/
    ...

The `data` directory is scanned at startup, and valid gameplay definitions (stored in `definition.js` files).

Example gameplays
-----------------

For test purposes, we provide you several tiny gameplays.

.. code:: bash

  $ git clone https://github.com/Lesterpig/openparty-examples data