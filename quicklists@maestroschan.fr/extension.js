
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const ShellVersion = imports.misc.config.PACKAGE_VERSION;
const Mainloop = imports.mainloop;

const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//------------------------------------------------------------------------------

let RECENT_MANAGER;
let SETTINGS;

let INJECTED_METHOD_NAME;
let INJECTIONS = [];

function init() {
	Convenience.initTranslations();
	if(parseInt(ShellVersion.split('.')[1]) > 35) {
		INJECTED_METHOD_NAME = '_rebuildMenu';
	} else {
		INJECTED_METHOD_NAME = '_redisplay';
	}
}

function stringFromArray(data) {
	if(data instanceof Uint8Array) {
		return imports.byteArray.toString(data);
	} else {
		return data.toString();
	}
}

function try_close_overview() {
	if(SETTINGS.get_boolean('close-overview')) {
		Main.overview.hide();
	}
}

//------------------------------------------------------------------------------

/*
 * Add to AppDisplay.AppIconMenu the required methods to load the recently used
 * files into the menu
 */
function addRecentFilesLoader() {

	// Load into the app's icon menu a list of items corresponding to recently
	// used files whose types are among the MIME types supported by the app.
	AppDisplay.AppIconMenu.prototype._loadRecentFiles = function () {
		// Various guard clauses
		if(0 === SETTINGS.get_int('max-recents')) return;
		let appinfo = this._source.app.get_app_info();
		if(appinfo == null || !appinfo.supports_uris()) return;
		let app_types = this._source.app.get_app_info().get_supported_types()
		// TODO that's not enough: gedit is still fucking dumb and ignore 99% of
		// what it should open.
		if(app_types == null) return;

		this._appendSeparator();

		// Remember as `this._recentFilesMenu` the menu where items shall be
		// added. XXX this is suboptimal: it's called each time a menu is open!!
		if(SETTINGS.get_boolean('use-submenu-recent')) {
			let recentMenuItem = new PopupMenu.PopupSubMenuMenuItem(_("Recent files"));
			this.addMenuItem(recentMenuItem);
			this._recentFilesMenu = recentMenuItem.menu;
		} else {
			// That labeled separator would be prefered by GS designers, but the
			// current implementation is really very ugly. So no.
			// this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_("Recent files")));
			this._recentFilesMenu = new PopupMenu.PopupMenuSection();
			// XXX ??? no idea why it was here, need tests on 3.28 (on 3.36, it
			// looks optional but if the text is not an empty string, the
			// section isn't built at all)
			this._recentFilesMenu.actor.label_actor = new St.Label({text: ''});
			this.addMenuItem(this._recentFilesMenu);
		}

		// Get all recent files
		let recentItems = RECENT_MANAGER.get_items();

		// Add compatible files to `this._recentFilesMenu`
		let nbItems = 0;
		for(let i = 0; i < recentItems.length; i++) {
			if( !recentItems[i].exists() ) {
				// do nothing
			} else if(nbItems >= SETTINGS.get_int('max-recents')) {
				break;
			} else if(app_types.indexOf(recentItems[i].get_mime_type()) != -1) {
				let label = recentItems[i].get_display_name();
				let recent_item = new PopupMenu.PopupMenuItem(label);
				this._recentFilesMenu.addMenuItem(recent_item);
				let recentURI = recentItems[i].get_uri();
				recent_item.connect('activate', () => {
					appinfo.launch_uris(
						[recentURI],
						global.create_app_launch_context(0, -1)
					);
					try_close_overview();
				});
				nbItems++;
			}
		}

		// Placeholder
		if(0 === nbItems) {
			let recent_item = new PopupMenu.PopupMenuItem(
				_("No recent file for this app"),
				{ reactive: false }
			);
			this._recentFilesMenu.addMenuItem(recent_item);
		}
	};
}

//------------------------------------------------------------------------------

const SPECIAL_PLACES = {
	'home': ['', 'user-home-symbolic', _("Home")],
	'computer': [' computer:///', 'computer-symbolic', _("Computer")],
	'recent': [' recent:///', 'document-open-recent-symbolic', _("Recent files")],
	'favorites': [' starred:///', 'starred-symbolic', _("Favorites")],
	'trash': [' trash:///', 'user-trash-symbolic', _("Trash")],
	'other': [' other-locations:///', 'computer-symbolic', _("Other places")],
	'network': [' network:///', 'network-workgroup-symbolic', _("Network")]
};

