const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;
const PopupMenu = imports.ui.popupMenu;
const Gtk = imports.gi.Gtk;

const GLib = imports.gi.GLib;

const Util = imports.misc.util;

const Signals = imports.signals;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//-------------------------------------------------

let _foldersSchema;
let _folderList;
let _settings;

function init() {
	Convenience.initTranslations();
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

let injections=[];

//---------------------------------------------------------------------------


/* this function injects items in AppIconMenu's _redisplay method. */
function injectionInAppsMenus() {
	injections['_redisplay'] = injectToFunction(AppDisplay.AppIconMenu.prototype, '_redisplay', function(){
		this._appendSeparator();
		
		let id = this._source.app.get_id();
		
		let Ritems = RecentManager.get_items();
		//available types are: text, image, audio, video, application, multipart, message, model
		
		let menuItems = [];
		
		switch (id) {
			case 'org.gnome.Nautilus.desktop':
			case 'nemo.desktop':
				
				let file = Gio.file_new_for_path('.config/gtk-3.0/bookmarks');
				let [result, contents] = file.load_contents(null);
				if (!result) {
				    log('Could not read bookmarks file');
				}
				let content = contents.toString();
				
				let recents = this._appendMenuItem(_("Récents"));
				let corbeille = this._appendMenuItem(_("Corbeille"));
				let autres = this._appendMenuItem(_("Autres emplacements"));
				
				recents.connect('activate', Lang.bind(this, function() {
					Util.trySpawnCommandLine('nautilus recent:///');
				}));
				corbeille.connect('activate', Lang.bind(this, function() {
					Util.trySpawnCommandLine('nautilus trash:/');
				}));
				autres.connect('activate', Lang.bind(this, function() {
					Util.trySpawnCommandLine('nautilus other-locations:///');
				}));
				
				this.bookmarksMenu = new PopupMenu.PopupSubMenuMenuItem(_("Signets"));
				this.addMenuItem(this.bookmarksMenu);
				
				let bookmarks = [];
				
				for(var i = 0; i < content.split('\n').length-1; i++) {
					let text = '';
					for(var j=1; j<content.split('\n')[i].split(' ').length; j++) {
						text += content.split('\n')[i].split(' ')[j] + ' ';
					}
					if(text == '')
						text = content.split('\n')[i].split('/').pop();
						
					bookmarks.push([
						new PopupMenu.PopupMenuItem( text ),
						'nautilus ' + content.split('\n')[i].split(' ')[0]
					]);
				}
				
				for(var j = 0; j < content.split('\n').length-1; j++) {
					this.bookmarksMenu.menu.addMenuItem(bookmarks[j][0]),
					bookmarks[j][0].connect('activate', Lang.bind(bookmarks[j], function() {
						Util.trySpawnCommandLine(this[1]);
					}));
				}
			
				break;
			case 'gnome-tweak-tool.desktop':
				let exts = this._appendMenuItem(_("Gérer les extensions"));
				exts.connect('activate', Lang.bind(this, function() {
					Util.trySpawnCommandLine('gnome-shell-extension-prefs');
				}));
				break;
			case 'org.gnome.gedit.desktop':
				let textType = ['text'];//, 'application'];
				i = 0;
				while(menuItems.length < 8 || i < 15) {
					if(Ritems[i] == null || Ritems[i] == undefined) { break; }
					let itemtype = Ritems[i].get_mime_type();
		       		if (textType.indexOf((itemtype.split("/"))[0]) != -1) {
						menuItems.push([
							this._appendMenuItem(Ritems[i].get_display_name()),
							Ritems[i].get_uri()
						]);
					}
					i++;
				}
				for(var j = 0; j < menuItems.length-1; j++) {
					menuItems[j][0].connect('activate', Lang.bind(menuItems[j], function() {
						Gio.app_info_launch_default_for_uri(this[1], global.create_app_launch_context(0, -1));
					}));
				}
				break;
			case 'org.gnome.Totem.desktop':
			case 'mpv.desktop':
			case 'io.github.GnomeMpv.desktop':
				let mediatype = ['video'];
				i = 0;
				while(menuItems.length < 8 || i < 15) {
					if(Ritems[i] == null || Ritems[i] == undefined) { break; }
					let itemtype = Ritems[i].get_mime_type();
		       		if (mediatype.indexOf((itemtype.split("/"))[0]) != -1) {
						menuItems.push([
							this._appendMenuItem(Ritems[i].get_display_name()),
							Ritems[i].get_uri()
						]);
					}
					i++;
				}
				for(var j = 0; j < menuItems.length-1; j++) {
					menuItems[j][0].connect('activate', Lang.bind(menuItems[j], function() {
						Gio.app_info_launch_default_for_uri(this[1], global.create_app_launch_context(0, -1));
					}));
				}
				
			case 'org.gnome.Music.desktop':
			case 'rhythmbox.desktop':
				let musictype = ['audio'];
				i = 0;
				while(menuItems.length < 8 || i < 15) {
					if(Ritems[i] == null || Ritems[i] == undefined) { break; }
					let itemtype = Ritems[i].get_mime_type();
		       		if (musictype.indexOf((itemtype.split("/"))[0]) != -1) {
						menuItems.push([
							this._appendMenuItem(Ritems[i].get_display_name()),
							Ritems[i].get_uri()
						]);
					}
					i++;
				}
				for(var j = 0; j < menuItems.length-1; j++) {
					menuItems[j][0].connect('activate', Lang.bind(menuItems[j], function() {
						Gio.app_info_launch_default_for_uri(this[1], global.create_app_launch_context(0, -1));
					}));
				}
				break;
			default:
				log('[quicklist] unknown app');
				break;
		}
	});
}

//----------------------------------------------------

let RecentManager;

function enable() {
	RecentManager = new Gtk.RecentManager();
		
	
//	_settings = Convenience.getSettings();

	injectionInAppsMenus();
	
}

//-------------------------------------------------

function disable() {
	
	
	removeInjection(AppDisplay.AppIconMenu.prototype, injections, '_redisplay');
	
}



//-------------------------------------------------
