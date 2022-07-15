#!/bin/sh

echo Checking prettier

yarn prettier --check .
if [ ! $? -eq 0 ];
then
    exit 1
fi

exit 0