/*
 * Add to AppDisplay.AppIconMenu the required methods to load the bookmarks and
 * other file-managing-related items into the menu
 */
function addBookmarksLoader() {

	// Utility adding a button to the menuitem `item`. The icon of the button,
	// and its accessible name, depend on `placeId`. The command runned when
	// clicking on it depends on `placeId` and `commandName`.
	AppDisplay.AppIconMenu.prototype._addSpecialPlaceButton = function (item, commandName, placeId) {
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
			try_close_overview();
		});
		item.actor.add_child(newButton);
	};

	//--------------------------------------------------------------------------

	AppDisplay.AppIconMenu.prototype._addSpecialPlaces = function (commandName) {
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
					try_close_overview();
				}, 'document-open-recent-symbolic');
			break;
		}
	};

	//--------------------------------------------------------------------------

	// Load into the app's icon menu a list of items corresponding to bookmarks.
	AppDisplay.AppIconMenu.prototype._loadBookmarks = function (commandName) {
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
			linesArray = e.toString().match(/.{1,40}/g); // or e.message?
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

		if(SETTINGS.get_boolean('use-submenu-bookmarks')) {
			this.bookmarksMenu = new PopupMenu.PopupSubMenuMenuItem(_("Bookmarks"));
			this.addMenuItem(this.bookmarksMenu);
		}

		// Add a menu item for each bookmark
		for(let j = 0; j < numberOfBookmarks; j++) {
			if(SETTINGS.get_boolean('use-submenu-bookmarks')) {
				this.bookmarksMenu.menu.addMenuItem(bookmarks[j][0]);
			} else {
				this.addMenuItem(bookmarks[j][0]);
			}
			bookmarks[j][0].connect('activate', () => {
				Util.trySpawnCommandLine(bookmarks[j][1]);
				try_close_overview();
			});
		}
	};
}

//------------------------------------------------------------------------------

// DO NOT EDIT THIS FUNCTION
function injectToFunction(parent, name, func) {
	let origin = parent[name];
	parent[name] = function() {
		let ret;
		ret = origin.apply(this, arguments);
			if(ret === undefined)
				ret = func.apply(this, arguments);
			return ret;
		}
	return origin;
}

// DO NOT EDIT THIS FUNCTION
function removeInjection(object, injection, name) {
	if(injection[name] === undefined)
		delete object[name];
	else
		object[name] = injection[name];
}

/*
 * Inject code into the existing method of AppDisplay.AppIconMenu that builds
 * the menu. It'll call the methods previously created by the loaders.
 */
function injectInAppsMenus() {
	// This injects items in AppIconMenu's INJECTED_METHOD_NAME method (the
	// value of this variable isn't the same depending on GS versions).
	INJECTIONS[INJECTED_METHOD_NAME] = injectToFunction(
		AppDisplay.AppIconMenu.prototype,
		INJECTED_METHOD_NAME,
		function() {
			// Loading the quicklist items is delayed of 10ms, to ensure that
			// even if the code of the extension fails, the default menu will be
			// correctly loaded anyways.
			let timeoutId = Mainloop.timeout_add(10, () => {
				switch(this._source.app.get_id()) {
					case 'org.gnome.Nautilus.desktop':
						this._loadBookmarks('nautilus');
					break;
					case 'Thunar.desktop':
					case 'thunar.desktop':
						this._loadBookmarks('thunar');
					break;
					case 'caja.desktop':
					case 'caja-browser.desktop':
						this._loadBookmarks('caja');
					break;
					case 'nemo.desktop':
						this._loadBookmarks('nemo');
					break;
					default:
						this._loadRecentFiles();
					break;
				}
				Mainloop.source_remove(timeoutId);
			});
		}
	);
}

//------------------------------------------------------------------------------

function enable() {
	RECENT_MANAGER = new Gtk.RecentManager();
	SETTINGS = Convenience.getSettings();

	addBookmarksLoader();
	addRecentFilesLoader();
	injectInAppsMenus();
}

function disable() {
	removeInjection(AppDisplay.AppIconMenu.prototype, INJECTIONS, INJECTED_METHOD_NAME);
	AppDisplay.AppIconMenu.prototype._loadRecentFiles = null;
	AppDisplay.AppIconMenu.prototype._addBookmarkButton = null;
	AppDisplay.AppIconMenu.prototype._loadBookmarks = null;
}

//------------------------------------------------------------------------------

