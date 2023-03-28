Ext.namespace('Zarafa.mail');

/**
 * @class Zarafa.mail.Actions
 * Common actions which can be used within {@link Ext.Button buttons}
 * or other {@link Ext.Component components} with action handlers.
 * @singleton
 */
Zarafa.mail.Actions = {
	/**
	 * Open a Panel in which a new {@link Zarafa.core.data.IPMRecord record} can be
	 * further edited.
	 *
	 * @param {Zarafa.mail.MailContextModel} model Context Model object that will be used
	 * to {@link Zarafa.mail.MailContextModel#createRecord create} the email.
	 * @param {Object} config (optional) Configuration object used to create
	 * the Content Panel.
	 */
	openCreateMailContent: function(model, config)
	{
		var record = model.createRecord();
		Zarafa.core.data.UIFactory.openCreateRecord(record, config);
	},

	/**
	 * Opens a {@link Zarafa.mail.ui.MailCreatePanel MailCreatePanel} for the given non-recipient
	 * objects. This will convert the object into a valid Recipient Record and add it to the new mail.
	 *
	 * @param {Zarafa.mail.MailContextModel} model mail context model,
	 * model object that will be used to create a new {@link Zarafa.core.data.IPMRecord IPMRecord}
	 * @param {Zarafa.core.data.MAPIRecord} contacts The records to convert to recipients.
	 * @param {Object} config (optional) Configuration object used to create
	 * the Content Panel.
	 */
	openCreateMailContentForContacts: function(model, contacts, config)
	{
		var mailRecord = model.createRecord();
		var recipientStore = mailRecord.getRecipientStore();
		var tasks = [];

		contacts = Array.isArray(contacts) ? contacts : [ contacts ];
		for (var i = 0, len = contacts.length; i < len; i++) {
			var contact = contacts[i];

			if (contact.isOpened()) {
				// The contact is opened and contains all the information which we need
				var recipient = contact.convertToRecipient(Zarafa.core.mapi.RecipientType.MAPI_TO, true);
				recipientStore.add(recipient);
			} else {
				// The contact is not opened yet, register a task to open the contact once
				// the panel has been opened.
				tasks.push({
					/* By encapsulating the task function it is possible to get the contact object
					* into the scope of the task function. When you add more tasks the contact
					* reference changes and without this encapsulation it will change the contact in
					* all the previously added task functions as well.
					*/
					fn: function(){
						// This contactRecord becomes a private variable, not changeable outside.
						var contactRecord = contact;
						return function(panel, record, task, callback) {
							var fn = function(store, record) {
								if (record === contactRecord) {
									store.un('open', fn, task);
									var recipient = contactRecord.convertToRecipient(Zarafa.core.mapi.RecipientType.MAPI_TO, true);
									recipientStore.add(recipient);
									callback();
								}
							};

							contactRecord.getStore().on('open', fn, task);
							contactRecord.open();
						};
					// This triggers the encapsulation and returns the task function
					}()
				});
			}
		}

		config = Ext.applyIf(config || {}, {
			recordComponentPluginConfig: {
				loadTasks: tasks
			}
		});

		Zarafa.core.data.UIFactory.openCreateRecord(mailRecord, config);
	},

	/**
	 * Function will close a conversation when there's single record selected in mail grid
	 * and that record is a part of that conversation. This will also select a row above this conversation
	 * and if there's no row above then it'll select a row below it.
	 *
	 * @param {Zarafa.mail.ui.MailGrid} mailGrid The grid in which we need to close the conversation.
	 */
	closeSelectedConversation: function(mailGrid)
	{
		var selModel = mailGrid.getSelectionModel();
		var selections = selModel.getSelections();

		if (selections.length === 1 && selections[0].isConversationRecord()) {
			var record = selections.pop();
			var store = record.getStore();
			var headerRecord = store.getHeaderRecordFromItem(record);

			if (headerRecord) {
				store.toggleConversation(headerRecord);

				// Select previous row of this conversation headerRecord.
				// If its not available then select Next row of it.
				var rowIndex = store.indexOf(headerRecord);
				if (!selModel.selectPrevious(false, rowIndex)) {
					selModel.selectNext(false, rowIndex);
				}
			}
		}
	},

	/**
	 * Opens a {@link Zarafa.mail.ui.MailCreatePanel MailCreatePanel} for the
	 * given {@link Zarafa.core.data.IPMRecord record} using the {@link Zarafa.mail.data.ActionTypes actionType}
	 * to format the message.
	 *
	 * @param {Zarafa.core.data.IPMRecord|Zarafa.core.data.IPMRecord[]} record The record to which will be responded.
 	 * @param {Zarafa.mail.MailContextModel} model mail context model,
	 * model object that will be used to create a new {@link Zarafa.core.data.IPMRecord IPMRecord}
	 * @param {Zarafa.mail.data.ActionTypes} actionType The action type of this response.
	 * @param {Object} config (optional) Configuration object used to create
	 * the Content Panel.
	 */
	openCreateMailResponseContent: function(records, model, actionType, config)
	{
		if (!Array.isArray(records)) {
			records = [records];
		}

		var response;

		for (var i = 0; i < records.length; i++) {
			var record = records[i];

			if (record.isFaultyMessage()) {
				// can not reply/forward to faulty record
				continue;
			}

			if (actionType === Zarafa.mail.data.ActionTypes.FORWARD_ATTACH) {
				response = model.createResponseRecord(record, actionType, response, config);
			} else {
				var openHandler = function(store, record) {
					// This function will called in the scope of the record for
					// whom the event handler was registered.
					if (this !== record) {
						return;
					}

					if (actionType === Zarafa.mail.data.ActionTypes.FORWARD_ATTACH) {
						response = model.createResponseRecord(record, actionType, response, config);
					} else {
						response = model.createResponseRecord(record, actionType);
						Zarafa.core.data.UIFactory.openCreateRecord(response, config);

						store.un('open', openHandler, record);
					}
				};

				if (record.isOpened()) {
					response = model.createResponseRecord(record, actionType);
					Zarafa.core.data.UIFactory.openCreateRecord(response, config);
				} else {
					record.getStore().on('open', openHandler, record);
					record.open();
				}
			}
		}

		if (actionType === Zarafa.mail.data.ActionTypes.FORWARD_ATTACH) {
			Zarafa.core.data.UIFactory.openCreateRecord(response, config);
		}
	},

	/**
	 * Opens a MailOptionsPanel. For displaying advanced options for the given {@link Zarafa.core.data.IPMRecord records}.
	 *
	 * @param {Zarafa.core.data.IPMRecord} records The record, or records for which the options are requested
	 * @param {Object} config (optional) Configuration object used to create
	 * the Content Panel.
	 */
	openMailOptionsContent: function(records, config)
	{
		if (Array.isArray(records) && !Ext.isEmpty(records)) {
			records = records[0];
		}

		config = Ext.applyIf(config || {}, {
			modal: true
		});

		var componentType = Zarafa.core.data.SharedComponentType['mail.dialog.options'];
		Zarafa.core.data.UIFactory.openLayerComponent(componentType, records, config);
	},

	/**
	 * Opens a {@link Zarafa.addressbook.dialogs.ABMultiUserSelectionContentPanel ABMultiUserSelectionContentPanel}
	 * for configuring the categories of the given {@link Zarafa.core.data.IPMRecord records}.
	 *
	 * @param {Zarafa.core.data.IPMRecord} records The record, or records for which the categories
	 * must be configured
	 * @param {Object} config (optional) Configuration object used to create
	 * the Content Panel.
	 */
	openRecipientSelectionContent: function(records, config)
	{
		if (Array.isArray(records) && !Ext.isEmpty(records)) {
			records = records[0];
		}

		// Create a copy of the record, we don't want the changes
		// to be activated until the user presses the Ok button.
		var copy = records.copy();
		var store = copy.getSubStore('recipients');
		copy.isModalDialogRecord = true;
		Zarafa.common.Actions.openABUserMultiSelectionContent({
			callback: function() {
				records.applyData(copy);
			},
			convert: function(user, field) {
				return user.convertToRecipient(field ? field.defaultRecipientType : config.defaultRecipientType);
			},
			store: store,
			selectionCfg: [{
				xtype: 'zarafa.recipientfield',
				fieldLabel: _('To') + ':',
				boxStore: store,
				filterRecipientType: Zarafa.core.mapi.RecipientType.MAPI_TO,
				defaultRecipientType: Zarafa.core.mapi.RecipientType.MAPI_TO,
				flex: 1
			},{
				xtype: 'zarafa.recipientfield',
				fieldLabel: _('CC') + ':',
				boxStore: store,
				filterRecipientType: Zarafa.core.mapi.RecipientType.MAPI_CC,
				defaultRecipientType: Zarafa.core.mapi.RecipientType.MAPI_CC,
				flex: 1
			},{
				xtype: 'zarafa.recipientfield',
				fieldLabel: _('BCC') + ':',
				boxStore: store,
				filterRecipientType: Zarafa.core.mapi.RecipientType.MAPI_BCC,
				defaultRecipientType: Zarafa.core.mapi.RecipientType.MAPI_BCC,
				flex: 1
			}]
		});
	},

	/**
	 * Open a Panel in which the {@link Zarafa.core.data.IPMRecord record}
	 * can be viewed, or further edited with pre-chosen layer as separateWindows..
	 * Prepare record instance based on original record.
	 *
	 * @param {Zarafa.core.data.IPMRecord} records The records to open
	 * @param {Zarafa.core.ui.MessageContentPanel} dialog which contains the record.
	 */
	popoutMailContent: function(record, dialog) {
		var copy;

		// First create the exact same copy of record avoiding cheap copy.
		copy = Zarafa.core.data.RecordFactory.createRecordObjectByRecordData(record.data, record.id);
		copy.idProperties = record.idProperties.clone();
		copy.phantom = record.phantom;
		copy.dirty = record.dirty;
		copy.modified = record.modified;
		copy.applyData(record, false);

		// We must have to retain "id" of attachment-substore of original record to access attachments.
		var attachmentStoreId = record.getAttachmentStore().getId();
		copy.getAttachmentStore().setId(attachmentStoreId);

		var configObj = {
			layerType: 'separateWindows',
			isRecordChangeByUser: dialog.recordComponentPlugin.isChangedByUser
		};

		if(!record.phantom){
			// Add the copied record into the shadow store as the old record will be removed from the same,
			// when the tab gets closed, and store is required to attach necessary events for some functionality like markAsRead etc.
			container.getShadowStore().add(copy);

			// Prevent that RecordComponentPlugin's setRecord adds the record into the shadow store again
			// as we already add the record into shadow store in the line above.
			configObj.recordComponentPluginConfig = { useShadowStore: false };
		}

		// Close the existing tab for which a new separate browser window is created
		dialog.fireEvent('close', dialog);
		Zarafa.core.data.ContentPanelMgr.unregister(dialog);

		// Use newly created copy of original record to load into separate browser window
		Zarafa.common.Actions.openMessageContent(copy, configObj);
	},

    /**
     * Open a {@link Zarafa.mail.dialogs.DelayDeliveryContentPanel DelayDeliveryContentPanel} for
     * set DEFERRED_SEND_TIME property  in new created mail base on enter Date and Time
     *
     * @param {Zarafa.core.data.IPMRecord} record mail record
     * @param {Zarafa.core.ui.MessageContentPanel} dialog which contains the record.
     */
    openDelayedDeliveryContent: function (record, dialog)
	{
        Zarafa.core.data.UIFactory.openLayerComponent(Zarafa.core.data.SharedComponentType['mail.dialog.delayeddelivery'], record, {
            manager: Ext.WindowMgr,
            modal: true,
            mailPanel: dialog,
            resizable: false,
            scope: this
        });
	},

	/**
	 * Function will redirect to signature widget which belongs to {@link Zarafa.mail.settings.SettingsSignaturesWidget SettingsSignaturesWidget}.
	 */
	redirectToSignatureWidget: function()
	{
		if (Zarafa.core.BrowserWindowMgr.isMainWindowActive() === false){
			Zarafa.core.BrowserWindowMgr.switchFocusToMainWindow();
		}

		var context = container.getCurrentContext();
		if (context.getName() === "settings") {
			var tabPanel = container.getTabPanel();
			context.defaultActiveTab = 1;
			context.scrollToSignatureWidget = true;
			tabPanel.setActiveTab("zarafa-mainpanel-content");
		} else {
			context = container.getContextByName('settings');
			// defaultActiveTab = 1 is mail tab
			context.defaultActiveTab = 1;
			context.scrollToSignatureWidget = true;
			container.switchContext(context);
		}
	}
};
