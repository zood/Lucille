#! /bin/bash

set -e

scp *.html pijun.io:/www/tracking/
scp *.js pijun.io:/www/tracking/
scp -r css pijun.io:/www/tracking/
scp -r libs pijun.io:/www/tracking/
