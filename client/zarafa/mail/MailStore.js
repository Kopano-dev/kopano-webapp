Ext.namespace('Zarafa.mail');

/**
 * @class Zarafa.mail.MailStore
 * @extends Zarafa.core.data.ListModuleStore
 * @xtype zarafa.mailstore
 *
 * The MailStore class provides a way to connect the 'maillistmodule' in the server back-end to an
 * Ext.grid.GridPanel object. It provides a means to retrieve mail listings asynchronously.
 * The MailStore object, once instantiated, will be able to retrieve and list mails from a
 * single specific folder only.
 */
Zarafa.mail.MailStore = Ext.extend(Zarafa.core.data.ListModuleStore, {

	/**
	 * @constructor
	 * @param {Object} config configuration params that should be used to create instance of this store.
	 */
	constructor: function(config)
	{
		config = config || {};

		// Apply default settings.
		Ext.applyIf(config, {
			preferredMessageClass: 'IPM.Note',
			defaultSortInfo: {
				field: 'message_delivery_time',
				direction: 'desc'
			},
			conversationManager: new Zarafa.mail.data.ConversationManagers()
		});

		Zarafa.mail.MailStore.superclass.constructor.call(this, config);

		// Don't register standalone stores (used in modal dialogs) with the PresenceManager
		if ( !this.standalone ){
			Zarafa.core.PresenceManager.registerStore(this, ['sender', 'received_by', 'sent_representing']);
		}
	},

	/**
	 * Filter a list of {@link Zarafa.core.data.IPMRecord records} by checking if the record
	 * belongs to this Store. This comparison is based on checking if the entryid of the given
	 * records match the entryid of the records inside the store.
	 *
	 * What will be returned is an object containing the records as present inside the store,
	 * and the data objects which should be applied to them (the data from the records of the
	 * store that triggered the event).
	 *
	 * Function will also mark all updates that are already opened of this meeting to be
	 * out dated and force it to be opened again when its loaded in preview pane.
	 *
	 * @param {Zarafa.core.data.IPMRecord|Array} records The record or records to filter
	 * @param {Ext.data.Api.actions} action The API action for which the updates are looked for.
	 * @return {Object} Object containing the key 'records' containing the array of records inside
	 * this store, and the key 'updatedRecords' containing the array of records which should be
	 * applied to those records.
	 * @private
	 */
	getRecordsForUpdateData: function(records, action)
	{
		if (!Ext.isDefined(records) || action !== Ext.data.Api.actions.open) {
			return Zarafa.mail.MailStore.superclass.getRecordsForUpdateData.apply(this, arguments);
		}

		var results = { records: [], updatedRecords: [] };

		if (!Array.isArray(records)) {
			records = [ records ];
		}

		for (var i = 0, len = records.length; i < len; i++) {
			var record = records[i];

			if(record instanceof Zarafa.calendar.MeetingRequestRecord) {
				// use CleanGlobalObjectId, so we can force reload of all exceptions also for recurring series
				var globalObjectId = record.get('goid2');

				if (Ext.isEmpty(globalObjectId)) {
					// no global object id found, we can't do anything
					return Zarafa.mail.MailStore.superclass.getRecordsForUpdateData.apply(this, arguments);
				}

				// find all meeting request records which is earlier/latest update of this meeting request record
				var index = -1;
				do {
					index = this.findExact('goid2', globalObjectId, index + 1);

					// check if we got any matching record or not
					if(index < 0) {
						continue;
					}

					var rec = this.getAt(index);

					// check if we found the same record which we updated, for that we need to pass updated data
					// instead of just cloning the same record
					if (!record.equals(rec)) {
						if(rec.isOpened()) {
							// indicate that record data is outdated, record should be reopened again when needed
							rec.opened = false;

							results.records.push(rec);
							results.updatedRecords.push({});
						}
					} else {
						// add original updated record with updated data
						results.records.push(this.getAt(index));
						results.updatedRecords.push(record);
					}
				} while(index != -1);
			} else if(record.isMessageClass('IPM.TaskRequest', true)) {
				// Don't update MailStore-record when it is an IPM.TaskRequest/Accept/Decline/Update
				// because when user tried to open that particular task request, we actually open
				// the associated task.
				continue;
			} else {
				// for other type of mails, just invoke parent class
				return Zarafa.mail.MailStore.superclass.getRecordsForUpdateData.apply(this, arguments);
			}
		}

		return results;
	},

	/**
	 * Function is used to set the filter restriction if {#hasFilterApplied filter is enabled}
	 * while reloading mail store.
	 * @param {Object} options An options which set the filter restriction in params
	 * if filter was already applied on store.
	 */
	reload: function(options)
	{
		if (this.hasFilterApplied) {
			options = Ext.apply(options||{}, {
				params:{
					restriction:{
						filter: this.getFilterRestriction(Zarafa.common.data.Filters.UNREAD)
					}
				}
			});
		}
		Zarafa.mail.MailStore.superclass.reload.call(this, options);
	},

	/**
	 * Used to check if this store contains conversations. (records grouped by conversation and
	 * prefixed with conversation header records)
	 *
	 * @return {Boolean} True if the store contains conversations, or false otherwise.
	 */
	containsConversations: function() {
		// Check if the user enabled conversation view in his settings
		var conversationsUserEnabled = container.getSettingsModel().get('zarafa/v1/contexts/mail/enable_conversation_view');
		if (!conversationsUserEnabled) {
			return false;
		}

		// Check if the user is using infinite scroll
		var infiniteScrollEnabled = container.getSettingsModel().get('zarafa/v1/contexts/mail/enable_live_scroll');
		if (!infiniteScrollEnabled) {
			return false;
		}

		// Check if this store contains the inbox. It is the only folder that can be rendered
		// with conversation view.
		var inbox = container.getHierarchyStore().getDefaultFolder('inbox');
		return (Zarafa.core.EntryId.compareEntryIds(this.entryId, inbox.get('entryid')));
	},

	/**
	 * Checks if the given record is part of an expanded conversation
	 *
	 * @param {Zarafa.mail.MailRecord} record The record that should be checked
	 * @return {Boolean} True is the record is part of an expanded conversation,
	 * false otherwise
	 */
	isConversationOpened: function(record)
	{
		var openedRecordManager = this.conversationManager.getOpenedRecordManager();
		var openedItems = Ext.flatten(openedRecordManager.getRange());

		var entryId = record.get('entryid');
		return openedRecordManager.containsKey(entryId) || openedItems.indexOf(entryId) !== -1;
	},

	/**
	 * Function will be called on 'load' event of store. It will filter out deleted headers items
	 * from newly received data in store. It will manage open/close state of header records
	 * and filter the store to not show items in conversations that have not been expanded.
	 *
	 * @param {Zarafa.mail.MailStore} store which contains message records
	 * @param {Zarafa.mail.MailRecord[]} records array which holds all the records we received in load request.
	 */
	manageOpenConversations: function(store, records)
	{
		if(container.isEnabledConversation() === false) {
			return;
		}

		var openedRecordManager = this.conversationManager.getOpenedRecordManager();
		var openedItems = Ext.flatten(openedRecordManager.getRange());

		for (var i=0; i<records.length-1; i++) {
			var currentRecord = records[i];
			var currRecordConversationCount = currentRecord.get('conversation_count');

			var isConversationOpened = function (item) {
				var entryId = item.get("entryid");
				return openedRecordManager.containsKey(entryId) || openedItems.indexOf(entryId) !== -1;
			};

			// Proceed only if currentRecord is Header record.
			// We only need to alter the open/close state of currentRecord on the basis of its last conversation item's state.
			// Because there can be newly added items which might not be in openedRecordManager.
			if (currRecordConversationCount > 0) {
				var isAnyItemOpened = false;
				var unOpenedItems = [];

				// Loop through all conversation items of the current conversation.
				// If any opened item found that means a conversation was opened before.
				// So, add all unopened items (i.e. newly received mail, restored mail, header record)
				// into openedRecordManager.
				for (var j = i ; j <= i + currRecordConversationCount; j++) {
					var conversationItem = records[j];
					if (isConversationOpened(conversationItem)) {
						isAnyItemOpened = true;
						continue;
					}
					unOpenedItems.push(conversationItem.get('entryid'));
				}

				// If any conversation item is found open then add unopened items to openedRecordManager.
				if (isAnyItemOpened) {
					var items = unOpenedItems;
					if (isConversationOpened(currentRecord)) {
						items = openedRecordManager.get(currentRecord.get('entryid')).concat(unOpenedItems);
					}
					openedRecordManager.add(currentRecord.get('entryid'), items);
				} else if(!isAnyItemOpened && isConversationOpened(currentRecord)) {
					openedRecordManager.removeKey(currentRecord.get('entryid'));
				}

				// Jump to the next record after a conversation finished.
				i = i + currRecordConversationCount;
			}
		}

		this.filterByConversations();
	},

	/**
	 * Filters the store to not show items in conversations that have not been expanded
	 */
	filterByConversations: function()
	{
		var openedRecordManager = this.conversationManager.getOpenedRecordManager();
		var openedItems = Ext.flatten(openedRecordManager.getRange());

		this.filterBy(function(openedItems, openedRecordManager, record, entryId) {
			return record.get('depth') === 0 || openedRecordManager.containsKey(entryId) === true || openedItems.indexOf(entryId) !== -1;
		}.bind(this, openedItems, openedRecordManager), this);
	},

	/**
	 * Function toggles the conversation.
	 *
	 * @param {Zarafa.core.IPMRecord} headerRecord The header record of conversation.
	 * @param {Boolean} expand The expand is true if conversation needs to expand else false.
	 */
	toggleConversation: function(headerRecord, expand)
	{
		if (!headerRecord.isConversationHeaderRecord()) {
			return;
		}
		var headerRecordEntryId = headerRecord.get('entryid');
		var openedRecordManager = this.conversationManager.getOpenedRecordManager();
		var hide = Ext.isDefined(expand) ? !expand : openedRecordManager.containsKey(headerRecordEntryId);

		if (hide) {
			openedRecordManager.removeKey(headerRecordEntryId);
		} else {
			this.clearFilter(true);
			var rowIndex = this.indexOf(headerRecord);
			var conversationCount = headerRecord.get('conversation_count');
			var records = this.getRange(rowIndex + 1, rowIndex + conversationCount);

			var recordIDs = Ext.pluck(records, "id");
			openedRecordManager.add(headerRecordEntryId, recordIDs);
		}

		this.filterByConversations();
	},

	/**
	 * Function will collapse all the conversation except the given header record in parameter
	 * and if no header record is provided then it will collapse all the conversation.
	 *
	 * @param {Zarafa.core.IPMRecord} headerRecord The header record of conversation.
	 */
	collapseAllConversation: function(headerRecord)
	{
		this.conversationManager.closeAll(headerRecord);
		this.filterByConversations();
	},

	/**
	 * Helper function to open (expand) a conversation
	 *
	 * @param {Zarafa.mail.MailRecord} headerRecord
	 */
	expandConversation: function(headerRecord)
	{
		this.toggleConversation(headerRecord, true);
	},

	/**
	 * Returns all the records in the store that are part of the conversation identified
	 * by the given header record
	 *
	 * @param {Zarafa.core.data.MapiRecord} headerRecord The header record of the conversation
	 * @return {Zarafa.core.data.MapiRecord[]} The records that belong to the requested conversation
	 */
	getConversationItemsFromHeaderRecord(headerRecord)
	{
		var items = this.snapshot || this.data;
		var index = items.findIndex('id', headerRecord.id) + 1;
		var retVal = [];
		var item;
		while ((item = items.get(index)) && item.get('depth') > 0) {
			retVal.push(item);
			index++;
		}

		return retVal;
	},

	/**
	 * Returns header record identified by the given record item which is part of that conversation.
	 * Or it returns false if given record is not part of any conversation.
	 *
	 * @param {Zarafa.core.data.MapiRecord} record The conversation item record whose header record needs to be found.
	 * @return {Zarafa.core.data.MapiRecord} returns header record for the given conversation item
	 * or false if given record is not part of any conversation.
	 */
	getHeaderRecordFromItem: function(record) {
		if (!Ext.isDefined(record) || record.isNormalRecord()) {
			return false;
		} else if (record.isConversationHeaderRecord()) {
			return record;
		}

		var items = this.snapshot || this.data;
		var index = items.findIndex('id', record.id) - 1;
		var headerRecord = false;
		var item;
		while ((item = items.get(index))) {
			if (item.get('depth') === 0 && item.get('conversation_count') > 0) {
				headerRecord = item;
				break;
			}
			index--;
		}

		return headerRecord;
	},

	/**
	 * Returns the number of items that have the store has
	 * corresponds as a parent folder. (i.e. for conversations it will only
	 * count the items from the Inbox folder and not the items from the Sent Items
	 * folder)
	 *
	 * @return {Number} The number of items
	 */
	getStoreLength: function()
	{
		// Get all items count when 'Unread' filtered has been applied.
		if (this.containsConversations() && !this.hasFilterApplied) {
			var count = 0;
			var items = this.snapshot ? this.snapshot.items : this.getRange();
			items.forEach(function(item) {
				if (item.get('folder_name') === 'inbox') {
					count++;
				}
			});

			return count;
		}

		return Zarafa.mail.MailStore.superclass.getStoreLength.apply(this, arguments);
	},

	/**
	 * Returns the number of conversations that are contained by the store
	 *
	 * @return {Number} Number of conversation in the store
	 */
	getConversationCount() {
		if (!this.containsConversations) {
			return 0;
		}

		var count = 0;
		var items = this.snapshot ? this.snapshot.items : this.getRange();
		items.forEach(function(item) {
			if (item.get('depth') === 0) {
				count++;
			}
		});

		return count;
	},

	/**
	 * Function which provide the restriction based on the given {@link Zarafa.common.data.Filters.UNREAD Filter}
	 *
	 * @param {Zarafa.common.data.Filters} filterType The filterType which needs to perform on store.
	 * @return {Array|false} RES_BITMASK restriction else false.
	 */
	getFilterRestriction: function(filterType)
	{
		if (filterType === Zarafa.common.data.Filters.UNREAD) {
			var unreadFilterRestriction = Zarafa.core.data.RestrictionFactory.dataResBitmask(
				'PR_MESSAGE_FLAGS',
				Zarafa.core.mapi.Restrictions.BMR_EQZ,
				Zarafa.core.mapi.MessageFlags.MSGFLAG_READ);

			var model = container.getCurrentContext().getModel();
			if (model) {
				var previewedRecord = model.getPreviewRecord();

				// Add preview record in filter restriction so we can
				// make it remains preview in preview panel.
				if(!Ext.isEmpty(previewedRecord) && this.hasFilterApplied) {
					return Zarafa.core.data.RestrictionFactory.createResOr([
						Zarafa.core.data.RestrictionFactory.dataResProperty(
							'entryid',
							Zarafa.core.mapi.Restrictions.RELOP_EQ,
							previewedRecord.get('entryid')
						),
						unreadFilterRestriction
					]);
				}
			}

			return unreadFilterRestriction;
		}
		return false;
	}
});

Ext.reg('zarafa.mailstore', Zarafa.mail.MailStore);
