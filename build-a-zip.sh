#!/bin/bash

# ./update-and-compile-translations.sh

EXT_ID=quicklists@maestroschan.fr

cd $EXT_ID

glib-compile-schemas ./schemas

zip ../$EXT_ID.zip *.js
zip ../$EXT_ID.zip metadata.json

zip -r ../$EXT_ID.zip content_loaders
zip -r ../$EXT_ID.zip schemas
zip -r ../$EXT_ID.zip locale

