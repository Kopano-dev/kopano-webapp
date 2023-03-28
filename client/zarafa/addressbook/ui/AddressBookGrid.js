Ext.namespace('Zarafa.addressbook.ui');

/**
 * @class Zarafa.addressbook.ui.AddressBookGrid
 * @extends Zarafa.common.ui.grid.GridPanel
 * @xtype zarafa.addressbookgrid
 *
 * Panel that shows the contents of the users/contacts in addressBook.
 */
Zarafa.addressbook.ui.AddressBookGrid = Ext.extend(Zarafa.common.ui.grid.GridPanel, {
	/**
	 * @cfg {Boolean} singleSelect true to allow selection of only one row at a time (defaults to false allowing multiple selections)
	 */
	singleSelect: false,

	/**
	 * @constructor
	 * @param {Object} config configuration object.
	 */
	constructor: function(config)
	{
		config = config || {};

		var viewConfig = config.viewConfig || {};
		Ext.applyIf(viewConfig, {
			// render rows as they come into viewable area.
			scrollDelay: false,
			rowHeight: 31,
			borderHeight: 1,
			// Overwriting the header template to add space for an inline info message
			headerTpl: new Ext.Template(
				'<table border="0" cellspacing="0" cellpadding="0" style="{tstyle}">',
					'<thead>',
						'<tr class="x-grid3-hd-row">{cells}</tr>',
					'</thead>',
				'</table>',
				'<div class="k-grid-info"></div>'
			)
		});

		Ext.applyIf(config, {
			autoExpandColumn: 'full_name',
			autoExpandMin: 100,
			loadMask: true,
			stateful: true,
			statefulRelativeDimensions: false,
			sm: this.createSelectionModel(config),
			cm: new Zarafa.addressbook.ui.GABColumnModel(),
			view: new Ext.ux.grid.BufferView(viewConfig)
		});

		Zarafa.addressbook.ui.AddressBookGrid.superclass.constructor.call(this, config);

		this.mon(this.getStore(), 'beforeload', this.onStoreBeforeLoad, this);
		this.mon(this.getStore(), 'load', this.onStoreLoad, this);

		this.mon(this, 'beforerender', function(){
			// Register the store to the PresenceManager to have it fetch the presence
			// status for all entries.
			Zarafa.core.PresenceManager.registerStore(this.getStore());
		}, this);
		this.mon(this, 'beforedestroy', function(){
			Zarafa.core.PresenceManager.unregisterStore(this.getStore());
		}, this);
	},

	/**
	 * Event handler for the render event of the grid panel. Will calculate the correct border
	 * size and update the value in the view. This is necessary because Chrome sometimes
	 * renders with incorrect width, i.e. we style it with 1px and chrome renders 0.667px The
	 * bufferedView however needs the correct size to calculate which record to render.
	 */
	onRender: function()
	{
		Zarafa.addressbook.ui.AddressBookGrid.superclass.onRender.apply(this, arguments);

		var headerEl = this.view.el.down('div').down('div');
		var borderHeight = window.getComputedStyle(headerEl.dom)['border-bottom-width'];
		this.view.borderHeight = parseFloat(borderHeight);
	},

	/**
	 * Event handler which is called before the {@link #store} will request a load.
	 * Will hide the inline grid error.
	 * @param {Ext.data.Store} store The store which was loaded
	 * @param {Object} options The options which were used to load the data
	 * @private
	 */
	onStoreBeforeLoad: function(store, options)
	{
		var errorEl = this.view.innerHd.querySelector('.k-grid-info');
		Ext.fly(errorEl).removeClass('k-show');
		this.view.refresh();
	},

	/**
	 * Event handler which is called when the {@link #store} has been loaded. This will
	 * check what kind of folder has been loaded, and either loads the {@link Zarafa.addressbook.ui.GABColumnModel}
	 * or {@link Zarafa.addressbook.ui.GABPersonalColumnModel} column model.
	 * Will also check if there is an error (currently only the listexceederror is implemented)
	 * while loading and will show an error 'inline' in the grid.
	 * @param {Ext.data.Store} store The store which was loaded
	 * @param {Ext.data.Record[]} records The records which were loaded from the store
	 * @param {Object} options The options which were used to load the data
	 * @private
	 */
	onStoreLoad: function(store, records, options)
	{
		var columnModel;
		if (options && options.params && options.params.folderType === 'gab') {
			columnModel = new Zarafa.addressbook.ui.GABColumnModel();
		} else {
			columnModel = new Zarafa.addressbook.ui.GABPersonalColumnModel();
		}

		// reconfigure grid with new column model
		if(this.colModel.name !== columnModel.name) {
			this.reconfigure(store, columnModel);
		}

		if ( store.error && store.error.code && store.error.code === 'listexceederror' ) {
			var errorEl = this.view.innerHd.querySelector('.k-grid-info');
			errorEl.innerHTML = String.format(_('Showing only the first {0} names. Use search to find more specific results.'), store.error.max_gab_users);
			Ext.fly(errorEl).addClass('k-show');
			this.view.refresh();
		}
	},

	/**
	 * creates and returns a selection model object, used in {@link Ext.grid.GridPanel.selModel selModel} config
	 * @param {Object} config config options for {@link Ext.grid.GridPanel.selModel selModel}
	 * @return {Zarafa.common.ui.grid.RowSelectionModel} selection model object
	 * @private
	 */
	createSelectionModel: function(config)
	{
		return new Zarafa.common.ui.grid.RowSelectionModel({
			singleSelect: config.singleSelect
		});
	},

	/**
	 * Returns the currently selected {@link Ext.data.Record records}
	 * from the {@link Ext.grid.GridPanel GridPanel}
	 * @return {Ext.data.Record[]} The selected records
	 */
	getSelectedItems: function()
	{
		return this.getSelectionModel().getSelections();
	},

	/**
	 * Obtain the path in which the {@link #getState state} must be saved.
	 * This option is only used when the {@link Zarafa.core.data.SettingsStateProvider SettingsStateProvider} is
	 * used in the {@link Ext.state.Manager}. This returns {@link #statefulName} if provided, or else generates
	 * a custom name.
	 * We are managing two different state settings for addressbook, one for addressbook containers and another for
	 * contact containers.
	 * @return {String} The unique name for this component by which the {@link #getState state} must be saved.
	 */
	getStateName: function()
	{
		var options = this.store.lastOptions;
		var name = 'globaladdressbook';

		if (options && options.params && options.params.entryid) {
			var entryid = options.params.entryid;

			// check for contacts container, all other containers would be assumed as global addressbook
			if(Zarafa.core.EntryId.hasContactProviderGUID(entryid)) {
				name = 'contacts';
			}
		}

		return 'gab/' + name + '/list';
	},

	/**
	 * When {@link #stateful} the State object which should be saved into the
	 * {@link Ext.state.Manager}.
	 * @return {Object} The state object
	 * @protected
	 */
	getState: function()
	{
		var state = Zarafa.addressbook.ui.AddressBookGrid.superclass.getState.call(this);

		// Superclass wrapped it, but we need to unwrap it again
		// because we store the settings slightly differently.
		var unwrap = { sort: state.sort };
		delete state.sort;
		Ext.apply(unwrap, state[this.getColumnModel().name]);

		return unwrap;
	},

	/**
	 * Apply the given state to this object activating the properties which were previously
	 * saved in {@link Ext.state.Manager}.
	 * @param {Object} state The state object
	 * @protected
	 */
	applyState: function(state)
	{
		if (state) {
			var wrap = { sort: state.sort };
			delete state.sort;
			wrap[this.getColumnModel().name] = state;

			Zarafa.addressbook.ui.AddressBookGrid.superclass.applyState.call(this, wrap);
		}
 	}
});

Ext.reg('zarafa.addressbookgrid', Zarafa.addressbook.ui.AddressBookGrid);
