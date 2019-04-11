
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

//---------------------------------------------------------------------------

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

/* this function injects items in AppIconMenu's _redisplay method. */
function injectionInAppsMenus() {
	injections['_redisplay'] = injectToFunction(AppDisplay.AppIconMenu.prototype, '_redisplay', function() {
		this._appendSeparator();
		let id = this._source.app.get_id();
		let menuItems = [];

		switch (id) {

			case 'org.gnome.Nautilus.desktop':
//			case 'nemo.desktop': //FIXME s'affiche sur l'icône mais ne s'ouvre pas
				let file = Gio.file_new_for_path('.config/gtk-3.0/bookmarks');
				let [result, contents] = file.load_contents(null); //TODO l'autre emplacement pour le fichier ?
				if (!result) {
					log('Could not read bookmarks file');
				}
				let content = stringFromArray(contents);
				
				let buttons_item = new PopupMenu.PopupBaseMenuItem({
					reactive: false,
					can_focus: false
				});
				
				let newButton0 = getButton('document-open-recent-symbolic', _("Recent files"));
				newButton0.connect('clicked', () => {
					Util.trySpawnCommandLine('nautilus recent:///');
					this.close();
				});
				buttons_item.actor.add(newButton0, { expand: true, x_fill: false });
				
				let newButton1 = getButton('user-trash-symbolic', _("Trash"));
				newButton1.connect('clicked', () => {
					Util.trySpawnCommandLine('nautilus trash:///');
					this.close();
				});
				buttons_item.actor.add(newButton1, { expand: true, x_fill: false });
				
				let newButton2 = getButton('list-add-symbolic', _("Other places"));
				newButton2.connect('clicked', () => {
					Util.trySpawnCommandLine('nautilus other-locations:///');
					this.close();
				});
				buttons_item.actor.add(newButton2, { expand: true, x_fill: false });
				
				this.addMenuItem(buttons_item);
				
				if (SETTINGS.get_boolean('use-submenu-bookmarks')) {
					this.bookmarksMenu = new PopupMenu.PopupSubMenuMenuItem(_("Bookmarks"));
					this.addMenuItem(this.bookmarksMenu);
				}
				
				let bookmarks = [];
				for(var i = 0; i < content.split('\n').length-1; i++) {
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
				for(let j=0; j<content.split('\n').length-1; j++) {
					if (SETTINGS.get_boolean('use-submenu-bookmarks')) {
						this.bookmarksMenu.menu.addMenuItem(bookmarks[j][0]);
					} else {
						this.addMenuItem(bookmarks[j][0]);
					}
					bookmarks[j][0].connect('activate', () => {
						Util.trySpawnCommandLine(bookmarks[j][1]);
					});
				}
			break;

			case 'gnome-tweak-tool.desktop':
			case 'org.gnome.tweaks.desktop':
				let exts = this._appendMenuItem(_("Manage extensions"));
				exts.connect('activate', () => {
					Util.trySpawnCommandLine('gnome-shell-extension-prefs');
				});
			break;

			default:
				if (0 == SETTINGS.get_int('max-recents')) { return; }
				let recentItems = RECENT_MANAGER.get_items();
				i = 0;
				let appinfo = this._source.app.get_app_info();
				if (appinfo == null || !appinfo.supports_uris()) { return; }
				let app_types = this._source.app.get_app_info().get_supported_types()
				if (app_types == null) { return; }
				if (SETTINGS.get_boolean('use-submenu-recent')) {
					this.recentMenu = new PopupMenu.PopupSubMenuMenuItem(_("Recent files"));
					this.addMenuItem(this.recentMenu);
				}
				let nbItems = 0;
				for (i=0; i<recentItems.length; i++) {
					if ( !recentItems[i].exists() ) {
						// rien
					} else if (nbItems >= SETTINGS.get_int('max-recents')) {
						break;
					} else if (app_types.indexOf(recentItems[i].get_mime_type()) != -1) {
						let label = recentItems[i].get_display_name();
						let recent_item = new PopupMenu.PopupMenuItem(label);
						if (SETTINGS.get_boolean('use-submenu-recent')) {
							this.recentMenu.menu.addMenuItem(recent_item);
						} else {
							this.addMenuItem(recent_item);
						}
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
}

//-------------------------------------------------

