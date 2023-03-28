/*
 * #dependsFile client/zarafa/common/reminder/data/ReminderProxy.js
 */
Ext.namespace('Zarafa.common.reminder.data');

/**
 * @class Zarafa.common.reminder.data.ReminderStore
 * @extends Zarafa.core.data.MAPIStore
 * @xtype zarafa.reminderstore
 */
Zarafa.common.reminder.data.ReminderStore = Ext.extend(Zarafa.core.data.ListModuleStore, {
	/**
	 * @cfg {String} actionType type of action that should be used to send request to server,
	 * valid action types are defined in {@link Zarafa.core.Actions Actions}, default value is 'list'.
	 */
	actionType: Zarafa.core.Actions['list'],

	/**
	 * Checksum that will be generated from records that are received from server, this checksum will be
	 * used to check if server did sent us new data than the data shown in previous reminder dialog.
	 * @property
	 * @type Number
	 */
	lastChecksum: undefined,

	/**
	 * Flag is used to indicate that we should reload the data in {@link Zarafa.common.reminder.data.ReminderStore ReminderStore}
	 * after receiving response of snooze or dismiss actions, so we don't have to wait until new polling request is sent to get reminder data
	 * because it could happen that there are still some reminders pending for action and user has only selected some reminders
	 * for snoozing or dismissing.
	 * @property
	 * @type Boolean
	 */
	refreshStore: false,

	/**
	 * Flag is used to show reminder dialog or not. It is false when reminder button render as we have to show reminder dialog
	 * when webapp {@link #initializeReminderInterval polling} reminder store.
	 * @property
	 * @type Boolean
	 */
	showReminderDialog: true,

	/**
	 * The object with the configuration for the {@link Ext.TaskMgr TaskMgr} to start the polling for reminders.
	 * @property
	 * @type Object
	 */
	pollTask: null,

	/**
	 * The notifier plugin that is used to show 'error.json' notifications. If the {#link load loading} of reminders
	 * is failing because the backend produces an error, we will show the notification once using the originally
	 * registered notification plugin, and after that we will move the noficiations to the console to not bother the
	 * user with the same message notification over and over again. Once the backend returns valid responses again
	 * we will restore the original notifier plugin.
	 * @property
	 * @type Zarafa.core.ui.notifier.NotifyPlugin
	 */
	originalErrorNotifier: undefined,

	/**
	 * @constructor
	 * @param {Object} config Configuration object
	 */
	constructor: function(config)
	{
		config = config || {};

		var recordType = Zarafa.core.data.RecordFactory.getRecordClassByCustomType(Zarafa.core.data.RecordCustomObjectType.ZARAFA_REMINDER);

		Ext.applyIf(config, {
			proxy: new Zarafa.common.reminder.data.ReminderProxy(),
			writer: new Zarafa.core.data.JsonWriter(),
			reader: new Zarafa.core.data.JsonReader({ dynamicRecord: false }, recordType),

			// @FIXME when batching the delete requests then there is some problem with response router and
			// it updates the grid view twice with the same data
			batch: false
		});

		Zarafa.common.reminder.data.ReminderStore.superclass.constructor.call(this, config);
	},

	/**
	 * Initialize events which Zarafa.common.reminder.data.ReminderStore ReminderStore} will listen to.
	 * @protected
	 */
	initEvents: function()
	{
		this.on('exception', this.onError, this);
		Zarafa.common.reminder.data.ReminderStore.superclass.initEvents.call(this);
	},

	/**
	 * <p>Loads the Record cache from the configured <tt>{@link #proxy}</tt> using the configured <tt>{@link #reader}</tt>.</p>
	 * <br> Function just adds 'list' as actionType in options and calls parent {@link Zarafa.core.data.IPFStore#load} method.
	 * <br> Check documentation of {@link Ext.data.Store#load} for more information.
	 */
	load: function(options)
	{
		if (!Ext.isObject(options)) {
			options = {};
		}

		if (!Ext.isObject(options.params)) {
			options.params = {};
		}

		// Load should always cancel the previous actions.
		if (!Ext.isDefined(options.cancelPreviousRequest)) {
			options.cancelPreviousRequest = true;
		}

		// ignore action type passed in options and instead use action type from config
		Ext.apply(options, {
			actionType: this.actionType
		});

		return Zarafa.common.reminder.data.ReminderStore.superclass.load.call(this, options);
	},

	/**
	 * Event handler will be called when an error/exception is occurred at server side,
	 * and error is returned. The notification method will be changed to avoid more errors.
	 * @param {Zarafa.core.data.MAPIProxy} proxy object that received the error
	 * and which fired exception event.
	 * @param {String} type 'request' if an invalid response from server received,
	 * 'remote' if valid response received from server but with succuessProperty === false.
	 * @param {String} action Name of the action {@link Ext.data.Api.actions}.
	 * @param {Object} options The options for the action that were specified in the request.
	 * @param {Object} response response received from server depends on type.
	 * @param {Mixed} args
	 */
	onError: function(proxy, type, action, options, response, args)
	{
		// if any error occurs in getting reminders then we don't need to nag users by displaying error message
		// every time so we will show the error message once and then use the console notifier for subsequent
		// messages
		if(action === Ext.data.Api.actions.read && !this.originalErrorNotifier) {
			// Store the original notifier so we can restore it later
			this.originalErrorNotifier = container.getSettingsModel().get('zarafa/v1/main/notifier/error/value');
			container.getSettingsModel().set('zarafa/v1/main/notifier/error/value', 'console');

			// Restore the original notifier when everything works again
			this.on('load', function() {
				container.getSettingsModel().set('zarafa/v1/main/notifier/error/value', this.originalErrorNotifier);
				this.originalErrorNotifier = undefined;
			}, this, {single: true});
		}

		// clear the checksum, after getting error we should always show the reminder dialog even if no reminders are changed
		this.lastChecksum = undefined;
	},


	/**
	 * Initialize reminder requests to the server by {@link Ext.TaskMgr.start starting} a task.
	 */
	initializeReminderInterval: function()
	{
		var interval = container.getSettingsModel().get('zarafa/v1/main/reminder/polling_interval');
		this.pollTask = {
			run: this.sendReminderRequest,
			scope: this,
			interval: interval * 1000
		};

		Ext.TaskMgr.start(this.pollTask);
	},

	/**
	 * Function which is called periodically to send a reminder request to the server.
	 * @private
	 */
	sendReminderRequest: function()
	{
		if(!this.showReminderDialog) {
			this.showReminderDialog = true;
		}
		this.load();
	},

	/**
	 * Function will reset reminder request interval.
	 * @private
	 */
	resetReminderInterval: function()
	{
		this.clearReminderInterval();
		this.initializeReminderInterval();
	},

	/**
	 * Function will clear reminder request interval.
	 * @private
	 */
	clearReminderInterval: function()
	{
		Ext.TaskMgr.stop(this.pollTask);
	},

	/**
	 * Function is used as a callback for 'read' action, we have overridden it to
	 * support search also using same 'read' action instead of creating new action.
	 * this will check that if action type is list then will do normal processing and
	 * add {@link Zarafa.core.data.IPMRecords[] records} to {@link Zarafa.core.data.ListModuleStore store}
	 * and if action type is search then it will call {@link #updateSearchInfo} as a callback function.
	 * @param {Object} data data that is returned by the proxy after processing it. will contain
	 * {@link Zarafa.core.data.IPMRecords records}.
	 * @param {Object} options options that are paased through {@link #load} event.
	 * @param {Boolean} success success status of request.
	 */
	loadRecords: function(data, options, success)
	{
		Zarafa.common.reminder.data.ReminderStore.superclass.loadRecords.apply(this, arguments);

		if (success !== false) {
			var records = data.records;
			var newChecksum = Ext.util.JSON.encode(Ext.pluck(records, 'id'));

			// if checksum has been changed that means we should update the store with new data
			if(this.lastChecksum !== newChecksum) {
				var reminderEl = Ext.DomQuery.select('#mainmenu-button-reminder')[0];
				// Update reminder icon with counter.
				if (reminderEl) {
					this.updateReminderIcon(reminderEl, records.length);
				}
				if (this.showReminderDialog) {
					if ( records.length > 0 ) {
						// Emit a notification message. (used by the desktopnotifications plugin)
						var notificationMessage = String.format(ngettext('There is {0} reminder', 'There are {0} reminders', records.length), records.length);
						container.getNotifier().notify('info.reminder', _('Reminders'), notificationMessage);
					}

					Zarafa.common.Actions.openReminderContent(records);
					this.lastChecksum = newChecksum;
				}
			}
		}
	},

	/**
	 * Update the reminder icon when reminder store updated. It will hide the
	 * reminder button and set proper tooltip if reminder store does not contains
	 * any reminders.
	 *
	 * @param {Ext.Element} reminderEl The reminder button element.
	 * @param {Number} recordsLength The number of reminder in reminder store.
	 */
	updateReminderIcon: function(reminderEl, recordsLength)
	{
		var reminderBtn = Ext.get(reminderEl);
		reminderBtn.setStyle('backgroundImage', 'url(\'' + Zarafa.common.ui.IconClass.getReminderSvgIcon(recordsLength) + '\')');
		var reminder = container.getMainPanel().mainTabBar.reminder;
		var noReminder = recordsLength === 0;
		reminder.setDisabled(noReminder);
		reminder.setTooltip(noReminder ? _('There are no reminders') : '');
	},

	/**
	 * Function dismisses the reminder which are passed to the function.
	 * @param {Zarafa.common.reminder.data.ReminderRecord[]} reminderRecords
	 * reminder records which are going to be dismissed
	 * @param {Boolean} openAfterDismiss true if the record is to be opened after dismissal
	 */
	dismissReminders: function(reminderRecords, openAfterDismiss)
	{
		if(!Array.isArray(reminderRecords)){
			reminderRecords = [reminderRecords];
		}

		Ext.each(reminderRecords, function(reminderRecord) {
			reminderRecord.addMessageAction('action_type', 'dismiss');
			if (openAfterDismiss) {
				reminderRecord.addMessageAction('response_action', openAfterDismiss);
			}
		}, this);

		this.remove(reminderRecords);
		this.refreshStore = true;
		this.save(reminderRecords);
	},

	/**
	 * Function will snooze the reminder with the time passed to the function.
	 * @param {Zarafa.common.reminder.data.ReminderRecord[]} reminderRecords
	 * reminder records which are going to be snoozed.
	 * @param {Number} snoozeTime time in minutes, after which reminder will be pop-up again.
	 */
	snoozeReminders: function(reminderRecords, snoozeTime)
	{
		Ext.each(reminderRecords, function(reminderRecord) {
			reminderRecord.addMessageAction('action_type', 'snooze');
			reminderRecord.addMessageAction('snoozeTime', snoozeTime);
		}, this);

		this.remove(reminderRecords);
		this.refreshStore = true;
		this.save(reminderRecords);
	},

	/**
	 * Event handler which is raised when the {@link #write} event has been fired. It will convert the
	 * {@link Zarafa.common.reminder.ReminderRecord ReminderRecord} to an
	 * {@link Zarafa.core.data.IPMRecord IPMRecord} based on its message_class property and then pass that
	 * {@link Zarafa.core.data.IPMRecord IPMRecord} to {@link Zarafa.core.ui.ContentPanel ContentPanel} to open it.
	 * Also, it will send list request for reminders and will reset reminder polling interval.
	 *
	 * @param {Zarafa.core.data.MAPIStore} store The store which fired the event
	 * @param {String} action [Ext.data.Api.actions.create|update|destroy]
	 * @param {Object} result The 'data' picked-out out of the response for convenience
	 * @param {Ext.Direct.Transaction} res The transaction
	 * @param {Record/Record[]} records The records which were written to the server
	 * @private
	 */
	onWrite: function(store, action, result, res, records)
	{
		records = [].concat(records);

		for (var i = 0, len = records.length; i < len; i++) {
			var record = records[i];

			if(record.getMessageAction("action_type") == "dismiss" || record.getMessageAction("action_type") == "snooze") {
				if(this.refreshStore) {
					// We convert the reminder record to IPMRecord and then open it
					if (record.getMessageAction('response_action') === true) {
						record = record.convertToIPMRecord();
						Zarafa.core.data.UIFactory.openViewRecord(record, {});
					}
					// send request to get updated data
					this.sendReminderRequest();

					this.refreshStore = false;
					break;
				}
			}
		}

		Zarafa.common.reminder.data.ReminderStore.superclass.onWrite.apply(this, arguments);
	}
});

Ext.reg('zarafa.reminderstore', Zarafa.common.reminder.data.ReminderStore);
