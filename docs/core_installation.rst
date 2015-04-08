Installation
============

OpenParty is designed to work with **Linux**, **Mac**, and even **Windows** distributions. However, the framework provides a http server, and we strongly suggest you to host OpenParty servers in Linux distributions (Debian 7 preferred).

.. note:: The following instructions are designed to work for a Debian 7 installation.

Softwares
---------

The framework comes with several (small) prerequisites to work properly.

- node.js
- npm

You just have to pick-up these modules from package repositories. Binary files are available_ for windows.

.. _available: https://nodejs.org

Here are the steps for a quick installation on a bare Debian 7 :

.. code:: bash

  $ su root
  # apt-get install -y curl git
  # curl -sL https://deb.nodesource.com/setup_0.12 | bash -
  # apt-get install -y nodejs
  # exit

Get OpenParty
-------------

You can use **Git** repository to get the latest version, or pick a stable release.

.. note:: No stable release is available yet.

.. code:: bash

  $ git clone https://github.com/Lesterpig/openparty.git
  $ cd openparty
  $ npm install
  $ cp config/config_sample.js config/config.js

Configuration
-------------

You just have to edit the `config/config.js` file to fit your needs.

.. warning:: You'll have to restart the OpenParty server to apply the modifications.