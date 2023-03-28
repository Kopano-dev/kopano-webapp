Ext.namespace('Zarafa.mail');

/**
 * @class Zarafa.mail.MailContext
 * @extends Zarafa.core.Context
 */
Zarafa.mail.MailContext = Ext.extend(Zarafa.core.Context, {
	// Insertion points for this class
	/**
	 * @insert main.maintoolbar.view.mail
	 * Insertion point for populating the main toolbar with a View button. This item is only visible
	 * when this context is active.
	 * @param {Zarafa.mail.MailContext} context This context
	 */

	/**
	 * When searching, this property marks the {@link Zarafa.core.Context#getCurrentView view}
	 * which was used before {@link #onSearchStart searching started} the view was switched to
	 * {@link Zarafa.mail.data.Views#SEARCH}.
	 * @property
	 * @type Mixed
	 * @private
	 */
	oldView: undefined,

	/**
	 * When searching, this property marks the {@link Zarafa.core.Context#getCurrentViewMode viewmode}
	 * which was used before {@link #onSearchStart searching started} the viewmode was switched to
	 * {@link Zarafa.mail.data.ViewModes#SEARCH}.
	 * @property
	 * @type Mixed
	 * @private
	 */
	oldViewMode: undefined,

	/**
	 * @constructor
	 * @param {Object} config Configuration object
	 */
	constructor: function(config)
	{
		config = config || {};

		Ext.applyIf(config, {
			current_view: Zarafa.mail.data.Views.LIST,
			current_view_mode: Zarafa.mail.data.ViewModes.RIGHT_PREVIEW
		});

		Zarafa.mail.MailContext.superclass.constructor.call(this, config);

		// The "New email" button which is available in all contexts
		this.registerInsertionPoint('main.maintoolbar.new.item', this.createNewMailButton, this);
		this.registerInsertionPoint('context.mainpaneltoolbar.item', this.createFilterButton, this);

		// The tab in the top tabbar
		this.registerInsertionPoint('main.maintabbar.left', this.createMainTab, this);

		// Add a tree control showing a list of note folders to the navigation panel.
		// The control will be shown when the user selects the note context from the button panel.
		this.registerInsertionPoint('navigation.center', this.createMailNavigationPanel, this);

		// Register the Mail category for the settings
		this.registerInsertionPoint('context.settings.categories', this.createSettingCategories, this);

		// Register insertion point to insert toolbar buttons on the right side of menu.
		var toolbarButtons = new Zarafa.common.ui.PreviewPanelToolbarButtons({model: this.getModel()});
		this.registerInsertionPoint('previewpanel.toolbar.right', toolbarButtons.getToolbarButtons, toolbarButtons);

		// Extend the Contact and AddressBook context with email buttons
		this.registerInsertionPoint('context.addressbook.contextmenu.actions', this.createSendEmailContextItem, this);
		this.registerInsertionPoint('context.contact.contextmenu.actions', this.createSendEmailContextItem, this);
		this.registerInsertionPoint('context.contact.contactcontentpanel.toolbar.actions', this.createSendEmailButton, this);
		this.registerInsertionPoint('context.contact.distlistcontentpanel.toolbar.actions', this.createSendEmailButton, this);

		// Register mail specific dialog types
		Zarafa.core.data.SharedComponentType.addProperty('mail.dialog.options');
    Zarafa.core.data.SharedComponentType.addProperty('mail.dialog.delayeddelivery');
	},

	/**
	 * @return {Zarafa.mail.MailContextModel} the mail context model
	 */
	getModel: function()
	{
		if (!Ext.isDefined(this.model)) {
			this.model = new Zarafa.mail.MailContextModel();
			this.model.on({
				'searchstart': this.onModelSearchStart,
				'searchstop': this.onModelSearchStop,
				'livescrollstart': this.onModelLiveScrollStart,
				'livescrollstop': this.onModelLiveScrollStop,
				scope: this
			});
		}
		return this.model;
	},

	/**
	 * Event handler for the {@link #model}#{@link Zarafa.core.ContextModel#livescrollstart live scroll start} event.
	 * This will {@link #switchView switch the view} to {@link Zarafa.mail.data.Views#LIVESCROLL live scroll mode}.
	 * The previously active {@link #getCurrentView view} will be stored in the {@link #oldView} and will
	 * be recovered when the {@link #onModelLiveScrollStop live scroll is stopped}.
	 * @param {Zarafa.core.ContextModel} model The model which fired the event
	 * @private
	 */
	onModelLiveScrollStart: function(model)
	{
		if(this.getCurrentView() !== Zarafa.mail.data.Views.LIVESCROLL && this.getCurrentViewMode() !== Zarafa.mail.data.ViewModes.LIVESCROLL){
			/*
			 * Check that current view model is NO_PREVIEW, RIGHT_PREVIEW,
			 * or BOTTOM_PREVIEW then set the view mode to oldViewMode and view to oldView.
			 */
			if(Zarafa.mail.data.ViewModes.isMainViewMode(this.getCurrentViewMode())) {
				this.oldView = this.getCurrentView();
				this.oldViewMode = this.getCurrentViewMode();
			}
			this.switchView(Zarafa.mail.data.Views.LIVESCROLL, Zarafa.mail.data.ViewModes.LIVESCROLL);
		}
	},

	/**
	 * Event handler for the {@link #model}#{@link Zarafa.core.ContextModel#livescrollstop live scroll stop} event.
	 * This will {@link #switchView switch the view} to the {@link #oldView previous view}.
	 * @param {Zarafa.core.ContextModel} model The model which fired the event
	 * @private
	 */
	onModelLiveScrollStop: function(model)
	{
		/*
		 * Check requires to prevent loading old view again when user
		 * - Loads all mails in grid using live scroll
		 * - Switch the view
		 * - Click on refresh button
		 * To overcome the above mentioned problem,
		 * we have to check that currently selected mode is one of the main view mode
		 * (NO_PREVIEW, RIGHT_PREVIEW and BOTTOM_PREVIEW) then switch the view with it
		 * else switch with old view and view mode.
		 */
		if(Zarafa.mail.data.ViewModes.isMainViewMode(this.getCurrentViewMode())) {
			this.switchView(this.getCurrentView(), this.getCurrentViewMode());
		} else {
			this.switchView(this.oldView, this.oldViewMode);
		}
		delete this.oldView;
		delete this.oldViewMode;
	},

	/**
	 * Event handler for the {@link #model}#{@link Zarafa.core.ContextModel#searchstart searchstart} event.
	 * This will {@link #switchView switch the view} to {@link Zarafa.mail.data.Views#SEARCH search mode}.
	 * The previously active {@link #getCurrentView view} will be stored in the {@link #oldView} and will
	 * be recovered when the {@link #onModelSearchStop search is stopped}.
	 * @param {Zarafa.core.ContextModel} model The model which fired the event
	 * @private
	 */
	onModelSearchStart: function(model)
	{
		if(this.getCurrentView() !== Zarafa.mail.data.Views.SEARCH && this.getCurrentViewMode() !== Zarafa.mail.data.ViewModes.SEARCH){
			/*
			 * Check that current view model is one of the view mode from
			 * NO_PREVIEW, RIGHT_PREVIEW and BOTTOM_PREVIEW then set the view mode to
			 * oldViewMode and view to oldView.
			 */
			if(Zarafa.mail.data.ViewModes.isMainViewMode(this.getCurrentViewMode())) {
				this.oldView = this.getCurrentView();
				this.oldViewMode = this.getCurrentViewMode();
			}
			this.switchView(Zarafa.mail.data.Views.SEARCH, Zarafa.mail.data.ViewModes.SEARCH);
		}
	},

	/**
	 * Event handler for the {@link #model}#{@link Zarafa.core.ContextModel#searchstop searchstop} event.
	 * This will {@link #switchView switch the view} to the {@link #oldView previous view}.
	 * @param {Zarafa.core.ContextModel} model The model which fired the event
	 * @private
	 */
	onModelSearchStop: function(model)
	{
		this.switchView(this.oldView, this.oldViewMode);
		delete this.oldView;
		delete this.oldViewMode;
	},

	/**
	 * Bid for the given {@link Zarafa.hierarchy.data.MAPIFolderRecord folder}
	 * This will bid on any folder of container class 'IPF.Note'.
	 *
	 * @param {Zarafa.hierarchy.data.MAPIFolderRecord} folder The folder for which the context is bidding
	 * @return {Number} 1 when the contexts supports the folder, -1 otherwise
	 */
	bid: function(folder)
	{
		// The folder contains items of type IPF.Note
		if (folder.isContainerClass('IPF.Note', true)) {
			return 1;
		} else if (folder.isContainerClass('IPF', true)) {
			// Fallback for unknown folders...
			return 0;
		}

		// return -1, don't know this content type
		return -1;
	},

	/**
	 * Bid for the type of shared component and the given record.
	 * This will bid on a common.create or common.view for a
	 * record with a message class set to IPM or IPM.Note.
	 * @param {Zarafa.core.data.SharedComponentType} type Type of component a context can bid for.
	 * @param {Ext.data.Record} record Optionally passed record.
	 * @return {Number} The bid for the shared component
	 */
	bidSharedComponent: function(type, record)
	{
		var bid = -1;

		if (Array.isArray(record)) {
			record = record[0];
		}

		switch (type) {
			case Zarafa.core.data.SharedComponentType['common.create']:
			case Zarafa.core.data.SharedComponentType['common.view']:
			case Zarafa.core.data.SharedComponentType['common.preview']:
				if (record instanceof Zarafa.core.data.IPMRecord) {
					if (record.get('object_type') === Zarafa.core.mapi.ObjectType.MAPI_MESSAGE) {
						if (record.isMessageClass([ 'IPM.Note', 'IPM.Schedule.Meeting', 'REPORT.IPM','REPORT.IPM.Note' ], true)) {
							bid = 1;
						} else {
							bid = 0;
						}
					}
				}
				break;
			// Bid for mail specific dialog
			case Zarafa.core.data.SharedComponentType['mail.dialog.options']:
      case Zarafa.core.data.SharedComponentType['mail.dialog.delayeddelivery']:
				bid = 1;
				break;
			case Zarafa.core.data.SharedComponentType['common.contextmenu']:
				if (record instanceof Zarafa.core.data.IPMRecord) {
					if (record.get('object_type') === Zarafa.core.mapi.ObjectType.MAPI_MESSAGE) {
						if (record.isMessageClass([ 'IPM.Note', 'IPM.TaskRequest', 'IPM.Schedule.Meeting', 'REPORT.IPM','REPORT.IPM.Note' ], true)) {
							bid = 1;
						} else {
							bid = 0;
						}
					}
				}
				break;
			case Zarafa.core.data.SharedComponentType['common.printer.renderer']:
				if (record instanceof Zarafa.core.data.IPMRecord) {
					if (record.get('object_type') === Zarafa.core.mapi.ObjectType.MAPI_MESSAGE) {
						// @todo test if report mails print well in default mail renderer
						if (record.isMessageClass([ 'IPM.Note', 'REPORT.IPM','REPORT.IPM.Note' ], true)) {
							bid = 1;
						}
					}
				}
				break;
			case Zarafa.core.data.SharedComponentType['common.attachment.dialog.attachitem.columnmodel']:
				if (record instanceof Zarafa.hierarchy.data.MAPIFolderRecord) {
					if (record.isContainerClass('IPF.Note', true)) {
						bid = 1;
					} else if (record.isContainerClass('IPF', true)) {
						// Lowest bid, so if any context has not bidded for any component then by default this context will bid
						bid = 0;
					}
				}
				break;
			case Zarafa.core.data.SharedComponentType['common.attachment.dialog.attachitem.textrenderer']:
				if (record instanceof Zarafa.core.data.IPMRecord) {
					if (record.isMessageClass([ 'IPM.Note', 'REPORT.IPM', 'REPORT.IPM.Note' ], true)) {
						bid = 1;
					} else if (record.isMessageClass('IPM', true)) {
						// Lowest bid, so if any context has not bidded for any component then by default this context will bid
						bid = 0;
					}
				}
				break;
		}
		return bid;
	},

	/**
	 * Will return the reference to the shared component.
	 * Based on the type of component requested a component is returned.
	 * @param {Zarafa.core.data.SharedComponentType} type Type of component a context can bid for.
	 * @param {Ext.data.Record} record Optionally passed record.
	 * @return {Ext.Component} Component
	 */
	getSharedComponent: function(type, record)
	{
		var component;
		switch (type) {
			case Zarafa.core.data.SharedComponentType['common.create']:
				component = Zarafa.mail.dialogs.MailCreateContentPanel;
				break;
			case Zarafa.core.data.SharedComponentType['common.view']:
				component = Zarafa.mail.dialogs.ShowMailContentPanel;
				break;
			case Zarafa.core.data.SharedComponentType['mail.dialog.options']:
				if (!record || record.phantom || record.isUnsent()) {
					component = Zarafa.mail.dialogs.MailCreateOptionsContentPanel;
				} else {
					component = Zarafa.mail.dialogs.MailViewOptionsContentPanel;
				}
				break;
			case Zarafa.core.data.SharedComponentType['common.preview']:
				component = Zarafa.mail.ui.MailViewPanel;
				break;
			case Zarafa.core.data.SharedComponentType['common.contextmenu']:
				component = Zarafa.mail.ui.MailGridContextMenu;
				break;
			case Zarafa.core.data.SharedComponentType['common.printer.renderer']:
				if (record instanceof Zarafa.core.data.IPMRecord) {
					component = Zarafa.mail.printer.MailRenderer;
				}
				break;
			case Zarafa.core.data.SharedComponentType['common.attachment.dialog.attachitem.columnmodel']:
				component = Zarafa.mail.attachitem.AttachMailColumnModel;
				break;
			case Zarafa.core.data.SharedComponentType['common.attachment.dialog.attachitem.textrenderer']:
				component = Zarafa.mail.attachitem.AttachMailRenderer;
				break;
      case Zarafa.core.data.SharedComponentType['mail.dialog.delayeddelivery']:
        component = Zarafa.mail.dialogs.DelayedDeliveryContentPanel;
		}
		return component;
	},

	/**
	 * Obtain the {@link Zarafa.mail.ui.MailPanel Mailpanel} object
	 *
	 * @return {Zarafa.mail.ui.MailPanel} The main panel which should
	 * be used within the {@link Zarafa.core.Context context}
	 */
	createContentPanel: function()
	{
		return {
			xtype: 'zarafa.mailpanel',
			id: 'zarafa-mainpanel-contentpanel-mail',
			context: this
		};
	},

	/**
	 * Creates the mail tree that is shown when the user selects the mail context from the
	 * button panel. It shows a tree of available mail folders
	 * @private
	 */
	createMailNavigationPanel: function()
	{
		return {
			xtype: 'zarafa.contextnavigation',
			context: this,
			items: [{
				xtype: 'panel',
				id: 'zarafa-navigationpanel-mail-navigation',
				cls: 'zarafa-context-navigation-block',
				ref: 'mailnavigation',
				layout: 'fit',
				items: [{
					xtype: 'zarafa.hierarchytreepanel',
					id: 'zarafa-navigationpanel-mail-navigation-tree',
					model: this.getModel(),
					IPMFilter: 'IPF.Note',
					hideDeletedFolders: false,
					enableDD: true,
					enableItemDrop: true,
					deferredLoading: true,
					bbarConfig: {
						defaultSelectedSharedFolderType: Zarafa.hierarchy.data.SharedFolderTypes['MAIL'],
						buttonText: _('Open Shared Mails')
					}
				}]
			}]
		};
	},

	/**
	 * Create "New Email" {@link Ext.menu.MenuItem item} for the "New item"
	 * {@link Ext.menu.Menu menu} in the {@link Zarafa.core.ui.MainToolbar MainToolbar}.
	 * This button should be shown in all {@link Zarafa.core.Context contexts} and
	 * is used to create a new Email.
	 *
	 * @return {Object} The menu item for creating a new Email item
	 */
	createNewMailButton: function()
	{
		return {
			xtype: 'menuitem',
			id: 'zarafa-maintoolbar-newitem-mail',
			tooltip: _('Email')+ ' (Ctrl + Alt + X)',
			plugins: 'zarafa.menuitemtooltipplugin',
			text: _('Email'),
			iconCls: 'icon_new_email',
			newMenuIndex: 1,
			context: 'mail',
			handler: function()
			{
				Zarafa.mail.Actions.openCreateMailContent(this.getModel());
			},
			scope: this
		};
	},

	/**
	 * Handler for the insertion points for extending the Contacts and AddressBook context menus
	 * with buttons to send a mail to the given Contact and Address Book.
	 * @private
	 */
	createSendEmailContextItem: function()
	{
		return {
			text: _('Send email'),
			iconCls: 'icon_new_email',
			scope: this,
			handler: function(item) {
				Zarafa.mail.Actions.openCreateMailContentForContacts(
					this.getModel(),
					item.parentMenu.records, {
					ABDialog: item.parentMenu.dialog
				});
			},
			beforeShow: function(item, records) {
				var visible = false;
				var hasMixRecord = false;
				for (var i = 0, len = records.length; i < len; i++) {
					var record = records[i];
					if (hasMixRecord == false && !record.isMessageClass(['IPM.Contact', 'IPM.DistList'])) {
						hasMixRecord = true;
					}
					if (visible == false && this.isSendEmailButtonVisible(record)) {
						visible = true;
					}
				}
				item.setVisible(visible && !hasMixRecord);
			}
		};
	},

	/**
	 * Handler for the insertion points for extending the Contacts and Distribution Dialogs
	 * with buttons to send a mail to the given Contact or Distribution list.
	 * @private
	 */
	createSendEmailButton: function()
	{
		return {
			xtype: 'button',
			plugins: [ 'zarafa.recordcomponentupdaterplugin' ],
			iconCls: 'icon_new_email',
			overflowText: _('Send email'),
			tooltip: _('Send email'),
			handler: function(btn) {
				Zarafa.mail.Actions.openCreateMailContentForContacts(this.getModel(), btn.record);
			},
			scope: this,
			update: function(record, resetContent) {
				this.record = record;
				if (resetContent) {
					// Smal workaround, update is called from the btn scope,
					// but the handler from the Context scope. So access
					// isSendEmailButtonVisible from the scope.
					if (!this.scope.isSendEmailButtonVisible(record)) {
						this.hide();
					}
				}
			}
		};
	},

	/**
	 * Check if the given record (which represents a Contact or Distribution list
	 * can be mailed (this requires the record not to be a {@link Ext.data.Record#phantom}
	 * and the Contact should {@link Zarafa.contact.ContactRecord#hasEmailAddress have an email address}.
	 * @param {Zarafa.core.data.MAPIRecord} record The record to check
	 * @return {Boolean} True if we can send an email to this contact/distlist
	 * @private
	 */
	isSendEmailButtonVisible: function(record)
	{
		if (record.phantom) {
			return false;
		} else if (record.isMessageClass('IPM.Contact')) {
			if (!record.hasEmailAddress()) {
				return false;
			}
		}

		return true;
	},

	/**
	 * Create the mail {@link Zarafa.settings.ui.SettingsCategory Settings Category}
	 * to the {@link Zarafa.settings.SettingsContext}. This will create new
	 * {@link Zarafa.settings.ui.SettingsCategoryTab tabs} for the
	 * {@link Zarafa.mail.ui.SettingsMailCategory Mail} and the
	 * {@link Zarafa.mail.ui.SettingsOutOfOfficeCategory Out of Office}
	 * in the {@link Zarafa.settings.ui.SettingsCategoryWidgetPanel Widget Panel}.
	 * @param {String} insertionName insertion point name that is currently populated
	 * @param {Zarafa.settings.ui.SettingsMainPanel} settingsMainPanel settings main panel
	 * which is populating this insertion point
	 * @param {Zarafa.settings.SettingsContext} settingsContext settings context
	 * @return {Array} configuration object for the categories to register
	 * @private
	 */
	createSettingCategories: function(insertionName, settingsMainPanel, settingsContext)
	{
		return [{
			xtype: 'zarafa.settingsmailcategory',
			settingsContext: settingsContext
		},{
			xtype: 'zarafa.settingsoutofofficecategory',
			settingsContext: settingsContext
		},{
			xtype: 'zarafa.settingssafesendercategory',
			settingsContext: settingsContext
		}];
	},

	/**
	 * Returns the buttons for the dropdown list of the VIEW-button in the main toolbar. It will use the
	 * main.maintoolbar.view.mail insertion point to allow other plugins to add their items at the end.
	 *
	 * @return {Ext.Component[]} an array of components
	 */
	getMainToolbarViewButtons: function()
	{
		var items = container.populateInsertionPoint('main.maintoolbar.view.mail', this) || [];

		var defaultItems = [{
			id: 'zarafa-maintoolbar-view-mail-nopreview',
			overflowText: _('No preview'),
			iconCls: 'icon_previewpanel_off',
			text: _('No preview'),
			valueView: Zarafa.mail.data.Views.LIST,
			valueViewMode: Zarafa.mail.data.ViewModes.NO_PREVIEW,
			handler: this.onContextSelectView,
			scope: this
		},{
			id: 'zarafa-maintoolbar-view-mail-previewright',
			overflowText: _('Right preview'),
			iconCls: 'icon_previewpanel_right',
			text: _('Right preview'),
			valueView: Zarafa.mail.data.Views.LIST,
			valueViewMode: Zarafa.mail.data.ViewModes.RIGHT_PREVIEW,
			handler: this.onContextSelectView,
			scope: this
		},{
			id: 'zarafa-maintoolbar-view-mail-previewbottom',
			overflowText: _('Bottom preview'),
			iconCls: 'icon_previewpanel_bottom',
			text: _('Bottom preview'),
			valueView: Zarafa.mail.data.Views.LIST,
			valueViewMode: Zarafa.mail.data.ViewModes.BOTTOM_PREVIEW,
			handler: this.onContextSelectView,
			scope: this
		}];

		return defaultItems.concat(items);
	},

	/**
	 * Event handler which is fired when one of the View buttons
	 * has been pressed. This will call {@link #setView setView}
	 * to update the view.
	 * @param {Ext.Button} button The button which was pressed
	 * @private
	 */
	onContextSelectView: function(button)
	{
		var model = this.getModel();
		this.getModel().setDataMode(model.getCurrentDataMode());
		this.switchView(button.valueView, button.valueViewMode);
	},

	/**
	 * Returns the buttons for the dropdown list of the Print button in the main toolbar. It will use the
	 * main.maintoolbar.print.mail insertion point to allow other plugins to add their items at the end.
	 *
	 * @return {Ext.Component[]} an array of components
	 */
	getMainToolbarPrintButtons: function()
	{
		var items = container.populateInsertionPoint('main.toolbar.print.mail', this) || [];

		var defaultItems = [{
			xtype: 'zarafa.conditionalitem',
			id: 'zarafa-maintoolbar-print-singlemail',
			overflowText: _('Print single email'),
			iconCls: 'icon_print',
			tooltip: _('Print selected email') + ' (Ctrl + P)',
			plugins: 'zarafa.menuitemtooltipplugin',
			text: _('Print single email'),
			hideOnDisabled: false,
			singleSelectOnly: true,
			handler: this.onPrintSelected.createDelegate(this, [_('No message selected')], 2),
			scope: this
		}];

		return defaultItems.concat(items);
	},

	/**
	 * Event handler which is fired when the 'print list' item in the dropdown has been pressed
	 * This calls {@link Zarafa.common.Actions.openPrintDialog} with the current context.
	 * @private
	 */
	onPrintList: function()
	{
		Zarafa.common.Actions.openPrintDialog(this);
	},

	/**
	 * Adds a button to the top tab bar for this context.
	 * @return {Object} The button for the top tabbar
	 * @private
	 */
	createMainTab: function()
	{
		return {
			text: this.getDisplayName(),
			tabOrderIndex: 2,
			context: this.getName(),
			id: 'mainmenu-button-mail'
		};
	},

	/**
	 * Create filter button in {@link Zarafa.common.ui.ContextMainPanelToolbar ContextMainPanelToolbar}
	 *
	 * @param {String} insertionPoint The insertionPoint text.
	 * @param {Zarafa.core.Context} currentContext The current context in which this
	 * insertion point triggered.
	 * @return {Object} configuration object to create filter button.
	 */
	createFilterButton: function(insertionPoint, currentContext)
	{
		var hidden = true;
		if (Ext.isDefined(currentContext)) {
			hidden = currentContext.getName() !== 'mail';
		}
		var isCurrDataModeUnread = this.model.getCurrentDataMode() === Zarafa.mail.data.DataModes.UNREAD;
		return {
			xtype: 'splitbutton',
			cls: 'k-filter-options-btn',
			text: '<span>' + _('Filter') + '</span>',
			overflowText: _('Filter'),
			iconCls: 'icon_filter',
			ref: 'filterBtn',
			hidden: hidden,
			nonEmptySelectOnly: true,
			model: this.model,
			menu: {
				items: [{
					xtype: 'menucheckitem',
					text: _('Unread'),
					model: this.model,
					cls: 'k-unread-filter-btn',
					ref: '../unreadBtn',
					iconCls: isCurrDataModeUnread ? 'x-menu-item-icon' : 'k-hide-img',
					valueDataMode: Zarafa.mail.data.DataModes.UNREAD,
					checked: isCurrDataModeUnread,
					checkHandler: this.onUnreadToggle,
					scope: this
				}]
			},
			handler: function() {
				if(this.isXType("splitbutton")) {
					this.showMenu();
				}
			},
			listeners: {
				afterrender: function(button) {
					// Add selection class on main filter button
					// and avoid this when filter button is included in more menu.
					if (Ext.isDefined(button.unreadBtn) && isCurrDataModeUnread) {
						button.btnEl.addClass('k-selection');
						button.pressed = true;
						this.model.getStore().hasFilterApplied = true;
					}
				}
			}
		};
	},

	/**
	 * Handler called when check 'Unread' button has been clicked.
	 *
	 * @param {Ext.menu.CheckItem} menuItem The menu item which is clicked.
	 * @param {Boolean} checked The checked is true if {@link Ext.menu.CheckItem CheckItem} was clicked.
	 */
	onUnreadToggle: function(menuItem, checked)
	{
		var mainPanelToolbar = container.getContentPanel().getTopToolbar();
		var filterBtn = mainPanelToolbar.filterBtn;
		var imgTag = menuItem.el.child('img');
		var model = menuItem.model;
		var store = model.getStore();
		if(checked) {
			imgTag.addClass('x-menu-item-icon');
			imgTag.removeClass('k-hide-img');
			filterBtn.btnEl.addClass('k-selection');
			store.hasFilterApplied = true;
			model.setDataMode(menuItem.valueDataMode);
		} else {
			imgTag.removeClass('x-menu-item-icon');
			filterBtn.btnEl.removeClass('k-selection');
			store.stopFilter();
			model.setDataMode(Zarafa.mail.data.DataModes.ALL);
		}
	}
});

Zarafa.onReady(function() {
	container.registerContext(new Zarafa.core.ContextMetaData({
		name: 'mail',
		displayName: _('Mail'),
		allowUserVisible: false,
		pluginConstructor: Zarafa.mail.MailContext
	}));
});
