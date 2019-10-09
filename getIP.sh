#!/bin/bash

getent hosts "$1" | awk '{ print $1 }'
