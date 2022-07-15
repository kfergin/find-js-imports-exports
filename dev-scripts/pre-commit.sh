#!/bin/sh

echo Checking typescript and prettier

yarn tsc
if [ ! $? -eq 0 ];
then
    exit 1
fi

yarn prettier --check .
if [ ! $? -eq 0 ];
then
    exit 1
fi

exit 0
