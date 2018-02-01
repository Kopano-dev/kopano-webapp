Ext.namespace('Zarafa.common.ui');

/**
 * @class Zarafa.common.ui.PreviewPanelToolbarButtons
 * @extends Object
 *
 * Contains special toolbar buttons for the previewpanel.
 */
Zarafa.common.ui.PreviewPanelToolbarButtons = Ext.extend(Object, {
	/**
	 * @cfg {@link Zarafa.core.ContextModel}
	 */
	model : undefined,

	/**
	 * @constructor
	 * @param config Configuration structure
	 */
	constructor : function(config)
	{
		Ext.apply(this, config);
	},

	/**
	 * Function called when insertion point previewpanel.toolbar.right is called,
	 * Function returns configuration object for Copy/Move, Delete and Print buttons
	 * which are added on the right side of previewpanels toolbar.
	 * @param {String} insertionPoint name of the insertion point
	 * @param {Object} options (optional) optional arguments such as scope
	 * @return {Object} Configuration object containing buttons
	 * which are added in the {@link Ext.Toolbar Toolbar}.
	 */
	getToolbarButtons : function(insertionPoint, options)
	{
		// Use model that is passed as arguments for these buttons, if any.
		var model = this.model;
		if(Ext.isDefined(options.model) && options.model instanceof Zarafa.core.ContextModel) {
			model = options.model;
		}

		var toolbarButtons = [];
		toolbarButtons = [{
			xtype: 'zarafa.toolbarbutton',
			tooltip: _('Delete') + ' (DELETE)',
			overflowText: _('Delete'),
			iconCls: 'icon_delete',
			nonEmptySelectOnly: true,
			handler: this.onDelete,
			model: model
		},{
			xtype: 'splitbutton',
			cls: 'zarafa-more-options-btn',
			tooltip: _('More options'),
			overflowText: _('More options'),
			iconCls: 'icon_more',
			nonEmptySelectOnly: true,
			model: model,
			splitOnMoreMenu : true,
			menu : this.moreMenuButtons(model),
			handler: function() {
				this.showMenu();
			}
		}];

		// Display the popout button only if supported.
		if (Zarafa.supportsPopOut()) {
			toolbarButtons.push({
				xtype: 'zarafa.toolbarbutton',
				tooltip: _('Open in new browser window'),
				overflowText: _('Pop-Out'),
				iconCls: 'icon_popout',
				ref: 'popoutBtn',
				nonEmptySelectOnly: true,
				handler: this.onPopout,
				model: model
			});
		}

		return toolbarButtons;
	},

	/**
	 * The menu items of the more button.
	 *
	 * @param {Zarafa.mail.dialogs.ShowMailToolbar} scope The scope for the menu items
	 * @return {Ext.menu.Menu} the dropdown menu for the more button
	 */
	moreMenuButtons : function(model)
	{
		return {
			xtype: 'zarafa.conditionalmenu',
			model: model,
			autoDestroy : false,
			items : [{
				xtype : 'zarafa.conditionalitem',
				text: _('Mark Read'),
				iconCls: 'icon_mail icon_message_read',
				model: model,
				readState: false,
				beforeShow : this.onReadFlagItemBeforeShow,
				ref: 'markRead',
				handler: this.onReadFlagMenuItemClicked
			}, {
				xtype : 'zarafa.conditionalitem',
				text: _('Mark Unread'),
				iconCls: 'icon_mail icon_message_unread',
				model: model,
				readState: true,
				ref: 'markUnread',
				beforeShow : this.onReadFlagItemBeforeShow,
				handler: this.onReadFlagMenuItemClicked
			}, {
				text: _('Copy/Move'),
				iconCls: 'icon_copy',
				model: model,
				handler: this.onCopyMove
			}, {
				text : _('Print'),
				iconCls : 'icon_print',
				model: model,
				handler : this.onPrintButton
			}, {
				text: _('Edit as New Message'),
				iconCls: 'icon_editAsNewEmail',
				ref: 'editAsNew',
				model: model,
				handler: this.onEditAsNewMessage
			}, {
				text: _('Download'),
				iconCls: 'icon_saveaseml',
				ref: 'download',
				model: model,
				handler: this.onDownloadMail
			}],
			listeners: {
				beforeshow : this.onBeforeShowMoreMenu,
				scope: this
			}
		};
	},

	/**
	 * Handler for the beforeshow event of the {#moreMenuButtons more menu}. Will
	 * hide the Download and Edit-As-New buttons for any item that isn't a mail
	 * item And It will show and hide the 'Mark Read' and 'Mark Unread' depends on
	 * record read status.
	 *
	 * @param {Ext.menu.Menu} menu the dropdown menu for the more button
	 */
	onBeforeShowMoreMenu : function (menu)
	{
		var record = menu.model.getPreviewRecord();

		// Show the editAsNew and download buttons only for mail items
		var defaultFolderType = Zarafa.core.MessageClass.getDefaultFolderTypeFromMessageClass(record.get('message_class'));
		menu.editAsNew.setVisible(defaultFolderType === 'inbox');
		menu.download.setVisible(defaultFolderType === 'inbox');
	},


	/**
	 * Event handler which determines if the Read Flag button must be shown.
	 * There are two kind of read flag buttons which can both make use of this
	 * function (Mark as Read and Mark as Unread buttons).
	 *
	 * @param {Zarafa.core.ui.menu.ConditionalItem} item The item to enable/disable
	 * @private
	 */
	onReadFlagItemBeforeShow : function(item)
	{
		var record = item.model.getPreviewRecord();
		var defaultFolderType = Zarafa.core.MessageClass.getDefaultFolderTypeFromMessageClass(record.get('message_class'));
		// show and hide the 'Mark Read' and 'Mark Unread' if record read status is unread or read respectively.
		var isPreviewRecordRead = record.isRead() === item.readState;
		item.setVisible(defaultFolderType === 'inbox' && isPreviewRecordRead);
	},

	/**
	 * Open the {@link Zarafa.common.dialogs.CopyMoveContent CopyMoveContent} for copying
	 * or moving the currently selected records.
	 * @private
	 */
	onCopyMove : function()
	{
		Zarafa.common.Actions.openCopyMoveContent(this.model.getSelectedRecords());
	},

	/**
	 * Delete the currently selected messages. If any of the records is a recurring item,
	 * then the {@link #Zarafa.common.dialogs.MessageBox.select MessageBox} will be used
	 * to select between the recurring and single appointment.
	 * @private
	 */
	onDelete : function()
	{
		Zarafa.common.Actions.deleteRecords(this.model.getSelectedRecords());
	},

	/**
	 * Open the selected record in separate browser window by supplying layer type as "separateWindows".
	 * And if record is opened in {@link Zarafa.core.ui.MainContentTabPanel tab} then close the existing tab.
	 * @private
	 */
	onPopout : function()
	{
		var record = this.model.getPreviewRecord();
		// If record is already opened in tab panel then close the opened tab.
		var tabPanel = container.getTabPanel();
		var openedTab = tabPanel.getOpenedTab(record);
		if (openedTab) {
			tabPanel.getItem(openedTab).close();
		}
		Zarafa.common.Actions.openMessageContent(record, {layerType : 'separateWindows'});
	},

	/**
	 * "Edit as New Message" menuitem of more button handler
	 * @private
	 */
	onEditAsNewMessage : function()
	{
		Zarafa.mail.Actions.openCreateMailResponseContent(this.model.getSelectedRecords(), this.model, Zarafa.mail.data.ActionTypes.EDIT_AS_NEW);
	},

	/**
	 * Click handler for the "Download" menu item of the more button
	 * @private
	 */
	onDownloadMail : function()
	{
		Zarafa.common.Actions.openSaveEmlDialog(this.model.getPreviewRecord());
	},

	/**
	 * Event handler when the "Print" button has been pressed.
	 * This will call the {@link Zarafa.common.Actions#openPrintDialog}.
	 *
	 * @private
	 */
	onPrintButton : function ()
	{
		Zarafa.common.Actions.openPrintDialog(this.model.getPreviewRecord());
	},

	/**
	 * Event handler which is called when the item has been clicked.
	 * This will mark record as read or unread.
	 *
	 * @param {Zarafa.core.ui.menu.ConditionalItem} item The item which has been clicked.
	 * @private
	 */
	onReadFlagMenuItemClicked : function (item)
	{
		var record = this.model.getPreviewRecord();
		Zarafa.common.Actions.markAsRead(record, !item.readState);
		if (!item.isXType('zarafa.conditionalitem')) {
			item.parentMenu.hide(true);
		}
	}
});
