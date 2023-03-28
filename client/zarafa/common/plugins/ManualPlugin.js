Ext.namespace('Zarafa.common.plugins');

/**
 * @class Zarafa.common.plugins.ManualPlugin
 * @extends Zarafa.core.Plugin
 *
 * The Manual Plugin, which inserts a 'Help' button in the Top Toolbar,
 * from where the user can open the Manual in a new page.
 */
Zarafa.common.plugins.ManualPlugin = Ext.extend(Zarafa.core.Plugin, {

	/**
	 * List of Contexts name for which a shortcut exists inside the manual.
	 * @property
	 * @type Array
	 */
	manualShortcuts: {
		'mail': 'mail.html',
		'calendar': 'calendar.html',
		'contact': 'contacts.html',
		'task': 'tasks.html',
		'note': 'notes.html',
		'settings': 'settings.html'
	},

	/**
	 * Called after constructor.
	 * Registers insertion points in Top Toolbar
	 * @protected
	 */
	initPlugin: function()
	{
		Zarafa.common.plugins.ManualPlugin.superclass.initPlugin.apply(this, arguments);

		// First of all check if webapp manual plugin setting available else check main settings.
		if (container.getSettingsModel().getOneOf('zarafa/v1/plugins/webappmanual/enable', 'zarafa/v1/main/help_manual/show') === true) {
			this.registerInsertionPoint('main.maintabbar.right', this.createManualMainTab, this);
		}
	},

	/**
	 * Adds a button to the top tab bar for the manual
	 * @return {Object} The button for the top tabbar
	 * @private
	 */
	createManualMainTab: function()
	{
		return {
			text: _('Help'),
			tabOrderIndex: 0,
			handler: this.onHelpButton,
			scope: this
		};
	},

	/**
	 * Event handler which is called when the button in the Top toolbar is pressed.
	 * This will check what the {@link Zarafa.core.Container#getCurrentContext current context}
	 * is, and if a {@link #manualShortcuts shortcut} exists for that context.
	 * It will then open a new Browser window with the correct page of the manual.
	 * @private
	 */
	onHelpButton: function()
	{
		var context = container.getCurrentContext();
		var shortcut = this.manualShortcuts[context.getName()];
		var url = container.getServerConfig().getWebappManualUrl();

		if (!Ext.isEmpty(shortcut)) {
			url += '/' + shortcut;
		}

		window.open(url, 'webapp_manual');
	}
});

Zarafa.onReady(function() {
	container.registerPlugin(new Zarafa.core.PluginMetaData({
		name: 'webappmanual',
		displayName: _('WebApp Manual'),
		allowUserDisable: false,
		allowUserVisible: false,
		pluginConstructor: Zarafa.common.plugins.ManualPlugin
	}));
});
