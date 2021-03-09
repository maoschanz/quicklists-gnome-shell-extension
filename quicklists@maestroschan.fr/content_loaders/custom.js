
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Util = imports.misc.util;
const Mainloop = imports.mainloop;

const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Extension = Me.imports.extension;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

//------------------------------------------------------------------------------

/**
 * Load into the app's icon menu a list of items corresponding to phpstorm
 * projects in ~/Code
 */
var loadItems = function () {
	this._appendSeparator();

	// Read the file with GTK bookmarks
	let noBookmarkLabel = "";
	let content = [];
	let allItems = [];
	try {
		let dir = Gio.file_new_for_path('Code');
		let enumerator = dir.enumerate_children("*", Gio.FileQueryInfoFlags.NONE, null);
		
		let project_name = "";
		let namespace = "";
		let project = null;
		do {
			project = enumerator.next_file(null);
			if(project) {
				project_name = project.get_name();
				if(project_name.startsWith('com.')) {
					namespace = project_name.split('.')[1];
					if(content[namespace]) {
						content[namespace] += dir.get_path() + '/' + project_name + '\n';
					} else {
						content[namespace] = dir.get_path() + '/' + project_name + '\n';
						allItems[namespace] = [];
					}
				}
			}
		} while(project);

		if(!content) {
			noBookmarkLabel = _("No project");
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

	// Build arrays of [PopupMenuItem, command-as-string] pairs
	let numberOfBookmarks = 0;
	for (const namespace in allItems) {
		numberOfBookmarks = content[namespace].split('\n').length - 1;
		for(let i = 0; i < numberOfBookmarks; i++) {
			let text = '';
			for(var j = 1; j < content[namespace].split('\n')[i].split(' ').length; j++) {
				text += content[namespace].split('\n')[i].split(' ')[j] + ' ';
			}
			if(text == '') {
				text = content[namespace].split('\n')[i].split('/').pop();
			}
			allItems[namespace].push([
				new PopupMenu.PopupMenuItem(text),
				'phpstorm ' + content[namespace].split('\n')[i].split(' ')[0]
			]);
		}
	}
	
	this.bookmarksMenu = new PopupMenu.PopupMenuSection();
	this.addMenuItem(this.bookmarksMenu);

	// Add a menu item for each bookmark
	for (const namespace in allItems) {
		let namespaceSubmenu = new PopupMenu.PopupSubMenuMenuItem(namespace);
		numberOfBookmarks = allItems[namespace].length;
		for(let j = 0; j < numberOfBookmarks; j++) {
			namespaceSubmenu.menu.addMenuItem(allItems[namespace][j][0]);
			allItems[namespace][j][0].connect('activate', () => {
				Util.trySpawnCommandLine(allItems[namespace][j][1]);
				Extension.tryCloseOverview();
			});
		}
		this.bookmarksMenu.addMenuItem(namespaceSubmenu);
	}

	// Placeholder
	if(0 === namespace.length) {
		let placeholderItem = new PopupMenu.PopupMenuItem(
			noBookmarkLabel,
			{ reactive: false }
		);
		this.bookmarksMenu.addMenuItem(placeholderItem);
	}
}

