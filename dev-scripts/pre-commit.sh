#!/bin/sh

echo Checking tsc, eslint, and prettier

yarn tsc
if [ ! $? -eq 0 ];
then
    exit 1
fi

yarn eslint .
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
