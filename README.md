# Quicklist (GNOME Shell extension)

A [GNOME Shell extension](https://extensions.gnome.org/about/) which adds dynamic quicklists to app icons' menu:

- bookmarks (for Nautilus or Nemo) ([screenshot](https://i.imgur.com/dpXxtOS.jpg))
- recent files openable by the application ([screenshot](https://i.imgur.com/UPSssDJ.jpg))

**Warning:** this is not compatible with `Dash-To-Dock` or `Ubuntu-Dock` thumbnail previews.
(works with `Dash to panel`)

Available in french and english.

## Installation

- Download zip and extract
- run `update-and-compile-translations.sh`
- run `install.sh` (or put the files in a "`quicklists@maestroschan.fr`" folder, in `~/.local/share/gnome-shell/extensions/`)
- remove the Ubuntu Dock if present (https://askubuntu.com/questions/1030138/how-can-i-get-rid-of-the-dock-in-ubuntu-18)
- activate the extension (launch `gnome-shell-extension-prefs` or GNOME Tweaks or GNOME Software)
- turn on recent-files list in the settings gear there, if desired
- restart the gnome shell environnment ("logout and login again", or alt + f2 + `r` + enter)
- Enjoy
