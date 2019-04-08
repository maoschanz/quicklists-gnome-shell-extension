
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Lang = imports.lang;

const Mainloop = imports.mainloop;

const Gettext = imports.gettext.domain('quicklists');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

//------------------------------------------------------------------------------

function init() {
	Convenience.initTranslations();
}

//------------------------------------------------------------------------------

const PrefsPage = new Lang.Class({
	Name: "PrefsPage",
	Extends: Gtk.ScrolledWindow,

	_init: function () {
		this.parent({
			vexpand: true,
			can_focus: true
		});
		
		this.stackpageMainBox = new Gtk.Box({
			visible: true,
			can_focus: false,
			margin_left: 50,
			margin_right: 50,
			margin_top: 20,
			margin_bottom: 20,
			orientation: Gtk.Orientation.VERTICAL,
			spacing: 18
		});
		this.add(this.stackpageMainBox);
	},
	
	add_section: function(titre) {
		let section = new Gtk.Box({
			orientation: Gtk.Orientation.VERTICAL,
			spacing: 6,
		});
		if (titre != "") {
			section.add(new Gtk.Label({
				label: '<b>' + titre + '</b>',
				halign: Gtk.Align.START,
				use_markup: true,
			}));
		}
		
		let fr = new Gtk.Frame();
		let lb = new Gtk.ListBox({
			can_focus: true,
			selection_mode: Gtk.SelectionMode.NONE,
		});
		section.add(fr);
		fr.add(lb);
		this.stackpageMainBox.add(section);
		return lb;
	},

	add_row: function(filledbox, section) {
		let a = new Gtk.ListBoxRow({
			can_focus: true,
			selectable: false,
		});
		a.add(filledbox);
		section.add(a);
		return a;
	},
	
	add_widget: function(filledbox) {
		this.stackpageMainBox.add(filledbox);
	},
});

//--------------------

