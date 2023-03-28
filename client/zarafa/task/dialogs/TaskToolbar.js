Ext.namespace('Zarafa.task.dialogs');

/**
 * @class Zarafa.task.dialogs.TaskToolbar
 * @extends Zarafa.core.ui.ContentPanelToolbar
 * @xtype zarafa.tasktoolbar
 */
Zarafa.task.dialogs.TaskToolbar = Ext.extend(Zarafa.core.ui.ContentPanelToolbar, {
	// Insertion points for this class
	/**
	 * @insert context.task.taskeditcontentpanel.toolbar.actions
	 * Insertion point for the Actions buttons in the Edit Task Toolbar
	 * @param {Zarafa.task.dialogs.TaskToolbar} toolbar This toolbar
	 */
	/**
	 * @insert context.task.taskeditcontentpanel.toolbar.options
	 * Insertion point for the Options buttons in the Edit Task Toolbar
	 * @param {Zarafa.task.dialogs.TaskToolbar} toolbar This toolbar
	 */

	/**
	 * @constructor
	 * @param config Configuration structure
	 */
	constructor: function(config)
	{
		config = config || {};

		config.plugins = Ext.value(config.plugins, []);
		config.plugins.push('zarafa.recordcomponentupdaterplugin');

		Ext.applyIf(config, {
			insertionPointBase: 'context.task.taskcontentpanel',
			actionItems: this.createActionButtons(),
			optionItems: this.createOptionButtons()
		});

		Zarafa.task.dialogs.TaskToolbar.superclass.constructor.call(this, config);
	},

	/**
	 * Create all buttons which should be added by default to the 'Actions' buttons.
	 * These buttons are used to send, save, add attachments, delete, view the status of the message.
	 * It also contains buttons to check the recipient names.
	 *
	 * @return {Array} The {@link Ext.Button Button} elements which should be
	 * added in the Options section of the {@link Ext.Toolbar Toolbar}.
	 * @private
	 */
	createActionButtons: function()
	{
		return [{
			xtype: 'button',
			text: _('Send'),
			overflowText: _('Send'),
			tooltip: _('Send task to assignees') + ' (Ctrl + Enter)',
			cls: 'zarafa-action',
			iconCls: 'icon_send_white',
			ref: 'sendBtn',
			handler: this.onSendTask,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Save'),
			tooltip: _('Save') + ' (Ctrl + S)',
			iconCls: 'icon_floppy',
			ref: 'saveTaskRequest',
			handler: this.onSave,
			scope: this
		},{
			xtype: 'button',
			ref: 'saveBtn',
			text: _('Save')+' & '+_('Close'),
			overflowText: _('Save')+' & '+_('Close'),
			tooltip: _('Save')+' & '+_('Close') + ' (Ctrl + S)',
			cls: 'zarafa-action',
			iconCls: 'icon_save_white',
			handler: this.onSave,
			scope: this
		},{
			xtype: 'button',
			ref: 'restoreToTaskList',
			text: _('Restore to Task List'),
			overflowText: _('Restore to Task List'),
			hidden: true,
			handler: this.onRestoreToTaskList,
			scope: this
		},{
			xtype: 'button',
			ref: 'deleteBtn',
			overflowText: _('Delete'),
			tooltip: _('Delete this task'),
			iconCls: 'icon_delete',
			handler: this.onDelete,
			scope: this
		},{
			xtype: 'zarafa.attachmentbutton',
			plugins: [ 'zarafa.recordcomponentupdaterplugin' ],
			overflowText: _('Add Attachment'),
			tooltip: _('Add attachments to this task'),
			iconCls: 'icon_paperclip',
			ref: 'attachmentButton',
			// Add a listener to the component added event to set use the correct update function when the toolbar overflows
			// (i.e. is too wide for the panel) and Ext moves the button to a menuitem.
			listeners: {
				added: this.onAttachmentButtonAdded,
				scope: this
			}
		},{
			// Task Accept/Decline buttons.
			xtype: 'zarafa.taskrequestbutton',
			name: Zarafa.task.data.TaskRequestButtonNames.ACCEPT,
			text: _('Accept'),
			iconCls: 'icon_calendar_appt_accept',
			responseStatus: Zarafa.core.mapi.TaskMode.ACCEPT
		},{
			xtype: 'zarafa.taskrequestbutton',
			name: Zarafa.task.data.TaskRequestButtonNames.DECLINE,
			text: _('Decline'),
			iconCls: 'icon_calendar_appt_cancelled',
			responseStatus: Zarafa.core.mapi.TaskMode.DECLINE
		},{
			xtype: 'button',
			ref: 'markCompleteBtn',
			overflowText: _('Mark as Complete'),
			tooltip: _('Mark this task as complete'),
			iconCls: 'icon_task_complete',
			handler: this.onComplete,
			scope: this
		}, {
			xtype: 'button',
			overflowText: _('Print'),
			ref: 'printBtn',
			tooltip: _('Print this task'),
			iconCls: 'icon_print',
			handler: this.onPrint,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Check names'),
			tooltip: _('Check names'),
			iconCls: 'icon_checknames',
			ref: 'checkNamesBtn',
			handler: this.onCheckNames,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Addressbook'),
			tooltip: _('Open addressbook'),
			iconCls: 'icon_small_addressbook',
			ref: 'addressbookBtn',
			handler: function() {
				Zarafa.task.Actions.openRecipientSelectionContent(this.record, {
					defaultRecipientType: Zarafa.core.mapi.RecipientType.MAPI_TO
				});
			},
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
	 * Create all buttons which should be added by default the the `Options` buttons.
	 * This contains the buttons to assign the task and set the task as a recurrence.
	 *
	 * @return {Array} The {@link Ext.Button Button} elements which should be
	 * added in the Options section of the {@link Ext.Toolbar Toolbar}.
	 * @private
	 */
	createOptionButtons: function()
	{
		return [{
			xtype: 'button',
			text: _('Assign Task'),
			overflowText: _('Assign Task'),
			iconCls: 'icon_invite_attendees',
			ref: 'assignTask',
			handler: this.onAssignment,
			scope: this
		},{
			xtype: 'button',
			text: _('Cancel Assignment'),
			overflowText: _('Cancel Assignment'),
			iconCls: 'icon_calendar_appt_cancelled',
			ref: 'cancelAssignmetBtn',
			handler: this.onCancelAssignment,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Categories'),
			tooltip: _('Open the categories dialog'),
			ref: 'categoriesBtn',
			iconCls: 'icon_categories',
			handler: this.onCategories,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Private'),
			tooltip: _('Mark this task as private'),
			iconCls: 'icon_private',
			ref: 'setPrivate',
			enableToggle: true,
			toggleHandler: this.onPrivateGroupToggle,
			scope: this
		},{
			xtype: 'button',
			overflowText: _('Set flag'),
			tooltip: _('Set flag on this email'),
			ref: 'setFlags',
			iconCls: 'icon_flag_red',
			handler: this.onSetFlagButton,
			scope: this
		}];
	},

	/**
	 * Event handler when the "Save" button has been pressed.
	 * This will {@link Zarafa.core.data.RecordContentPanel#saveRecord save} the given record.
	 * it also checks whether the meesage is a meeting, and iff to will send the changes to attendees aswell
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onSave: function(button)
	{
		this.dialog.saveRecord();
	},

	/**
	 * Event handler when the "Check Names" button has been pressed.
	 * This will {@link Zarafa.core.data.IPMRecipient#resolve resolve} all recipients.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onCheckNames: function(button)
	{
		this.record.getRecipientStore().resolve(undefined, { cancelPreviousRequest: true });
	},

	/**
	 * Event handler which is called when the "Recurrence" button has been pressed.
	 * This will open the {@link Zarafa.common.recurrence.dialogs.RecurrenceContentPanel RecurrenceContentPanel}.
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onRecurrence: function(button)
	{
		Zarafa.common.Actions.openRecurrenceContent(this.record, false);
	},

	/**
	 * Event handler when the "Set Flag" button has been pressed.
	 * This will call the {@link Zarafa.task.Actions#openFlagsMenu}.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @param {Ext.EventObject} eventObject event object
	 * @private
	 */
	onSetFlagButton: function (button, eventObject)
	{
		var options = {
			position: eventObject.getXY(),
			shadowEdit: false,
			saveOnSetFlag: false
		};
		Zarafa.task.Actions.openFlagsMenu(this.record, options);
	},

	/**
	 * Event handler which is called when the "Assign Task" button has
	 * been pressed. This will update the "Assiging" state of the record which
	 * will trigger the update of all UI components.
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onAssignment: function(button)
	{
		this.record.beginEdit();
		this.record.set('taskstate', Zarafa.core.mapi.TaskState.OWNER_NEW);
		this.record.set('taskmode', Zarafa.core.mapi.TaskMode.REQUEST);
		this.record.endEdit();
	},

	/**
	 * Event handler which is called when the "Cancel Assignment" button has
	 * been pressed. This will cancel the "assigned" state of the record which
	 * will trigger the update of all UI components.
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onCancelAssignment: function(button)
	{
		this.record.beginEdit();
		this.record.set('taskstate', Zarafa.core.mapi.TaskState.NORMAL);
		this.record.set('taskmode', Zarafa.core.mapi.TaskMode.NOTHING);
		this.record.endEdit();
	},

	/**
	 * Event handler which is is called when the user presses the "Mark as Complete" button.
	 * This will mark the record as "complete".
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onComplete: function(button)
	{
		this.record.beginEdit();
		this.record.set('complete', true);
		this.record.set('percent_complete', 1);
		this.record.set('status', Zarafa.core.mapi.TaskStatus.COMPLETE);
		this.record.set('date_completed', new Date());
		this.record.set('flag_icon', Zarafa.core.mapi.FlagIcon.red);
		this.record.set('flag_complete_time', new Date());
		this.record.set('flag_request', '');
		this.record.set('flag_status', Zarafa.core.mapi.FlagStatus.completed);
		this.record.endEdit();

		/**
		 * Send request for saving the record as after marking task as complete
		 * it should save all the properties and close the dialog.
		 */
		this.dialog.saveRecord();
	},

	/**
	 * Event handler which is called when the user pressed the 'Restore to task List' button.
	 * this will convert the assigned task to {@link Zarafa.core.mapi.TaskState#OWNER_NEW Normal task}.
	 *
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onRestoreToTaskList: function (button)
	{
		var record = this.record;
		record.beginEdit();
		record.addMessageAction("action_type", "restoreToTaskList");
		record.set('taskstate', Zarafa.core.mapi.TaskState.OWNER_NEW);
		record.set('taskmode', Zarafa.core.mapi.TaskMode.NOTHING);
		record.set('taskhistory', Zarafa.core.mapi.TaskHistory.NONE);
		record.set('ownership', Zarafa.core.mapi.TaskOwnership.NEWTASK);
		record.set('icon_index', Zarafa.core.mapi.IconIndex['task']);
		record.set('updatecount', 2);
		record.set('taskfcreator', true);
		record.set('tasklastdelegate', '');
		record.set('tasklastuser', '');
		record.set('subject', record.get('conversation_topic'));
		var store = container.getHierarchyStore().getById(record.get('store_entryid'));
		if (store) {
			record.set('owner', store.get('display_name'));
		}
		record.getRecipientStore().removeAll();
		record.endEdit();
		record.save();
	},

	/**
	 * Event handler which is called when the user pressed the 'Categories' button.
	 * This will open the {@link Zarafa.common.categories.dialogs.CategoriesContentPanel CategoriesContentPanel}.
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onCategories: function(button)
	{
		Zarafa.common.Actions.openCategoriesContent(this.record, {autoSave: false});
	},

	/**
	 * Event handler which is called when the user pressed the 'Delete' button.
	 * This will call {@link Zarafa.core.ui.RecordContentPanel#deleteRecord} to delete the record
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onDelete: function(button)
	{
		this.dialog.deleteRecord();
	},
	/**
	 * Event handler which is called when the user pressed the 'Print' button.
	 * This will call {@link Zarafa.common.Actions.openPrintDialog} to print the record
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onPrint: function()
	{
		Zarafa.common.Actions.openPrintDialog(this.record);
	},
	/**
	 * Event handler which is called when the PrivateGroup button
	 * has been toggled. If this is the case 'private' is updated.
	 *
	 * @param {Ext.Button} button The button which was toggled
	 * @private
	 */
	onPrivateGroupToggle: function(button)
	{
		this.record.beginEdit();
		this.record.set('private', button.pressed);
		if (button.pressed) {
			this.record.set('sensitivity', Zarafa.core.mapi.Sensitivity['PRIVATE']);
		} else {
			this.record.set('sensitivity', Zarafa.core.mapi.Sensitivity['NONE']);
		}
		this.record.endEdit();
	},

	/**
	 * Updates the toolbar by updating the Toolbar buttons based on the settings
	 * from the {@link Zarafa.core.data.IPMRecord record}.
	 *
	 * @param {Zarafa.core.data.IPMRecord} record The record update the panel with.
	 * @param {Boolean} contentReset force the component to perform a full update of the data.
	 */
	update: function(record, contentReset)
	{
		var layout = false;

		this.record = record;

		if(record.isSubMessage()) {
			this.deleteBtn.setVisible(false);
			this.sendBtn.setVisible(false);
			this.saveTaskRequest.setVisible(false);
			this.saveBtn.setVisible(false);
			this.checkNamesBtn.setVisible(false);
			this.addressbookBtn.setVisible(false);
			this.restoreToTaskList.setVisible(false);
			this.assignTask.setVisible(false);
			this.cancelAssignmetBtn.setVisible(false);
			this.markCompleteBtn.setVisible(false);
			this.setPrivate.setVisible(false);

			layout = true;
		} else {
			// Task which received by assignee and currently not accepted or decline the task.
			var isReceivedTask = record.isTaskReceived() && record.isTaskOwner() && !record.isTaskAccepted() && !record.isTaskUpdated();
			// isTaskDecline gets true if task state is Zarafa.core.mapi.TaskState.DECLINE;
			var isTaskDecline = record.get('taskstate') === Zarafa.core.mapi.TaskState.DECLINE;
			var isDelegatedTask = record.isTaskDelegated();
			var isModifiedTaskMode = record.isModified('taskmode');

			this.saveBtn.setVisible(!isDelegatedTask && !isTaskDecline && !isReceivedTask && !record.isTaskRequest());
			if(!isModifiedTaskMode) {
				var visible = false;
				if (record.isTaskReceived()) {
					if (record.get('task_not_found')) {
						visible = false;
					} else if(record.isTaskAccepted() || record.isTaskUpdated()) {
						visible = true;
					}
				} else if (record.isDraftAssignedTask() || record.isNormalTask()) {
					visible = true;
				}

				this.setFlags.setVisible(visible);
				this.categoriesBtn.setVisible(visible);
				this.markCompleteBtn.setVisible(visible);
				this.setPrivate.setVisible(visible);
				this.attachmentButton.setVisible(visible);
				this.printBtn.setVisible(!isReceivedTask);
			}
			this.restoreToTaskList.setVisible(record.isTaskOrganized() && isTaskDecline);
			if ( this.restoreToTaskList.isVisible() ) {
				this.restoreToTaskList.getEl().addClass('zarafa-action');
			}
			if (isReceivedTask) {
				this.deleteBtn.setVisible(isDelegatedTask);
			} else {
				// Only enable Disabled button when it is not a phantom
				this.deleteBtn.setDisabled(record.phantom === true);
			}

			if (contentReset === true || record.isModifiedSinceLastUpdate('complete')) {
				this.markCompleteBtn.setDisabled(record.get('complete'));
			}

			if (contentReset === true || record.isModifiedSinceLastUpdate('private')) {
				this.setPrivate.toggle(record.get('private'), true);
			}

			if (contentReset === true || isModifiedTaskMode) {
				switch (record.get('taskmode')) {
				case Zarafa.core.mapi.TaskMode.REQUEST:
					var isTaskRequestInstance = record instanceof Zarafa.task.TaskRequestRecord;
					var isVisible = (!record.isTaskDelegated() && !isTaskRequestInstance) || record.get('taskstate') === Zarafa.core.mapi.TaskState.OWNER_NEW;

					this.sendBtn.setVisible(isVisible);
					this.saveTaskRequest.setVisible(isVisible);
					this.saveBtn.setVisible(false);
					this.checkNamesBtn.setVisible(isVisible);
					this.addressbookBtn.setVisible(isVisible);
					this.assignTask.setVisible(false);
					this.cancelAssignmetBtn.setVisible(isVisible);
					break;
				case Zarafa.core.mapi.TaskMode.NOTHING:
				/* falls through */
				default:
					this.sendBtn.setVisible(false);
					this.saveTaskRequest.setVisible(false);
					this.checkNamesBtn.setVisible(false);
					this.addressbookBtn.setVisible(false);
					this.assignTask.setVisible(record.isNormalTask());
					this.cancelAssignmetBtn.setVisible(false);
					break;
				}

				layout = true;
			}

			if (!contentReset && record.isModifiedSinceLastUpdate('taskmode')) {
				layout = true;
			}

			if(!contentReset
				&& record.isModifiedSinceLastUpdate('taskhistory')
				&& record.get('taskhistory') === Zarafa.core.mapi.TaskHistory.NONE) {
				this.assignTask.setVisible(record.isNormalTask());
			}
		}

		if(layout) {
			this.doLayout();
		}
	},

	/**
	 * Send the {@link Zarafa.core.data.IPMRecord record} to the recipient
	 * @param {Ext.Button} button The button which has been pressed
	 * @private
	 */
	onSendTask: function(button)
	{
		this.dialog.sendRecord();
	}

});

Ext.reg('zarafa.tasktoolbar', Zarafa.task.dialogs.TaskToolbar);
