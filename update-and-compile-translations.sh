#!/bin/bash

#####

echo "Generating .pot file..."

xgettext --files-from=POTFILES.in --from-code=UTF-8 --output=quicklists@maestroschan.fr/locale/quicklists.pot

#####

IFS='
'
liste=`ls ./quicklists@maestroschan.fr/locale/`
prefix="./quicklists@maestroschan.fr/locale"

for dossier in $liste
do
	if [ "$dossier" != "quicklists.pot" ]; then
		echo "Updating translation for: $dossier"
		msgmerge -N $prefix/$dossier/LC_MESSAGES/quicklists.po $prefix/quicklists.pot > $prefix/$dossier/LC_MESSAGES/quicklists.temp.po
		mv $prefix/$dossier/LC_MESSAGES/quicklists.temp.po $prefix/$dossier/LC_MESSAGES/quicklists.po
		echo "Compiling translation for: $dossier"
		msgfmt $prefix/$dossier/LC_MESSAGES/quicklists.po -o $prefix/$dossier/LC_MESSAGES/quicklists.mo
	fi
done

#####

exit 0