const QuicklistsPrefsWidget = new Lang.Class({
	Name: "QuicklistsPrefsWidget",
	Extends: Gtk.Stack,
	
	_init: function () {
		this.parent({transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT});
		
		this.switcher = new Gtk.StackSwitcher({
			halign: Gtk.Align.CENTER,
			stack: this
		});
		this.switcher.show_all();
		
		this.buildSettingsPage();
		this.buildAboutPage();
	},
	
	buildSettingsPage () {
		let settingsPage = this.add_page("settings", _("Settings"));
		let bookmarksSection = settingsPage.add_section(_("Bookmarks"));
		let recentSection = settingsPage.add_section(_("Recent files"));
	
		//-------------------------------------------------
		
		let bookmarksMenu_label = new Gtk.Label({
			label: _("Display bookmarks in a submenu:"),
			halign: Gtk.Align.START
		});
		
		let bookmarksMenu_switch = new Gtk.Switch();
		bookmarksMenu_switch.set_state(false);
		bookmarksMenu_switch.set_state(SETTINGS.get_boolean('use-submenu-bookmarks'));
		
		bookmarksMenu_switch.connect('notify::active', Lang.bind(this, function(widget) {
			if (widget.active) {
				SETTINGS.set_boolean('use-submenu-bookmarks', true);
			} else {
				SETTINGS.set_boolean('use-submenu-bookmarks', false);
			}
		}));
		
		let bookmarksMenu_box = new Gtk.Box({
			tooltip_text: _("Nautilus and Nemo icons will display your bookmarks. If you have many, a submenu is recommended."),
			orientation: Gtk.Orientation.HORIZONTAL,
			spacing: 15,
			margin: 6,
		});
		bookmarksMenu_box.pack_start(bookmarksMenu_label, false, false, 0);
		bookmarksMenu_box.pack_end(bookmarksMenu_switch, false, false, 0);
		
		//------------------------------------------------
		
		let recentFilesNumber_label = new Gtk.Label({
			label: _("Number of recent files in a menu:"),
			halign: Gtk.Align.START
		});
		
		let recentFilesNumber_spinButton = new Gtk.SpinButton();
		recentFilesNumber_spinButton.set_sensitive(true);
		recentFilesNumber_spinButton.set_range(0, 30);
		recentFilesNumber_spinButton.set_value(8);
		recentFilesNumber_spinButton.set_value(SETTINGS.get_int('max-recents'));
		recentFilesNumber_spinButton.set_increments(1, 1);
		
		recentFilesNumber_spinButton.connect('value-changed', Lang.bind(this, function(w){
			var value = w.get_value_as_int();
			SETTINGS.set_int('max-recents', value);
		}));
		
		let recentFilesNumber_box = new Gtk.Box({
			orientation: Gtk.Orientation.HORIZONTAL,
			spacing: 15,
			margin: 6,
			tooltip_text: _("The maximum number of recent files which will be displayed in the menu of an application's icon."),
		});
		recentFilesNumber_box.pack_start(recentFilesNumber_label, false, false, 0);
		recentFilesNumber_box.pack_end(recentFilesNumber_spinButton, false, false, 0);
		
		//------------------------------------------------
		
		let recentFilesMenu_label = new Gtk.Label({
			label: _("Display recent files in a submenu:"),
			halign: Gtk.Align.START
		});
		
		let recentFilesMenu_switch = new Gtk.Switch();
		recentFilesMenu_switch.set_state(false);
		recentFilesMenu_switch.set_state(SETTINGS.get_boolean('use-submenu-recent'));
		
		recentFilesMenu_switch.connect('notify::active', Lang.bind(this, function(widget) {
			if (widget.active) {
				SETTINGS.set_boolean('use-submenu-recent', true);
			} else {
				SETTINGS.set_boolean('use-submenu-recent', false);
			}
		}));
		
		let recentFilesMenu_box = new Gtk.Box({
			tooltip_text: _("Applications' icons will display recently opened files they can open. If you want many, a submenu is recommended."),
			orientation: Gtk.Orientation.HORIZONTAL,
			spacing: 15,
			margin: 6,
		});
		recentFilesMenu_box.pack_start(recentFilesMenu_label, false, false, 0);
		recentFilesMenu_box.pack_end(recentFilesMenu_switch, false, false, 0);
		
		//------------------------------------------------
		
		settingsPage.add_row(bookmarksMenu_box, bookmarksSection);
		settingsPage.add_row(recentFilesNumber_box, recentSection);
		settingsPage.add_row(recentFilesMenu_box, recentSection);
	},
	
	buildAboutPage () {
		let aboutPage = this.add_page("about", _("About"));
		
		let label_name = new Gtk.Label({
			label: '<b>' + Me.metadata.name.toString() + '</b>',
			use_markup: true,
			halign: Gtk.Align.CENTER
		});
		let label_warning = new Gtk.Label({
			label: "NOT COMPATIBLE WITH DASH-TO-DOCK THUMBNAIL PREVIEWS",
			wrap: true,
			halign: Gtk.Align.CENTER
		});
		let label_description = new Gtk.Label({
			label: _(Me.metadata.description.toString()),
			wrap: true,
			halign: Gtk.Align.CENTER
		});
		let label_contributors = new Gtk.Label({
			label: "Author: Romain F. T.",
			wrap: true,
			halign: Gtk.Align.CENTER
		});
		
		let about_box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 10});
		about_box.pack_start(label_name, false, false, 0);
		about_box.pack_start(label_description, false, false, 0);
		about_box.pack_start(label_warning, false, false, 0);
		about_box.pack_start(label_contributors, false, false, 0);
		
		let linkBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 10 });
		
		let url_button = new Gtk.LinkButton({
			label: _("Report bugs or ideas"),
			uri: Me.metadata.url.toString()
		});
		
		linkBox.pack_start(url_button, false, false, 0);
		linkBox.pack_end(new Gtk.Label({
			label: ' (v' + Me.metadata.version.toString() + ') ',
			halign: Gtk.Align.START
		}), false, false, 0);
		
		aboutPage.stackpageMainBox.pack_end(linkBox, false, false, 0);
		
		aboutPage.add_widget(about_box);
	},
	
	add_page: function (id, title) {
		let page = new PrefsPage();
		this.add_titled(page, id, title);
		return page;
	}
});

let SETTINGS = Convenience.getSettings();

function buildPrefsWidget() {
	let widget = new QuicklistsPrefsWidget();
	
	Mainloop.timeout_add(0, () => {
		let headerBar = widget.get_toplevel().get_titlebar();
		headerBar.custom_title = widget.switcher;
		return false;
	});
	
	widget.show_all();
	
	return widget;
}


