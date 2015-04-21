Usage
=====

Start and play !
----------------

.. code:: bash

  $ npm start

You can now play with OpenParty and loaded gameplays in your **web browser**.

If you are running the server locally, you can test with `http://localhost:3040`. To stop the server, just kill it with `CTRL+C` keys.

Auto-restart on fail
--------------------

You can use the **forever** module to automatically restart OpenParty on crash. More over, it's an easy way to restart your application after an upgrade. Forever will run OpenParty silently in the background.

To install it:

.. code:: bash

  $ su root
  # npm install -g forever

To start your application in the background:

.. code:: bash

  $ forever start --killSignal=SIGINT app.js

To restart or stop it:

.. code:: bash

  $ forever restart app.js
  $ forever stop app.js

Use nginx as a proxy
--------------------

.. warning:: You'll need **nginx v1.3.13 or higher** to use it as a proxy for OpenParty.

Here is an example of a basic config file for nginx, assuming OpenParty is running on port 3040.

.. code::

  server {
    listen 80;

    server_name yourdomain.com;

    location / {
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Host $http_host;
      proxy_set_header X-NginX-Proxy true;
      proxy_pass http://127.0.0.1:3040/;
      proxy_redirect off;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }