#!/bin/bash

EXT_ID=quicklists@maestroschan.fr
glib-compile-schemas ./$EXT_ID/schemas

if (( $EUID == 0 )); then
	if [ ! -d "/usr/share/gnome-shell/extensions" ]; then
		mkdir /usr/share/gnome-shell/extensions
	fi
	INSTALL_DIR="/usr/share/gnome-shell/extensions"
else
	if [ ! -d "$HOME/.local/share/gnome-shell/extensions" ]; then
		mkdir $HOME/.local/share/gnome-shell/extensions
	fi
	INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions"
fi

echo "Installing extension files in $INSTALL_DIR/$EXT_ID.fr"
cp -r $EXT_ID $INSTALL_DIR

echo "Done."
exit 0

