#!/bin/bash

# ./update-and-compile-translations.sh

cd quicklists@maestroschan.fr

glib-compile-schemas ./schemas

zip ../quicklists@maestroschan.fr.zip *.js
zip ../quicklists@maestroschan.fr.zip metadata.json

zip -r ../quicklists@maestroschan.fr.zip content_loaders
zip -r ../quicklists@maestroschan.fr.zip schemas
zip -r ../quicklists@maestroschan.fr.zip locale


