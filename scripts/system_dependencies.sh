#!/bin/sh

# install system dependencies. Tested on a ubuntu 16.04 env.

apt-get install -y build-essential python-minimal rabbitmq-server mysql-server
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.1/install.sh | bash; bash
rabbitmq-plugins enable rabbitmq_management
