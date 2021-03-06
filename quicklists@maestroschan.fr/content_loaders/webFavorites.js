
const St = imports.gi.St;
const Util = imports.misc.util;

const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Extension = Me.imports.extension;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//------------------------------------------------------------------------------

/**
 * Load into the app's icon menu a list of items corresponding to favorite
 * websites as configured in the extension preferences.
 */
var loadItems = function () {

	this._appendSeparator();

	// Remember as `this._webFavsMenu` the menu where items shall be added.
	if(Extension.SETTINGS.get_boolean('use-submenu-webfav')) {
		let recentMenuItem = new PopupMenu.PopupSubMenuMenuItem(_("Favorite websites"));
		this.addMenuItem(recentMenuItem);
		this._webFavsMenu = recentMenuItem.menu;
	} else {
		// That labeled separator would be prefered by GS designers, but the
		// current implementation is really very ugly. So no.
		// this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_("Favorite websites")));
		this._webFavsMenu = new PopupMenu.PopupMenuSection();
		this._webFavsMenu.actor.label_actor = new St.Label({text: ''});
		this.addMenuItem(this._webFavsMenu);
	}

	let nbItems = 0;
	// TODO

	// Placeholder
	if(0 === nbItems) {
		let recent_item = new PopupMenu.PopupMenuItem(
			_("No favorite website is configured"),
			{ reactive: false }
		); // TODO a reactive item could open the prefs
		this._webFavsMenu.addMenuItem(recent_item);
	}
}

