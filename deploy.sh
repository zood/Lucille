#! /bin/bash

set -e

scp *.html zood.xyz:/www/lucille/
scp -r css zood.xyz:/www/lucille/
scp -r libs zood.xyz:/www/lucille/
scp -r js zood.xyz:/www/lucille/
scp -r images zood.xyz:/www/lucille/
scp -r fonts zood.xyz:/www/lucille/
