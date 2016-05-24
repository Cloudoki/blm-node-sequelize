#!/bin/sh

# install system dependencies. Tested on a ubuntu 16.04 env.

echo "MySQL password"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS app_test; CREATE DATABASE IF NOT EXISTS app_development; CREATE DATABASE IF NOT EXISTS app_production;"
npm install --production
