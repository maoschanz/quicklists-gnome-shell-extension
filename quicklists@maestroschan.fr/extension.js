
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;
const ShellVersion = imports.misc.config.PACKAGE_VERSION;

const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//------------------------------------------------------------------------------

let SETTINGS;
var INJECTED_METHOD_NAME;

function init() {
	Convenience.initTranslations();
	if (parseInt(ShellVersion.split('.')[1]) > 35) {
		INJECTED_METHOD_NAME = '_rebuildMenu';
	} else {
		INJECTED_METHOD_NAME = '_redisplay';
	}
}

function stringFromArray(data){
	if (data instanceof Uint8Array) {
		return imports.byteArray.toString(data);
	} else {
		return data.toString();
	}
}

//------------------------------------------------------------------------------
/* do not edit this section */

function injectToFunction(parent, name, func) {
	let origin = parent[name];
	parent[name] = function() {
		let ret;
		ret = origin.apply(this, arguments);
			if (ret === undefined)
				ret = func.apply(this, arguments);
			return ret;
		}
	return origin;
}

function removeInjection(object, injection, name) {
	if (injection[name] === undefined)
		delete object[name];
	else
		object[name] = injection[name];
}

let injections = [];

//------------------------------------------------------------------------------

// Performs the required code injections into AppIconMenu
function injectionInAppsMenus() {

	// Load into the app's icon menu a list of items corresponding to recently
	// used files whose types are among the MIME types supported by the app.
	AppDisplay.AppIconMenu.prototype._loadRecentFiles = function () {
		// Various guard clauses
		if (0 === SETTINGS.get_int('max-recents')) { return; }
		let appinfo = this._source.app.get_app_info();
		if (appinfo == null || !appinfo.supports_uris()) { return; }
		let app_types = this._source.app.get_app_info().get_supported_types()
		if (app_types == null) { return; }

		// Remember as `this._recentFilesMenu` the menu where items shall be
		// added. XXX this is suboptimal: it's called each time a menu is open!!
		if (SETTINGS.get_boolean('use-submenu-recent')) {
			let recentMenuItem = new PopupMenu.PopupSubMenuMenuItem(_("Recent files"));
			this.addMenuItem(recentMenuItem);
			this._recentFilesMenu = recentMenuItem.menu;
		} else {
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
		for (let i = 0; i < recentItems.length; i++) {
			if ( !recentItems[i].exists() ) {
				// do nothing
			} else if (nbItems >= SETTINGS.get_int('max-recents')) {
				break;
			} else if (app_types.indexOf(recentItems[i].get_mime_type()) != -1) {
				let label = recentItems[i].get_display_name();
				let recent_item = new PopupMenu.PopupMenuItem(label);
				this._recentFilesMenu.addMenuItem(recent_item);
				let recentURI = recentItems[i].get_uri();
				recent_item.connect('activate', function () {
					appinfo.launch_uris(
						[recentURI],
						global.create_app_launch_context(0, -1)
					);
				});
				nbItems++;
			}
		}

		// Placeholder
		if (0 === nbItems) {
			let recent_item = new PopupMenu.PopupMenuItem(
				_("No recent file for this app"),
				{ reactive: false }
			);
			this._recentFilesMenu.addMenuItem(recent_item);
		}
	};

	//--------------------------------------------------------------------------

	// Utility adding a button with the icon `iconName` to the menuitem `item`.
	// Clicking on it will run the bash command `command`.
	AppDisplay.AppIconMenu.prototype._addBookmarkButton = function (item, command, iconName, accessibleName) {
		let newButton = new St.Button({
			reactive: true,
			can_focus: true,
			track_hover: true,
			accessible_name: accessibleName,
			style_class: 'button',
			style: 'padding-right: 12px; padding-left: 12px;',
		});
		newButton.child = new St.Icon({
			icon_name: iconName,
			icon_size: 16,
		});
		newButton.connect('clicked', () => {
			Util.trySpawnCommandLine(command);
			this.close();
		});
		item.actor.add(newButton, { expand: true, x_fill: false });
	};

	// Load into the app's icon menu a list of items corresponding to bookmarks.
	AppDisplay.AppIconMenu.prototype._loadBookmarks = function (commandName) {
		// These first items are not bookmarks, but have to be available anyway.
		// They're not exactly the same depending on the file manager.
		switch (commandName) {
			case 'nautilus':
				let buttons_item = new PopupMenu.PopupBaseMenuItem({
					reactive: false,
					can_focus: false
				});
				// XXX again, wtf is this? this time it's mandatory
				buttons_item.actor.label_actor = new St.Label({text: ''});
				this._addBookmarkButton(buttons_item, commandName + ' recent:///',
					        'document-open-recent-symbolic', _("Recent files"));
				this._addBookmarkButton(buttons_item, commandName + ' trash:///',
					                         'user-trash-symbolic', _("Trash"));
				this._addBookmarkButton(buttons_item, commandName + ' starred:///',
					                        'starred-symbolic', _("Favorites"));
				this._addBookmarkButton(buttons_item, commandName + ' other-locations:///',
					                    'computer-symbolic', _("Other places"));
				this.addMenuItem(buttons_item);
			break;
			case 'caja':
				this.addAction(_("Computer"), () => {
					Util.trySpawnCommandLine(commandName + ' computer:///');
				}, 'computer-symbolic');
			case 'thunar':
				this.addAction(_("Home"), () => {
					Util.trySpawnCommandLine(commandName);
				}, 'user-home-symbolic');
				this.addAction(_("Recent files"), () => {
					Util.trySpawnCommandLine(commandName + ' recent:///');
				}, 'document-open-recent-symbolic');
				this.addAction(_("Network"), () => {
					Util.trySpawnCommandLine(commandName + ' network:///');
				}, 'network-workgroup-symbolic');
				this.addAction(_("Trash"), () => {
					Util.trySpawnCommandLine(commandName + ' trash:///');
				}, 'user-trash-symbolic');
			break;
			case 'nemo':
			default:
				// nemo already has a few quicklist actions
				this.addAction(_("Recent files"), () => {
					Util.trySpawnCommandLine(commandName + ' recent:///');
				}, 'document-open-recent-symbolic');
			break;
		}

		// Read the file with GTK bookmarks
		let file = Gio.file_new_for_path('.config/gtk-3.0/bookmarks');
		let [result, contents] = file.load_contents(null);
		// TODO what about the other path possible, directly in the home??

		let noBookmarkLabel;
		let content;
		if (result) {
			noBookmarkLabel = _("No bookmark");
			content = stringFromArray(contents);
		} else {
			// TODO it catches Gio.File reading errors, but if the file doesn't
			// exist the whole thing just crashes before running this
			noBookmarkLabel = _("Error: could not read bookmarks");
			content = '';
		}

		// Build an array of [PopupMenuItem, command-as-string] pairs
		let bookmarks = [];
		let numberOfBookmarks = content.split('\n').length - 1;
		for(let i = 0; i < numberOfBookmarks; i++) {
			let text = '';
			for(var j = 1; j < content.split('\n')[i].split(' ').length; j++) {
				text += content.split('\n')[i].split(' ')[j] + ' ';
			}
			if (text == '') {
				text = content.split('\n')[i].split('/').pop();
			}
			bookmarks.push([
				new PopupMenu.PopupMenuItem(text),
				commandName + ' ' + content.split('\n')[i].split(' ')[0]
			]);
		}

		// Placeholder
		if (0 === numberOfBookmarks) {
			let placeholderItem = new PopupMenu.PopupMenuItem(
				noBookmarkLabel,
				{ reactive: false }
			);
			bookmarks.push([placeholderItem, '']);
			numberOfBookmarks = 1;
		}

		if (SETTINGS.get_boolean('use-submenu-bookmarks')) {
			this.bookmarksMenu = new PopupMenu.PopupSubMenuMenuItem(_("Bookmarks"));
			this.addMenuItem(this.bookmarksMenu);
		}

		// Add a menu item for each bookmark
		for(let j = 0; j < numberOfBookmarks; j++) {
			if (SETTINGS.get_boolean('use-submenu-bookmarks')) {
				this.bookmarksMenu.menu.addMenuItem(bookmarks[j][0]);
			} else {
				this.addMenuItem(bookmarks[j][0]);
			}
			bookmarks[j][0].connect('activate', () => {
				Util.trySpawnCommandLine(bookmarks[j][1]);
			});
		}
	};

	//--------------------------------------------------------------------------

	// This injects items in AppIconMenu's INJECTED_METHOD_NAME method (the
	// value of this variable isn't the same across versions), items being built
	// using the methods injected above.
	injections[INJECTED_METHOD_NAME] = injectToFunction(
		AppDisplay.AppIconMenu.prototype,
		INJECTED_METHOD_NAME,
		function() {
			this._appendSeparator();
			switch (this._source.app.get_id()) {
				case 'org.gnome.Nautilus.desktop':
					this._loadBookmarks('nautilus');
				break;
				case 'Thunar.desktop':
					this._loadBookmarks('thunar');
				break;
				case 'caja.desktop':
				case 'caja-browser.desktop':
					this._loadBookmarks('caja');
				break;
				case 'nemo.desktop':
					this._loadBookmarks('nemo');
				break;
				case 'gnome-tweak-tool.desktop':
				case 'org.gnome.tweaks.desktop':
					this.addAction(_("Manage extensions"), () => {
						Util.trySpawnCommandLine('gnome-shell-extension-prefs');
					});
				break;
				default:
					this._loadRecentFiles();
				break;
			}
		}
	);
}

//------------------------------------------------------------------------------

let RECENT_MANAGER;

function enable() {
	RECENT_MANAGER = new Gtk.RecentManager();
	SETTINGS = Convenience.getSettings();
	injectionInAppsMenus();
}

function disable() {
	removeInjection(AppDisplay.AppIconMenu.prototype, injections, INJECTED_METHOD_NAME);
	AppDisplay.AppIconMenu.prototype._loadRecentFiles = null;
	AppDisplay.AppIconMenu.prototype._addBookmarkButton = null;
	AppDisplay.AppIconMenu.prototype._loadBookmarks = null;
}

//------------------------------------------------------------------------------

