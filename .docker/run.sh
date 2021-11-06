#!/bin/bash

set -e

if [ ! -d "$PWD/node_modules" ]; then
    npm ci
fi

npm run watch