#!/usr/bin/env bash

if [[ -d ./logs ]]; then
  echo 'has log folder'
  sudo chown root:root ./logs
else
  sudo mkdir ./logs
fi

sudo chmod +x run.sh

sudo apt-get install nodejs

npm install -g typescript

if [[ -d /etc/logrotate.d/ ]]; then
    sudo cp ./miner-manager-server /etc/logrotate.d/miner-manager-server
else
    echo 'Please install logrotate'
    echo 'Install command : sudo yum install -y logrotate'
fi