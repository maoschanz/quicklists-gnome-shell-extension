#!/bin/bash

EXT_NAME="quicklists"
EXT_ID="$EXT_NAME@maestroschan.fr"

IFS='
'

liste=`ls ./$EXT_ID/locale/`
prefix="./$EXT_ID/locale"

################################################################################

function update_pot () {
	echo "Generating .pot file..."
	xgettext --files-from=POTFILES.in --from-code=UTF-8 --add-location=file --output=$EXT_ID/locale/$EXT_NAME.pot
}

function update_lang () {
	echo "Updating translation for: $1"
	msgmerge --update --previous $prefix/$1/LC_MESSAGES/$EXT_NAME.po $prefix/$EXT_NAME.pot
	rm $prefix/$1/LC_MESSAGES/$EXT_NAME.po~
}

function compile_lang () {
	echo "Compiling translation for: $1"
	msgfmt $prefix/$1/LC_MESSAGES/$EXT_NAME.po -o $prefix/$1/LC_MESSAGES/$EXT_NAME.mo
}

function create_po () {
	mkdir -p $prefix/$1/LC_MESSAGES
	touch $prefix/$1/LC_MESSAGES/$EXT_NAME.po
	echo "msgid \"\"
msgstr \"\"
\"Project-Id-Version: \\n\"
\"Report-Msgid-Bugs-To: \\n\"
\"POT-Creation-Date: 2019-07-02 18:58+0200\\n\"
\"PO-Revision-Date: 2017-02-05 16:47+0100\\n\"
\"Last-Translator: \\n\"
\"Language-Team: \\n\"
\"Language: $1\\n\"
\"MIME-Version: 1.0\\n\"
\"Content-Type: text/plain; charset=UTF-8\\n\"
\"Content-Transfer-Encoding: 8bit\\n\"
\"X-Generator: \\n\"
\"Plural-Forms: nplurals=2; plural=(n > 1);\\n\"
" > $prefix/$1/LC_MESSAGES/$EXT_NAME.po
	update_lang $1
}

update_all () {
	update_pot
	for lang_id in $liste
	do
		if [ "$lang_id" != "$EXT_NAME.pot" ]; then
			update_lang $lang_id
		fi
	done
}

compile_all () {
	for lang_id in $liste
	do
		if [ "$lang_id" != "$EXT_NAME.pot" ]; then
			compile_lang $lang_id
		fi
	done
}

################################################################################

if [ $# = 0 ]; then
	declare -F
	exit 1
else
	$1 $2
fi

exit 0

################################################################################
