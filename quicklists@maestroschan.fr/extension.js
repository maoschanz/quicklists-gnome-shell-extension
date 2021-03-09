
const Gtk = imports.gi.Gtk;
const ShellVersion = imports.misc.config.PACKAGE_VERSION;
const Mainloop = imports.mainloop;

const Main = imports.ui.main;
const AppDisplay = imports.ui.appDisplay;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const LoaderRecent = Me.imports.content_loaders.recentFiles;
const LoaderPlaces = Me.imports.content_loaders.places;
const LoaderWebFavs = Me.imports.content_loaders.webFavorites;
const LoaderCustom = Me.imports.content_loaders.custom;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//------------------------------------------------------------------------------

var RECENT_MANAGER;
var SETTINGS;

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

var tryCloseOverview = function() {
	if(SETTINGS.get_boolean('close-overview')) {
		Main.overview.hide();
	}
}

//------------------------------------------------------------------------------

/**
 * Add to AppDisplay.AppIconMenu the required methods to load the recently used
 * files into the menu
 */
function addRecentFilesLoader() {
	AppDisplay.AppIconMenu.prototype._loadRecentFiles = LoaderRecent.loadItems;
}

/**
 * Add to AppDisplay.AppIconMenu the required methods to load the places
 * bookmarks and other file-managing-related items into the menu
 */
function addPlacesLoader() {
	AppDisplay.AppIconMenu.prototype._addSpecialPlaces = LoaderPlaces.addSpecialPlaces;
	AppDisplay.AppIconMenu.prototype._addSpecialPlaceButton = LoaderPlaces.addSpecialPlaceButton
	AppDisplay.AppIconMenu.prototype._loadBookmarks = LoaderPlaces.loadItems;
}

/**
 * Add to AppDisplay.AppIconMenu the required methods to load the favorites
 * websites into the menu
 */
function addWebFavoritesLoader() {
	AppDisplay.AppIconMenu.prototype._loadWebFavorites = LoaderWebFavs.loadItems;
}

/**
 * Add to AppDisplay.AppIconMenu the required methods to load the favorites
 * websites into the menu
 */
function addCustomLoader() {
	AppDisplay.AppIconMenu.prototype._loadCustom = LoaderCustom.loadItems;
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
					case 'phpstorm_phpstorm.desktop':
						this._loadCustom();
					break;
					// case 'firefox.desktop':
					// case 'org.gnome.Epiphany.desktop':
					// case 'google-chrome.desktop':
					// case 'falkon.desktop':
					// 	this._loadWebFavorites();
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

	addPlacesLoader();
	addRecentFilesLoader();
	addWebFavoritesLoader();
	addCustomLoader();

	injectInAppsMenus();
}

function disable() {
	removeInjection(AppDisplay.AppIconMenu.prototype, INJECTIONS, INJECTED_METHOD_NAME);
	AppDisplay.AppIconMenu.prototype._loadRecentFiles = null;
	AppDisplay.AppIconMenu.prototype._addBookmarkButton = null;
	AppDisplay.AppIconMenu.prototype._loadBookmarks = null;
	AppDisplay.AppIconMenu.prototype._loadWebFavorites = null;
}

//------------------------------------------------------------------------------

