
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;

const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//-------------------------------------------------

let SETTINGS;

function init() {
	Convenience.initTranslations();
}

function stringFromArray(data){
	if (data instanceof Uint8Array) {
		return imports.byteArray.toString(data);
	} else {
		return data.toString();
	}
}

//-------------------------------------------------
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

function getButton(icon_name, accessible_name) {
	let newButton = new St.Button({
		reactive: true,
		can_focus: true,
		track_hover: true,
		accessible_name: accessible_name,
		style_class: 'button',
		style: 'padding-right: 12px; padding-left: 12px;',
	});
	newButton.child = new St.Icon({
		icon_name: icon_name,
		icon_size: 16,
	});
	return newButton;
}

function injectionInAppsMenus() {
	AppDisplay.AppIconMenu.prototype.loadRecentFiles = function () {
		if (0 == SETTINGS.get_int('max-recents')) { return; }
		let recentItems = RECENT_MANAGER.get_items();
		let appinfo = this._source.app.get_app_info();
		if (appinfo == null || !appinfo.supports_uris()) { return; }
		let app_types = this._source.app.get_app_info().get_supported_types()
		if (app_types == null) { return; }
		if (SETTINGS.get_boolean('use-submenu-recent')) {
			let recentMenuItem = new PopupMenu.PopupSubMenuMenuItem(_("Recent files"));
			this.addMenuItem(recentMenuItem);
			this.recentMenu = recentMenuItem.menu;
		} else {
			this.recentMenu = new PopupMenu.PopupMenuSection();
			this.recentMenu.actor.label_actor = new St.Label({text: ''}); // XXX ??????
			this.addMenuItem(this.recentMenu);
		}
		let nbItems = 0;
		for (let i=0; i<recentItems.length; i++) {
			if ( !recentItems[i].exists() ) {
				// do nothing
			} else if (nbItems >= SETTINGS.get_int('max-recents')) {
				break;
			} else if (app_types.indexOf(recentItems[i].get_mime_type()) != -1) {
				let label = recentItems[i].get_display_name();
				let recent_item = new PopupMenu.PopupMenuItem(label);
				this.recentMenu.addMenuItem(recent_item);
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
	};
	
	//--------------------------------------------------------------------------
	
	AppDisplay.AppIconMenu.prototype.addBookmarkButton = function (item, command, icon, accessibleName) {
		let newButton = getButton(icon, accessibleName);
		newButton.connect('clicked', () => {
			Util.trySpawnCommandLine(command);
			this.close();
		});
		item.actor.add(newButton, { expand: true, x_fill: false });
	};
	
	AppDisplay.AppIconMenu.prototype.loadBookmarks = function (commandName) {
		let file = Gio.file_new_for_path('.config/gtk-3.0/bookmarks');
		let [result, contents] = file.load_contents(null); //TODO l'autre emplacement pour le fichier ?
		if (!result) {
			log('ERROR: Could not read bookmarks file');
		}
		let content = stringFromArray(contents);
		
		switch (commandName) {
			case 'nautilus':
				let buttons_item = new PopupMenu.PopupBaseMenuItem({
					reactive: false,
					can_focus: false
				});
				buttons_item.actor.label_actor = new St.Label({text: ''}); // XXX ??????
				this.addBookmarkButton(buttons_item, commandName + ' recent:///',
					        'document-open-recent-symbolic', _("Recent files"));
				this.addBookmarkButton(buttons_item, commandName + ' trash:///',
					                         'user-trash-symbolic', _("Trash"));
				this.addBookmarkButton(buttons_item, commandName + ' starred:///',
					                        'starred-symbolic', _("Favorites"));
				this.addBookmarkButton(buttons_item, commandName + ' other-locations:///',
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
			default: // case 'nemo':
				// nemo already has quicklist actions
				this.addAction(_("Recent files"), () => {
					Util.trySpawnCommandLine(commandName + ' recent:///');
				}, 'document-open-recent-symbolic');
			break;
		}
		
		let bookmarks = [];
		let numberOfBookmarks = content.split('\n').length-1;
		for(let i = 0; i < numberOfBookmarks; i++) {
			let text = '';
			for(var j=1; j<content.split('\n')[i].split(' ').length; j++) {
				text += content.split('\n')[i].split(' ')[j] + ' ';
			}
			if (text == '') {
				text = content.split('\n')[i].split('/').pop();
			}
			bookmarks.push([
				new PopupMenu.PopupMenuItem( text ),
				'nautilus ' + content.split('\n')[i].split(' ')[0]
			]);
		}
		if (SETTINGS.get_boolean('use-submenu-bookmarks')) {
			this.bookmarksMenu = new PopupMenu.PopupSubMenuMenuItem(_("Bookmarks"));
			this.addMenuItem(this.bookmarksMenu);
		}
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
	
	// This injects items in AppIconMenu's _redisplay method, using the methods
	// previously defined.
	injections['_redisplay'] = injectToFunction(AppDisplay.AppIconMenu.prototype, '_redisplay', function() {
		this._appendSeparator();
		switch (this._source.app.get_id()) {
			case 'org.gnome.Nautilus.desktop':
				this.loadBookmarks('nautilus');
			break;
			case 'Thunar.desktop':
				this.loadBookmarks('thunar');
			break;
			case 'caja.desktop':
			case 'caja-browser.desktop':
				this.loadBookmarks('caja');
			break;
			case 'nemo.desktop':
				this.loadBookmarks('nemo');
			break;
			case 'gnome-tweak-tool.desktop':
			case 'org.gnome.tweaks.desktop':
				this.addAction(_("Manage extensions"), () => {
					Util.trySpawnCommandLine('gnome-shell-extension-prefs');
				});
			break;
			default:
				this.loadRecentFiles();
			break;
		}
	});
}

//----------------------------------------------------

let RECENT_MANAGER;

function enable() {
	RECENT_MANAGER = new Gtk.RecentManager();
	SETTINGS = Convenience.getSettings();
	injectionInAppsMenus();
}

//-------------------------------------------------

function disable() {
	removeInjection(AppDisplay.AppIconMenu.prototype, injections, '_redisplay');
	AppDisplay.AppIconMenu.prototype.loadRecentFiles = null;
	AppDisplay.AppIconMenu.prototype.addBookmarkButton = null;
	AppDisplay.AppIconMenu.prototype.loadBookmarks = null;
}

//-------------------------------------------------

