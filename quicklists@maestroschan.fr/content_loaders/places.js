
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Util = imports.misc.util;

const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Extension = Me.imports.extension;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//------------------------------------------------------------------------------

function stringFromArray(data) {
	if(data instanceof Uint8Array) {
		return imports.byteArray.toString(data);
	} else {
		return data.toString();
	}
}

const SPECIAL_PLACES = {
	'home': ['', 'user-home-symbolic', _("Home")],
	'computer': [' computer:///', 'computer-symbolic', _("Computer")],
	'recent': [' recent:///', 'document-open-recent-symbolic', _("Recent files")],
	'favorites': [' starred:///', 'starred-symbolic', _("Favorites")],
	'trash': [' trash:///', 'user-trash-symbolic', _("Trash")],
	'other': [' other-locations:///', 'computer-symbolic', _("Other places")],
	'network': [' network:///', 'network-workgroup-symbolic', _("Network")]
};

//------------------------------------------------------------------------------

/**
 * Load into the app's icon menu a list of items corresponding to bookmarks.
 */
var loadItems = function (commandName) {
	this._appendSeparator();

	// The first items are not bookmarks, but have to be available anyway.
	// They're not exactly the same depending on the file manager.
	this._addSpecialPlaces(commandName);

	// Read the file with GTK bookmarks
	let noBookmarkLabel = "";
	let content = "";
	try {
		let file = Gio.file_new_for_path('.config/gtk-3.0/bookmarks');
		let [result, contents] = file.load_contents(null);
		// TODO what about the other path possible, directly in the home??

		if(result) {
			noBookmarkLabel = _("No bookmark");
			content = stringFromArray(contents);
		} else {
			throw new Exception(_("Error: could not read bookmarks"));
		}
	} catch(e) {
		log(e);
		let linesArray = e.toString().match(/.{1,40}/g); // or e.message?
		for(var index in linesArray) {
			if(index == linesArray.length - 1) {
				noBookmarkLabel += linesArray[index];
			} else {
				noBookmarkLabel += linesArray[index] + "\n";
			}
		}
	}

	// Build an array of [PopupMenuItem, command-as-string] pairs
	let bookmarks = [];
	let numberOfBookmarks = content.split('\n').length - 1;
	for(let i = 0; i < numberOfBookmarks; i++) {
		let text = '';
		for(var j = 1; j < content.split('\n')[i].split(' ').length; j++) {
			text += content.split('\n')[i].split(' ')[j] + ' ';
		}
		if(text == '') {
			text = content.split('\n')[i].split('/').pop();
		}
		bookmarks.push([
			new PopupMenu.PopupMenuItem(text),
			commandName + ' ' + content.split('\n')[i].split(' ')[0]
		]);
	}

	// Placeholder
	if(0 === numberOfBookmarks) {
		let placeholderItem = new PopupMenu.PopupMenuItem(
			noBookmarkLabel,
			{ reactive: false }
		);
		bookmarks.push([placeholderItem, '']);
		numberOfBookmarks = 1;
	}

	if(Extension.SETTINGS.get_boolean('use-submenu-bookmarks')) {
		this.bookmarksMenu = new PopupMenu.PopupSubMenuMenuItem(_("Bookmarks"));
		this.addMenuItem(this.bookmarksMenu);
	}

	// Add a menu item for each bookmark
	for(let j = 0; j < numberOfBookmarks; j++) {
		if(Extension.SETTINGS.get_boolean('use-submenu-bookmarks')) {
			this.bookmarksMenu.menu.addMenuItem(bookmarks[j][0]);
		} else {
			this.addMenuItem(bookmarks[j][0]);
		}
		bookmarks[j][0].connect('activate', () => {
			Util.trySpawnCommandLine(bookmarks[j][1]);
			Extension.tryCloseOverview();
		});
	}
}

//------------------------------------------------------------------------------

var addSpecialPlaces = function (commandName) {
	let buttons_item = new PopupMenu.PopupBaseMenuItem({
		reactive: false,
		can_focus: false
	});
	// XXX again, wtf is this? this time it's mandatory
	buttons_item.actor.label_actor = new St.Label({text: ''});

	switch(commandName) {
		case 'nautilus':
			this._addSpecialPlaceButton(buttons_item, commandName, 'recent');
			this._addSpecialPlaceButton(buttons_item, commandName, 'trash');
			this._addSpecialPlaceButton(buttons_item, commandName, 'favorites');
			this._addSpecialPlaceButton(buttons_item, commandName, 'other');
			this.addMenuItem(buttons_item);
		break;

		case 'caja':
			this._addSpecialPlaceButton(buttons_item, commandName, 'home');
			this._addSpecialPlaceButton(buttons_item, commandName, 'recent');
			this._addSpecialPlaceButton(buttons_item, commandName, 'trash');
			this._addSpecialPlaceButton(buttons_item, commandName, 'computer');
			this._addSpecialPlaceButton(buttons_item, commandName, 'network');
			this.addMenuItem(buttons_item);
		break

		case 'thunar':
			this._addSpecialPlaceButton(buttons_item, commandName, 'home');
			this._addSpecialPlaceButton(buttons_item, commandName, 'recent');
			this._addSpecialPlaceButton(buttons_item, commandName, 'trash');
			this._addSpecialPlaceButton(buttons_item, commandName, 'network');
			this.addMenuItem(buttons_item);
		break;

		case 'nemo':
		default:
			// nemo already has a few quicklist actions
			this.addAction(_("Recent files"), () => {
				Util.trySpawnCommandLine(commandName + ' recent:///');
				Extension.tryCloseOverview();
			}, 'document-open-recent-symbolic');
		break;
	}
}

/**
 * Utility adding a button to the menuitem `item`. The icon of the button, and
 * its accessible name, depend on `placeId`. The command runned when clicking on
 * it depends on `placeId` and `commandName`.
 */
var addSpecialPlaceButton = function (item, commandName, placeId) {
	let newButton = new St.Button({
		reactive: true,
		can_focus: true,
		track_hover: true,
		accessible_name: SPECIAL_PLACES[placeId][2],
		style_class: 'button', // XXX looks bad with some 3rd-party themes
		style: 'padding-right: 12px; padding-left: 12px;',
		x_expand: true,
		x_align: Clutter.ActorAlign.CENTER,
	});
	newButton.child = new St.Icon({
		icon_name: SPECIAL_PLACES[placeId][1],
		icon_size: 16,
	});
	newButton.connect('clicked', () => {
		Util.trySpawnCommandLine(commandName + SPECIAL_PLACES[placeId][0]);
		this.close();
		Extension.tryCloseOverview();
	});
	item.actor.add_child(newButton);
}

