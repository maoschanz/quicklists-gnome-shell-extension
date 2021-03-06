
const St = imports.gi.St;

const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Extension = Me.imports.extension;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//------------------------------------------------------------------------------

/**
 * Load into the app's icon menu a list of items corresponding to recently used
 * files whose types are among the MIME types supported by the app.
 */
var loadItems = function () {
	// Various guard clauses
	if(0 === Extension.SETTINGS.get_int('max-recents')) return;
	let appinfo = this._source.app.get_app_info();
	if(appinfo == null || !appinfo.supports_uris()) return;
	let app_types = this._source.app.get_app_info().get_supported_types()
	// XXX that's not enough? gedit is still fucking dumb and ignore 99% of what
	// it should open.
	if(app_types == null) return;

	this._appendSeparator();

	// Remember as `this._recentFilesMenu` the menu where items shall be added.
	if(Extension.SETTINGS.get_boolean('use-submenu-recent')) {
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
	let recentItems = Extension.RECENT_MANAGER.get_items();

	// Add compatible files to `this._recentFilesMenu`
	let nbItems = 0;
	for(let i = 0; i < recentItems.length; i++) {
		if( !recentItems[i].exists() ) {
			// do nothing
		} else if(nbItems >= Extension.SETTINGS.get_int('max-recents')) {
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
				Extension.tryCloseOverview();
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
}


