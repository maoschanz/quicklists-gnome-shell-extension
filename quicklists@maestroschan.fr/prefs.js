
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

const QuicklistsPrefsWidget = new Lang.Class({
	Name: "QuicklistsPrefsWidget",
	Extends: Gtk.Box,
	
	_init () {
		this.parent({
			visible: true,
			can_focus: false,
			margin_left: 50,
			margin_right: 50,
			margin_top: 20,
			margin_bottom: 20,
			orientation: Gtk.Orientation.VERTICAL,
			spacing: 18
		});
		//----------------------------------------------------------------------
		let s1 = this.addSection(_("Bookmarks"));
		
		s1.add(this.addRow(
			_("Display bookmarks in a submenu:"),
			_("Nautilus and Nemo icons will display your bookmarks. If you have many, a submenu is recommended."),
			this.getSwitch('use-submenu-bookmarks')
		));
		//----------------------------------------------------------------------
		let s2 = this.addSection(_("Recent files"));
		
		let recentFilesNumber_spinButton = new Gtk.SpinButton({ valign: Gtk.Align.CENTER });
		recentFilesNumber_spinButton.set_range(0, 40);
		recentFilesNumber_spinButton.set_value(SETTINGS.get_int('max-recents'));
		recentFilesNumber_spinButton.set_increments(1, 1);
		recentFilesNumber_spinButton.connect(
			'value-changed',
			Lang.bind(this, function (w) {
				var value = w.get_value_as_int();
				SETTINGS.set_int('max-recents', value);
			})
		);
		s2.add(this.addRow(
			_("Number of recent files in a menu:"),
			_("The maximum number of recent files which will be displayed in the menu of an application's icon."),
			recentFilesNumber_spinButton
		));
		s2.add(this.addRow(
			_("Display recent files in a submenu:"),
			_("Applications' icons will display recently opened files they can open. If you want many, a submenu is recommended."),
			this.getSwitch('use-submenu-recent')
		));
		//----------------------------------------------------------------------
		let s3 = this.addSection(_("About"));
		
		let url_button = new Gtk.LinkButton({
			label: _("Report bugs or ideas"),
			uri: Me.metadata.url.toString()
		});
		let version_label = new Gtk.Label({
			label: ' (v' + Me.metadata.version.toString() + ') ',
		});
		s3.add(this.addRow('<b>' + Me.metadata.name.toString() + '</b>', null, version_label));
		s3.add(this.addRow(
			_(Me.metadata.description.toString()),
			"NOT COMPATIBLE WITH DASH-TO-DOCK THUMBNAIL PREVIEWS",
			new Gtk.Box()
		));
		s3.add(this.addRow(_("Author:") + " Romain F. T.", null, url_button));
		//----------------------------------------------------------------------
	},
	
	addSection (titre) {
		let frame = new Gtk.Frame({
			label: titre,
			label_xalign: 0.1,
		});
		let listbox = new Gtk.Box({	orientation: Gtk.Orientation.VERTICAL });
		frame.add(listbox);
		this.add(frame);
		return listbox;
	},
	
	addRow (label, tooltip, widget) {
		let rowLabel = new Gtk.Label({
			label: label,
			halign: Gtk.Align.START,
//			wrap: true,
			use_markup: true,
			visible: true,
		});
		let rowBox = new Gtk.Box({
			orientation: Gtk.Orientation.HORIZONTAL,
			tooltip_text: tooltip,
			spacing: 15,
			margin: 10,
			visible: true,
		});
		rowBox.pack_start(rowLabel, false, false, 0);
		rowBox.pack_end(widget, false, false, 0);
		return rowBox;
	},
	
	getSwitch (booleanSetting) {
		let rowSwitch = new Gtk.Switch({ valign: Gtk.Align.CENTER });
		rowSwitch.set_state(SETTINGS.get_boolean(booleanSetting));
		rowSwitch.connect('notify::active', (widget) => {
			SETTINGS.set_boolean(booleanSetting, widget.active);
		});
		return rowSwitch;
	},
});

let SETTINGS = Convenience.getSettings();

function buildPrefsWidget() {
	let widget = new QuicklistsPrefsWidget();
	widget.show_all();
	return widget;
}


