#!/bin/bash

./update-and-compile-translations.sh

cd quicklists@maestroschan.fr

glib-compile-schemas ./schemas

zip ../quicklists@maestroschan.fr.zip convenience.js
zip ../quicklists@maestroschan.fr.zip extension.js
zip ../quicklists@maestroschan.fr.zip metadata.json
zip ../quicklists@maestroschan.fr.zip prefs.js

zip -r ../quicklists@maestroschan.fr.zip schemas
zip -r ../quicklists@maestroschan.fr.zip locale


