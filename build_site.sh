#!/bin/bash

# build the ui

cd ui/
npm install
npm run deploy
cd ../

# move ui files in

siteDir=chronos-web/src/main/resources/site/
if [ -d "$siteDir" ] ; then
  rm -rf "$siteDir/*"
else
  mkdir "$siteDir"
fi
cp -r ui/public/* "$siteDir"
