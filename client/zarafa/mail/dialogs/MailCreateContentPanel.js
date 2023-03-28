Ext.namespace('Zarafa.mail.dialogs');

/**
 * @class Zarafa.mail.dialogs.MailCreateContentPanel
 * @extends Zarafa.core.ui.MessageContentPanel
 * @xtype zarafa.mailcreatecontentpanel
 */
Zarafa.mail.dialogs.MailCreateContentPanel = Ext.extend(Zarafa.core.ui.MessageContentPanel, {
	/**
	 * The {@link Zarafa.mail.MailContextModel} which is obtained using {@link #getContextModel}.
	 * @property
	 * @type Zarafa.mail.MailContextModel
	 */
	model: undefined,

	/**
	 * True if the BCC field should be shown.
	 * @property
	 * @type Boolean
	 */
	showbcc: false,

	/**
	 * @cfg {Boolean} useHtml True to enable the HTML editor in this panel
	 * If not provided, the value will be obtained from the {@link Zarafa.settings.SettingsModel}.
	 */
	useHtml: false,

	/**
	 * True if the From field should be shown.
	 * @property
	 * @type Boolean
	 */
	showfrom: false,

	/**
	 * The queue containing callback functions which can be used to validate the
	 * {@link Zarafa.core.data.IPMRecord} before opening send later dialog. If the queue
	 * completes successfully, the dialog will open, otherwise it will be cancelled.
	 * @property
	 * @type Zarafa.core.data.CallbackQueue
	 * @protected
	 */
	sendLaterValidationQueue: undefined,

	/**
	 * @cfg {Zarafa.addressbook.dialogs.AddressBookContentPanel} ABDialog only available when
	 * user select "Send email" address book context menu item.
	 */
	ABDialog: undefined,

	/**
	 * @constructor
	 * @param config Configuration structure
	 */
	constructor: function(config)
	{
		config = config || {};

		if (!Ext.isDefined(config.useHtml)) {
			config.useHtml = container.getSettingsModel().get('zarafa/v1/contexts/mail/dialogs/mailcreate/use_html_editor');
		}

		config.plugins = Ext.value(config.plugins, []);
		if (container.getSettingsModel().get('zarafa/v1/contexts/mail/autosave_enable') === true) {
			config.plugins.push({
				ptype: 'zarafa.autosavemessageplugin'
			});
		}

		// Add in some standard configuration data.
		Ext.applyIf(config, {
			// Override from Ext.Component
			xtype: 'zarafa.mailcreatecontentpanel',
			// Override from Ext.Component
			layout: 'fit',
			title: _('Email'),
			recordComponentPluginConfig: Ext.applyIf(config.recordComponentPluginConfig || {}, {
				allowWrite: true
			}),
			closeOnSend: true,
			confirmClose: true,
			items: [{
				xtype: 'zarafa.mailcreatepanel',
				ref: 'mainPanel',
				useHtml: config.useHtml,
				tbar:{
					xtype: 'zarafa.mailcreatetoolbar'
				}
			}]
		});

		this.addEvents(
			/**
			 * Fires when the user toggle a button in toolbar.
			 * This event will link the toolbar with mainpanel in panel
			 * @param {Zarafa.core.ui.ContentPanel} contentpanel
			 * @param {Boolean} true if toggle state ie. pressed or else false
			 */
			'bcctoggle',
			/**
			 * Fires when the user toggle a button in toolbar.
			 * This event will link the toolbar with mainpanel in contentpanel
			 * @param {Zarafa.core.ui.ContentPanel} contentpanel
			 * @param {Boolean} true if toggle state ie. pressed or else false
			 */
			'fromtoggle'
		);

		// Call parent constructor
		Zarafa.mail.dialogs.MailCreateContentPanel.superclass.constructor.call(this, config);

		// Initialize the Send Later Validation queue
		// which is used for validating the message before opening send later dialog
		this.createSendLaterValidationQueue();
	},

	/**
	 * If {@link showInfoMask} is enabled, this will display the {@link #savingText} to the user.
	 * @protected
	 * @overridden
	 */
	displayInfoMask: function()
	{
		if (this.showInfoMask === false) {
			return;
		}

		if (this.isSaving && !this.isSending) {
			this.savingEl = container.getNotifier().notify('info.mailsaving', _('Saving...'), {
				toolbar: this.mainPanel.getTopToolbar()
			});
		} else {
			Zarafa.mail.dialogs.MailCreateContentPanel.superclass.displayInfoMask.apply(this, arguments);
		}
	},

	/**
	 * If {@link #showInfoMask} is enabled, and {@link #displayInfoMask} has been called, this
	 * will remove the saving notification. When saving has been successful, a new notification
	 * will be shown to display the {@link #savingDoneText} with timestamp.
	 * @param {Boolean} success false to disable the display of {@link #savingDoneText}.
	 * @protected
	 * @overridden
	 */
	hideInfoMask: function(success)
	{
		if (this.showInfoMask === false) {
			return;
		}

		// If there isn't any message action set on the record, then it's just the save mail action.
		if (this.isSaving && !this.isSending) {
			var message = (success) ? String.format(_('Saved at {0}'), this.record.get('last_modification_time').formatDefaultTime()) : _('Saving failed');
			container.getNotifier().notify('info.mailsaved', message, {
				toolbar: this.mainPanel.getTopToolbar()
			});
		} else {
			Zarafa.mail.dialogs.MailCreateContentPanel.superclass.hideInfoMask.apply(this, arguments);
		}
	},

	/**
	 * Event which is fired when the {@link #record} has been completely loaded.
	 * This will close the {@link Zarafa.addressbook.dialogs.AddressBookContentPanel AddressBookContentPanel} if
	 * it is open.
	 *
	 * @param {Ext.Container} panel The panel to which the record was set
	 * @param {Zarafa.core.data.MAPIRecord} record The record which was updated
	 * @private
	 */
	onLoadRecord: function(panel, record)
	{
		Zarafa.mail.dialogs.MailCreateContentPanel.superclass.onLoadRecord.apply(this, arguments);

		if (Ext.isDefined(this.ABDialog)) {
			this.ABDialog.close();
		}
	},

	/**
	 * Load record into content panel
	 *
	 * @param {Zarafa.core.data.IPMRecord} record The record to load
	 * @param {Boolean} contentReset force the component to perform a full update of the data.
	 */
	update: function(record, contentReset)
	{
		var hasFrom = false;
		var hasBcc = false;
		/**
		 * Bcc field is shown when either of condition if true:
		 * 1) When user has selected Bcc Field to be shown always OR
		 * 2) When record itself has bcc recipients
		 *
		 * Same way From field is shown when either of condition if true:
		 * 1) When user has selected From Field to be shown always OR
		 * 2) When record has set delegator in sent_representing_* info.
		 */
		if (contentReset) {
			var delegatorFieldStore = this.mainPanel.fromRecipientField.getBoxStore();
			if(!record.userIsStoreOwner()) {
				var delegator = container.getHierarchyStore().getById(record.get('store_entryid'));
				record.setDelegatorInfo(delegator);
			}
			
			// Get the recipeint for the from field.
			var delegatorRecord = record.getDefaultFromRecipeint();

			if(Ext.isDefined(delegatorRecord) && delegatorRecord) {
				hasFrom = true;
				// We need to maintain that in from field there should be only one user,
				// So remove earlier added user.
				delegatorFieldStore.removeAll();
				delegatorFieldStore.add(delegatorRecord);
			}
			hasBcc = record.getSubStore('recipients').hasBccRecipients();
			this.fireEvent('bcctoggle', this, this.showbcc || hasBcc, false);
			this.fireEvent('fromtoggle', this, this.showfrom || hasFrom, false);

			if (this.inputAutoFocusPlugin) {
				switch (record.getMessageAction('action_type')) {
					case Zarafa.mail.data.ActionTypes.REPLY:
					case Zarafa.mail.data.ActionTypes.REPLYALL:
					case Zarafa.mail.data.ActionTypes.EDIT_AS_NEW:
						// Automatically place the focus on the body
						this.inputAutoFocusPlugin.setAutoFocus('zarafa.editorfield');
						break;
					case Zarafa.mail.data.ActionTypes.FORWARD:
					case Zarafa.mail.data.ActionTypes.FORWARD_ATTACH:
					/* falls through */
					default:
						this.inputAutoFocusPlugin.setAutoFocus(this.mainPanel.toRecipientField);
						break;
				}
			}
		} else {
			if (record.isSubStoreModifiedSincelastUpdate('recipients')) {
				hasBcc = record.getSubStore('recipients').hasBccRecipients();
				this.fireEvent('bcctoggle', this, this.showbcc || hasBcc, false);
			}

			if (record.isModifiedSinceLastUpdate('sent_representing_email_address')) {
				if(!Ext.isEmpty(record.get('sent_representing_email_address'))) {
					hasFrom = true;
				}

				this.fireEvent('fromtoggle', this, (this.showfrom || hasFrom), false);
			}
		}

		this.updateTitleFromRecord(record);
		this.updateIconFromRecord(record);
	},

	/**
	 * Update this panel's icon class from the record that it contains
	 * First obtains the icon class from a mapping, then calls {@link #setIcon}
	 *
	 * @param {Zarafa.core.data.MAPIRecord} record The record bound to this component
	 * @private
	 */
	updateIconFromRecord: function(record)
	{
		//TODO: create a new icon mapping for tabs
		var iconCls = Zarafa.common.ui.IconClass.getIconClass(record);
		this.setIcon(iconCls);
	},

	/**
	 * When record has been updated, title also has to be - for instance if we have the subject
	 * in the title and the subject changes
	 * Calls {@link #setTitle} this.setTitle in order to update
	 * @param {Zarafa.core.data.MAPIRecord} record The record that has been updated
	 */
	updateTitleFromRecord: function(record)
	{
		var subject = record.get('subject');
		if(!Ext.isEmpty(subject)){
			this.setTitle(subject);
		} else {
			this.setTitle(this.initialConfig.title);
		}
	},

	/**
	 * Register the {@link #stateEvents state events} to the {@link #saveState} callback function.
	 * @private
	 */
	initStateEvents: function()
	{
		Zarafa.mail.dialogs.MailCreateContentPanel.superclass.initStateEvents.call(this);

		this.on('bcctoggle', this.saveState, this);
		this.on('fromtoggle', this.saveState, this);
	},

	/**
	 * Called when bcctoggle or fromtoggle event is fired, if the argument
	 * saveState is true it will save the state of the mailcreatecontentpanel
	 * to the WebApp user settings.
	 *
	 * @param {Zarafa.mail.dialogs.MailCreateContentPanel} panel the mail create content panel
	 * @param {Boolean} visible visiblity of button
	 * @param {Boolean} saveState save the state of the button.
	 */
	saveState: function(panel, visible, saveState)
	{
		if(saveState){
			Zarafa.mail.dialogs.MailCreateContentPanel.superclass.saveState.call(this);
		}
	},

	/**
	 * When {@link #stateful} the State object which should be saved into the
	 * {@link Ext.state.Manager}.
	 * @return {Object} The state object
	 * @protected
	 */
	getState: function()
	{
		var state = Zarafa.mail.dialogs.MailCreateContentPanel.superclass.getState.apply(this, arguments);
		return Ext.apply(state || {}, { showbcc: this.showbcc, showfrom: this.showfrom });
	},

	/**
	 * Saves bcc field's state into settings and fires 'bcctoggle' event to update UI
	 * @param {Boolean} true, if Bcc field is visible else false
	 */
	toggleBccState: function(showBcc)
	{
		this.showbcc = showBcc;
		this.fireEvent('bcctoggle', this, showBcc, true);
	},

	/**
	 * Saves from field's state into settings and fires 'fromtoggle' event to update UI
	 * @param {Boolean} true, if From field is visible else false
	 */
	toggleFromState: function(showFrom)
	{
		this.showfrom = showFrom;
		this.fireEvent('fromtoggle', this, showFrom, true);
	},

	/**
	 * Function gets the {@link Zarafa.mail.MailContextModel MailContextModel} attached to
	 * {@link Zarafa.mail.MailContext MailContext}.
	 * @return {Zarafa.mail.MailContextModel} Mail context model
	 */
	getContextModel: function()
	{
		if(!this.model) {
			var parentFolder = this.get('parent_entryid');

			if(!Ext.isEmpty(parentFolder)) {
				parentFolder = container.getHierarchyStore().getById(parentFolder);
			}

			if(Ext.isEmpty(parentFolder)) {
				parentFolder = container.getHierarchyStore().getDefaultFolder('drafts');
			}

			// now do round of bidding to find context attached to the folder we got
			var context = container.getContextByFolder(parentFolder);
			this.model = context.getModel();
		}

		return this.model;
	},

	/**
	 * Helper function which is used to validate {@link #record} and open the send later dialog
	 */
	sendLaterRecord: function ()
	{
		this.sendLaterValidationQueue.run(this.onCompleteValidateSendLaterRecord, this);
	},

	/**
	 * Create and initialize the {@link #sendLaterValidationQueue}. This will add two validations steps
	 * which must be executed to determine if the message has valid recipients.
	 * @protected
	 */
	createSendLaterValidationQueue: function ()
	{
		this.sendLaterValidationQueue = new Zarafa.core.data.CallbackQueue();

		// Add a validation step to determine if there are recipients
		this.sendLaterValidationQueue.add(this.validateEmptyRecipients, this);
		// Add a validation step to determine if all recipients are resolved
		this.sendLaterValidationQueue.add(this.validateResolvedRecipients, this);
	},

	/**
	 * Callback function for the {@link #sendLaterValidationQueue} which is called when the queue has been
	 * completed. If the queue ended successfully then it will call the {@link Zarafa.mail.Actions#openDelayedDeliveryContent}.
	 * @param {Boolean} success True if the queue ended successfully
	 * @private
	 */
	onCompleteValidateSendLaterRecord: function (success)
	{
		if (success) {
			Zarafa.mail.Actions.openDelayedDeliveryContent(this.record, this);
		}
	}
});

Ext.reg('zarafa.mailcreatecontentpanel', Zarafa.mail.dialogs.MailCreateContentPanel);
