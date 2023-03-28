Ext.namespace('Zarafa.mail.dialogs');

/**
 * @class Zarafa.mail.dialogs.MailCreateToolbar
 * @extends Zarafa.core.ui.ContentPanelToolbar
 * @xtype zarafa.mailcreatetoolbar
 */
Zarafa.mail.dialogs.MailCreateToolbar = Ext.extend(Zarafa.core.ui.ContentPanelToolbar, {
	// Insertion points for this class
	/**
	 * @insert context.mail.mailcreatecontentpanel.toolbar.actions
	 * Insertion point for the Actions buttons in the Create Mail Toolbar
	 * @param {Zarafa.mail.dialogs.MailCreateToolbar} toolbar This toolbar
	 */
	/**
	 * @insert context.mail.mailcreatecontentpanel.toolbar.options
	 * Insertion point for the Options buttons in the Create Mail Toolbar
	 * @param {Zarafa.mail.dialogs.MailCreateToolbar} toolbar This toolbar
	 */
	/**
	 * @insert context.mail.showmailcontentpanel.toolbar.options.right
	 * Insertion point for the Options Right buttons which will show at right last in Mail Toolbar
	 * @param {Zarafa.mail.dialogs.ShowMailToolbar} toolbar This toolbar
	 */

	/**
	 * @constructor
	 * @param config Configuration structure
	 */
	constructor: function (config)
	{
		config = config || {};

		config.plugins = Ext.value(config.plugins, []);
		config.plugins.push('zarafa.recordcomponentupdaterplugin');

		Ext.applyIf(config, {
			xtype: 'zarafa.mailcreatetoolbar',
			insertionPointBase: 'context.mail.mailcreatecontentpanel',

			actionItems: this.createActionButtons(),
			optionItems: this.createOptionButtons(),
			rightAlignedItems: this.createRightAlignedOptionButtons()
		});

		Zarafa.mail.dialogs.MailCreateToolbar.superclass.constructor.call(this, config);
	},

	/**
	 * Called automatically when the {@link Zarafa.mail.dialogs.MailCreateContentPanel content panel}
	 * is being rendered. This will add a listener to to the {@link Zarafa.mail.dialogs.MailCreateContentPanel#bcctoggle} button.
	 * @private
	 */
	onRender: function ()
	{
		Zarafa.mail.dialogs.MailCreateToolbar.superclass.onRender.apply(this, arguments);

		if (this.dialog) {
			this.mon(this.dialog, 'bcctoggle', this.onContentPanelBccToggle, this);
			this.mon(this.dialog, 'fromtoggle', this.onContentPanelFromToggle, this);
		}

		var settingsModel = container.getSettingsModel();
		this.mon(settingsModel, 'set', this.onSettingsChange, this);
		this.mon(settingsModel, 'remove', this.onSettingsChange, this);

		// also call it for the first time
		this.onSettingsChange(settingsModel);
	},

	/**
	 * Create all buttons which should be added by default the the `Actions` buttons.
	 * These buttons are used to send, save and add attachments to the message. And it contains
	 * also buttons to check the recipient names or add a signature.
	 *
	 * @return {Array} The {@link Ext.Button Button} elements which should be added in the Actions section of the {@link Ext.Toolbar}.
	 * @private
	 */
	createActionButtons: function ()
	{
		return [{
			xtype: 'splitbutton',
			text: _('Send'),
			overflowText: _('Send'),
			ref: 'sendButton',
			tooltip: _('Send') + ' (Ctrl + Enter)',
			menu: {
				defaults: {
					plugins: 'zarafa.menuitemtooltipplugin'
				},
				items: [{
					text: _('Send'),
					iconCls: 'icon_send_black',
					handler: this.onSendButton,
					tooltip: _('Send') + ' (Ctrl + Enter)',
					scope: this
				}, {
					text: _('Send Later'),
					tooltip: _('Schedule your mail to be sent on a specific date and time'),
					iconCls: 'icon_send_later_black',
					handler: this.onSendLaterButton,
					scope: this
				}]
			},
			cls: 'zarafa-action',
			iconCls: 'icon_send_white',
			handler: this.onSendButton,
			scope: this
		}, {
			xtype: 'button',
			ref: 'saveBtn',
			overflowText: _('Save'),
			tooltip: _('Save') + ' (Ctrl + S)',
			iconCls: 'icon_floppy',
			handler: this.onSaveButton,
			scope: this
		},{
			xtype: 'button',
			ref: 'deleteBtn',
			overflowText: _('Delete'),
			tooltip: _('Delete'),
			iconCls: 'icon_delete',
			handler: this.onDeleteButton,
			scope: this
		},{
			xtype: 'zarafa.attachmentbutton',
			plugins: ['zarafa.recordcomponentupdaterplugin'],
			overflowText: _('Add attachment'),
			tooltip: _('Add attachments to this email'),
			iconCls: 'icon_paperclip',
			ref: 'attachmentButton',
			// Add a listener to the component added event to set use the correct update function when the toolbar overflows
			// (i.e. is too wide for the panel) and Ext moves the button to a menuitem.
			listeners: {
				added: this.onAttachmentButtonAdded,
				scope: this
			}
		},{
			xtype: 'tbseparator'
		},{
			xtype: 'button',
			overflowText: _('Check names'),
			tooltip: _('Check names'),
			iconCls: 'icon_checknames',
			handler: this.onCheckNamesButton,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Addressbook'),
			tooltip: _('Open addressbook'),
			iconCls: 'icon_small_addressbook',
			handler: function() {
					Zarafa.mail.Actions.openRecipientSelectionContent(this.record, {
						defaultRecipientType: Zarafa.core.mapi.RecipientType.MAPI_TO
					});
			},
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Add signature'),
			tooltip: _('Add signature'),
			iconCls: 'icon_signature',
			ref: 'signatureButton',
			scope: this
		}];
	},

	/**
	 * Event listener for the added event of the {@link Zarafa.common.attachment.ui.AttachmentButton attachmentButton}
	 * Adds the update function to the item when Ext converts the button to a menu item
	 * (which happens when the toolbar overflows, i.e. is too wide for the containing panel)
	 *
	 * @param {Ext.Component} item The item that was added. This can be a {@link Zarafa.common.attachment.ui.AttachmentButton}
	 * or a {@link Ext.menu.Item}
	 */
	onAttachmentButtonAdded: function(item)
	{
		if ( item.isXType('menuitem') ){
			// Set the update function to the update function of the original button
			// otherwise the Ext.Component.update function would be called by the recordcomponentupdaterplugin
			item.update = Zarafa.common.attachment.ui.AttachmentButton.prototype.update.createDelegate(this.attachmentButton);
		}
	},

	/**
	 * Create all buttons which should be added by default the the `Options` Buttons.
	 * This contains the buttons to set the message options like priority and read receipt.
	 *
	 * @return {Array} The {@link Ext.Button Button} elements which should be added in the Options section of the {@link Ext.Toolbar}.
	 * @private
	 */
	createOptionButtons: function ()
	{
		return [{
			xtype: 'button',
			overflowText: _('Options'),
			tooltip: _('Open options dialog'),
			iconCls: 'icon_cogwheel',
			handler: this.onMailOptionsButton,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Set flag'),
			tooltip: _('Set flag on this email'),
			iconCls: 'icon_flag_red',
			handler: this.onSetFlagButton,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('High priority'),
			tooltip: _('Mark this mail as high priority'),
			iconCls: 'icon_priority_high',
			ref: 'highPriority',
			toggleGroup: 'priorityGroup',
			importance: Zarafa.core.mapi.Importance.URGENT,
			enableToggle: true,
			toggleHandler: this.onPriorityGroupToggle,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Low priority'),
			tooltip: _('Mark this mail as low priority'),
			iconCls: 'icon_priority_low',
			ref: 'lowPriority',
			toggleGroup: 'priorityGroup',
			importance: Zarafa.core.mapi.Importance.NONURGENT,
			enableToggle: true,
			toggleHandler: this.onPriorityGroupToggle,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Set read receipt'),
			tooltip: _('Request read receipt from recipients'),
			iconCls: 'icon_read_receipt',
			enableToggle: true,
			ref: 'readReceiptField',
			toggleHandler: this.onReadReceiptToggle,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Show Bcc'),
			tooltip: _('Show Bcc field'),
			iconCls: 'icon_showbcc',
			ref: 'showBcc',
			enableToggle: true,
			toggleHandler: this.onBccMenuToggle,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Show From field'),
			tooltip: _('Show From field'),
			iconCls: 'icon_showfrom',
			ref: 'showFrom',
			enableToggle: true,
			toggleHandler: this.onFromMenuToggle,
			scope: this
		}];
	},

	/**
	 * Create buttons which needs to be rendered on the right side of the toolbar.
	 * This contains the popout button if main webapp window is active.
	 *
	 * @return {Array} The {@link Ext.Button} elements which should be added in the Right Options section of the {@link Ext.Toolbar}.
	 */
	createRightAlignedOptionButtons: function()
	{
		// Display the popout button if supported.
		if (Zarafa.supportsPopOut() && Zarafa.core.BrowserWindowMgr.isMainWindowActive()) {
			return [{
				xtype: 'zarafa.toolbarbutton',
				tooltip: _('Pop-out'),
				overflowText: _('Pop-out'),
				iconCls: 'icon_popout',
				ref: 'popOutBtn',
				handler: this.onPopoutButton,
				scope: this
			}];
		}
	},

	/**
	 * Function generates menu item for signature button.
	 * @param {Zarafa.settings.SettingsModel} settingsModel The settings which contains signature information
	 * @param {Object} changedSettings The object of changed settings
	 */
	onSettingsChange: function (settingsModel, changedSettings)
	{
		var changeSignatures = true;
		if (!Ext.isEmpty(changedSettings)) {
			changeSignatures = false;
			// Check whether signatures settings are changed or not.
			for (var i = 0; i < changedSettings.length; i++) {
				if (changedSettings[i].path && changedSettings[i].path.indexOf('zarafa/v1/contexts/mail/signatures/all') >= 0) {
					changeSignatures = true;
					break;
				}
			}
		}

		if (!changeSignatures) {
			return;
		}

		// generate menu for signature button
		var signatures = settingsModel.get('zarafa/v1/contexts/mail/signatures/all', true);

		var sigItems = [];
		for (var key in signatures) {
			sigItems.push({
				text: Ext.util.Format.htmlEncode(signatures[key].name),
				iconCls: 'icon_signature',
				signatureId: parseInt(key, 10)
			});
		}

		if (!Ext.isEmpty(sigItems)){
			sigItems.push({
				xtype: 'menuseparator'
			});
		}
		sigItems.push({
			text: _('Add signature'),
			iconCls: 'plus',
			handler: this.onClickAddSignatureHandler,
			signatureId: false
		});

		if (this.signatureButton.menu) {
			// Remove list of old signatures and add all the signatures again
			var signatureMenu = this.signatureButton.menu;
			signatureMenu.removeAll();
			signatureMenu.add(sigItems);
		} else {
			// Create menu for the first time.
			// instance creation of menu will be handled by MenuMgr
			this.signatureButton.menu = Ext.menu.MenuMgr.get({
				xtype: 'menu',
				listeners: {
					click: this.onSignatureSelect,
					scope: this
				},
				items: sigItems
			});
		}
	},

	/**
	 * Handler which triggered when 'Add signature' button clicked.
	 * This will call the {@link Zarafa.mail.Actions#redirectToSignatureWidget}.
	 */
	onClickAddSignatureHandler: function()
	{
		Zarafa.mail.Actions.redirectToSignatureWidget();
	},

	/**
	 * Function will be called whenever selection of signature in menu selected.
	 * @param {Ext.menu.Menu} Menu button manu
	 * @param {Ext.menu.CheckItem} CheckItem menu item that is selected
	 * @param {Ext.EventObject} EventObjectt event object
	 * @private
	 */
	onSignatureSelect: function (menu, menuItem, eventObj)
	{
		if (Ext.isNumber(menuItem.signatureId)) {
			// Place the signature in editor.
			this.dialog.mainPanel.setSignatureInEditor(menuItem.signatureId);
		}
	},

	/**
	 * Event handler when the "Send" button has been pressed.
	 * This will {@link Zarafa.core.ui.MessageContentPanel#sendRecord send} the given record.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onSendButton: function (button)
	{
    if (this.record.get('deferred_send_time') !== null) {
      // If the mail is scheduled mail(in outbox) and user try to directly send it this will not send
      // Because of it has 'deferred_send_time' ,So by setting null into 'deferred_send_time' we can send the mail
      this.record.set('deferred_send_time', null);
    }
		this.dialog.sendRecord();
	},

	/**
	 * Event handler when the "Send Later" button has been pressed.
	 * This will call the {@link Zarafa.mail.Actions#openDelayedDeliveryContent}.
	 * @param {Ext.Button} button The button which was clicked
	 */
	onSendLaterButton: function (button)
	{
		this.dialog.sendLaterRecord();
	},

	/**
	 * Event handler when the "Save" button has been pressed.
	 * This will {@link Zarafa.core.ui.RecordContentPanel#saveRecord save} the given record.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onSaveButton: function (button)
	{
		this.dialog.saveRecord();
	},

	/**
	 * Event handler when the "Delete" button has been pressed.
	 * This will {@link Zarafa.core.ui.RecordContentPanel#deleteRecord delete} the given record.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onDeleteButton: function (button)
	{
		this.dialog.deleteRecord();
	},

	/**
	 * Event handler when the "Check Names" button has been pressed.
	 * This will {@link Zarafa.core.data.IPMRecipient#resolve resolve} all recipients.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onCheckNamesButton: function (button)
	{
		this.record.getRecipientStore().resolve(undefined, { cancelPreviousRequest: true });
	},

	/**
	 * Event handler when the "Message Options" button has been pressed.
	 * This will call the {@link Zarafa.mail.Actions#openMailOptionsContent}.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onMailOptionsButton: function (button)
	{
		Zarafa.mail.Actions.openMailOptionsContent(this.record, {
			autoSave: false
		});
	},

	/**
	 * Event handler when the "Set Flag" button has been pressed.
	 * This will call the {@link Zarafa.common.Actions#openFlagsMenu}.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @param {Ext.EventObject} eventObject event object
	 * @private
	 */
	onSetFlagButton: function (button, eventObject)
	{
		Zarafa.common.Actions.openFlagsMenu(this.record, eventObject.getXY(), false);
	},

	/**
	 * Event handler which is called when one of the PriorityGroup buttons
	 * have been toggled. If this is the case, the importance is updated,
	 * if the button is untoggled, then all buttons in the prioritygroup
	 * are untoggled and the normal importance is applied. Otherwise the
	 * importance which belongs to the button is applied.
	 *
	 * @param {Ext.Button} button The button from the PriorityGroup which was pressed
	 * @param {Boolean} pressed true if the button pressed, false otherwise.
	 * @private
	 */
	onPriorityGroupToggle: function (button,pressed)
	{
		if (pressed) {
			this.record.set('importance', button.importance);
		} else {
			this.record.set('importance', Zarafa.core.mapi.Importance.NORMAL);
		}
	},

	/**
	 * Event handler which is called when show Bcc recipientfield buttons have been
	 * toggled. If this is the case, the Bcc recipeint field is visible in dialog
	 * if the button is untoggled, then showBcc buttons is untoggled and
	 * the bcc field is hidden from the dailog.
	 * @param {Ext.Button} button showBcc recipient button is pressed
	 * @param {Boolean} state The state in which the button currently is.
	 * @private
	 */
	onBccMenuToggle: function (button, state)
	{
		this.dialog.toggleBccState(state);
	},

	/**
	 * Event handler which is called when show Bcc recipientfield buttons have been
	 * toggled. If this is the case, the Bcc recipeint field is visible in dialog
	 * if the button is untoggled, then showBcc buttons is untoggled and
	 * the bcc field is hidden from the dailog.
	 * @param {Ext.Button} button showBcc recipient button is pressed
	 * @param {Boolean} state The state in which the button currently is.
	 * @private
	 */
	onFromMenuToggle: function (button, state)
	{
		this.dialog.toggleFromState(state);
	},

	/**
	 * Event that is fired when visibility of the BCC field must be changed.
	 * This will update UI of the {@link Zarafa.mail.dialogs.MailCreateContentPanel}
	 * @param {Zarafa.core.ui.ContentPanel} contentpanel
	 * @param {Boolean} enabled true if the the BCC field should be shown
	 * @private
	 */
	onContentPanelBccToggle: function (contentpanel, pressed)
	{
		this.showBcc.toggle(pressed, true);
	},

	/**
	 * Event that is fired when visibility of the From field must be changed.
	 * This will update UI of the {@link Zarafa.mail.dialogs.MailCreateContentPanel}
	 * @param {Zarafa.core.ui.ContentPanel} contentpanel
	 * @param {Boolean} enabled true if the the From field should be shown
	 * @private
	 */
	onContentPanelFromToggle: function (contentpanel, pressed)
	{
		this.showFrom.toggle(pressed, true);
	},

	/**
	 * Event handler which is called when read receipt button have been
	 * toggled.
	 *
	 * @param {Ext.Button} button The button which was pressed
	 * @private
	 */
	onReadReceiptToggle: function (button)
	{
		this.record.set('read_receipt_requested', button.pressed);
	},

	/**
	 * Load record into form
	 *
	 * @param {Zarafa.core.data.IPMRecord} record The record to load
	 * @param {Boolean} contentReset force the component to perform a full update of the data.
	 */
	update: function (record, contentReset)
	{
		// Add event listener when record is available with this toolbar.
		if (!Ext.isDefined(this.record) && Ext.isDefined(record)) {
			// Listen to the 'add', 'update' and 'remove' events on the attachment-sub-store
			var attachmentStore = record.getAttachmentStore();
			if (attachmentStore) {
				this.mon(attachmentStore, {
					'update': this.onAttachmentChange,
					'add': this.onAttachmentChange,
					'remove': this.onAttachmentChange,
					scope: this
				});
			}
		}

		this.record = record;

		// Only enable Disabled button when it is not a phantom
		this.deleteBtn.setDisabled(record.phantom === true);

		if (contentReset === true || record.isModifiedSinceLastUpdate('importance')) {
			switch (record.get('importance')) {
				case Zarafa.core.mapi.Importance.URGENT:
					this.highPriority.toggle(true, false);
					break;
				case Zarafa.core.mapi.Importance.NONURGENT:
					this.lowPriority.toggle(true, false);
					break;
				default:
					// No priority buttons will be selected if user choose normal priority
					// from Zarafa.mail.dialogs.MailViewOptionsContentPanel dialog.
					this.highPriority.toggle(false, true);
					this.lowPriority.toggle(false, true);
					break;
			}
		}

		if (contentReset === true || record.isModifiedSinceLastUpdate('read_receipt_requested')) {
			this.readReceiptField.toggle(this.record.get('read_receipt_requested'), true);
		}
	},

	/**
	 * Event handler called when attachment store gets updated.
	 * This will prevent save operation if attachments are still
	 * being uploaded.
	 *
	 * @param {Zarafa.core.data.IPMAttachmentStore} attachmentStore The store which fired the event
	 * @param {Ext.data.Record} record The record which was updated
	 * @private
	 */
	onAttachmentChange: function(attachmentStore, record)
	{
		var isAllAttachUploaded = true;

		// Loop over all the attachments and check if all attachments gets uploaded or not
		attachmentStore.each(function(attach) {
			if(!attach.isUploaded()) {
				isAllAttachUploaded = false;
				// stop further iterations
				return false;
			}
		}, this);

		// stop the autosave and disable the save button
		this.dialog.autoSave = isAllAttachUploaded;
		this.saveBtn.setDisabled(!isAllAttachUploaded);

		// Change the tooltip accordingly
		if (isAllAttachUploaded) {
			this.saveBtn.setTooltip(_('Save') + ' (Ctrl + S)');
		} else {
			this.saveBtn.setTooltip(_('Cannot save while attachment is being uploaded'));
		}
	},

	/**
	 * Event handler called when the "PopOut" button has been pressed.
	 * This will call the {@link Zarafa.mail.Actions#openMailContent}
	 * with record and its containing {@link Zarafa.core.ui.MessageContentPanel dialog}.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onPopoutButton: function(button)
	{
		Zarafa.mail.Actions.popoutMailContent(this.record, this.dialog);
	}
});
Ext.reg('zarafa.mailcreatetoolbar', Zarafa.mail.dialogs.MailCreateToolbar);
