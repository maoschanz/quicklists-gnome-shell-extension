
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

////////////////////////////////////////////////////////////////////////////////

const QuicklistsPrefsWidget = new Lang.Class({
	Name: "QuicklistsPrefsWidget",
	Extends: Gtk.Box,

	_init () {
		this.parent({
			visible: true,
			can_focus: false,
			halign: Gtk.Align.CENTER,
			orientation: Gtk.Orientation.HORIZONTAL
		});

		this._stack = new Gtk.Stack({
			visible: true,
			can_focus: false,
			transition_type: Gtk.StackTransitionType.SLIDE_UP_DOWN,
		});
		this.add(new Gtk.StackSidebar({
			visible: true,
			can_focus: false,
			stack: this._stack,
		}));
		this.add(this._stack);

		this._loadPageGeneral();
		this._loadPageRecent();
		this._loadPagePlaces();
		// this._loadPageBookmarks();
		this._loadPageAbout();
	},

	//--------------------------------------------------------------------------

	_loadPageGeneral () {
		let page = new QuicklistsPageWidget();
		this._stack.add_titled(page, 'general', _("General"));

		page.addSettingRow(
			_("Automatically close the overview"),
			page.getSwitch('close-overview')
		);
		page.addHelpLabel(_("Close the overview after clicking on a menu item."));

		page.startSection();

		page.addSettingRow(
			_("Searchable lists"),
			page.getSwitch('enable-search')
		);
	},

	_loadPageRecent () {
		let page = new QuicklistsPageWidget();
		this._stack.add_titled(page, 'files', _("Recent files"));

		let recentFilesNumber_spinButton = new Gtk.SpinButton({
			valign: Gtk.Align.CENTER,
			halign: Gtk.Align.START
			// TODO construire un max ici
		});
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
		page.addSettingRow(
			_("Number of recent files in a menu"),
			recentFilesNumber_spinButton
		);
		page.addHelpLabel(_("The maximum number of recent files which will " +
		                 "be displayed in the menu of an application's icon."));

		page.startSection();

		page.addSettingRow(
			_("Display recent files in a submenu"),
			page.getSwitch('use-submenu-recent')
		);
		page.addHelpLabel(_("Applications' icons will display recently " +
		         "opened files they can open. If you want many, a submenu is " +
		                                                       "recommended."));
	},

	_loadPagePlaces () {
		let page = new QuicklistsPageWidget();
		this._stack.add_titled(page, 'places', _("Bookmarks"));

		page.addSettingRow(
			_("Display bookmarks in a submenu"),
			page.getSwitch('use-submenu-bookmarks')
		);
		page.addHelpLabel(_("File managers icons will display your bookmarks." +
		                       " If you have many, a submenu is recommended."));
	},

	_loadPageBookmarks () {
		let page = new QuicklistsPageWidget();
		this._stack.add_titled(page, 'web', _("Web favorites"));

		// TODO
	},

	_loadPageAbout () {
		let page = new QuicklistsPageWidget();
		this._stack.add_titled(page, 'about', _("About"));

		let urlButton = new Gtk.LinkButton({
			label: _("Report bugs or ideas"),
			uri: Me.metadata.url.toString() + "/issues",
			valign: Gtk.Align.CENTER,
			halign: Gtk.Align.START
		});
		page.addSettingRow(
			_("Version %s").replace('%s', Me.metadata.version.toString()),
			urlButton
		);

		// page.addHelpLabel(_(Me.metadata.description.toString()));

		page.startSection();

		page.addSettingRow(_("Author"), new Gtk.Label({
			halign: Gtk.Align.START,
			label: "Romain F. T."
		}));

		// TODO supporter un array de traducteurs
		if(_('translator-credits') != 'translator-credits') {
			page.addSettingRow(_("Translator"), new Gtk.Label({
				halign: Gtk.Align.START,
				label: _('translator-credits')
			}));
		}
	},
});

////////////////////////////////////////////////////////////////////////////////

const QuicklistsPageWidget = new Lang.Class({
	Name: "QuicklistsPageWidget",
	Extends: Gtk.Grid,

	_init () {
		this.parent({
			visible: true,
			can_focus: false,
			halign: Gtk.Align.CENTER,
			column_spacing: 16,
			row_spacing: 12,
			margin: 12
		});
		this._currentY = 0;
	},

	//--------------------------------------------------------------------------

	startSection (title = null) {
		let separator = new Gtk.Separator({
			valign: Gtk.Align.CENTER
		});
		if(title) {
			let rowLabel = new Gtk.Label({
				label: "<b>" + title + "</b>",
				halign: Gtk.Align.END,
				use_markup: true
			});
			this.attach(rowLabel, 0, this._currentY, 1, 1);
			this.attach(separator, 1, this._currentY, 2, 1);
		} else {
			this.attach(separator, 0, this._currentY, 3, 1);
		}

		this._currentY++;
	},

	addSettingRow (label, widget) {
		let rowLabel = new Gtk.Label({
			label: label,
			halign: Gtk.Align.END,
			use_markup: true
		});
		this.attach(rowLabel, 0, this._currentY, 2, 1);
		this.attach(widget, 2, this._currentY, 1, 1);

		this._currentY++;
	},

	addHelpLabel (helpLabel) {
		let rowLabel = new Gtk.Label({
			label: helpLabel,
			halign: Gtk.Align.CENTER,
			wrap: true,
			use_markup: true,
			max_width_chars: 60
		});
		rowLabel.get_style_context().add_class('dim-label');
		this.attach(rowLabel, 0, this._currentY, 3, 1);

		this._currentY++;
	},

	getSwitch (booleanSetting) {
		let rowSwitch = new Gtk.Switch({
			valign: Gtk.Align.CENTER,
			halign: Gtk.Align.START
		});
		rowSwitch.set_state(SETTINGS.get_boolean(booleanSetting));
		rowSwitch.connect('notify::active', (widget) => {
			SETTINGS.set_boolean(booleanSetting, widget.active);
		});
		return rowSwitch;
	},
});

////////////////////////////////////////////////////////////////////////////////

function init () {
	Convenience.initTranslations();
}

let SETTINGS = Convenience.getSettings();

function buildPrefsWidget () {
	let widget = new QuicklistsPrefsWidget();
	widget.show_all();
	return widget;
}

////////////////////////////////////////////////////////////////////////////////

