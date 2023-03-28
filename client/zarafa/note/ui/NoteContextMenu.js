Ext.namespace('Zarafa.note.ui');

/**
 * @class Zarafa.note.ui.NoteContextMenu
 * @extends Zarafa.core.ui.menu.ConditionalMenu
 * @xtype zarafa.notecontextmenu
 */
Zarafa.note.ui.NoteContextMenu = Ext.extend(Zarafa.core.ui.menu.ConditionalMenu, {
	// Insertion points for this class
	/**
	 * @insert context.note.contextmenu.actions
	 * Insertion point for adding actions menu items into the context menu
	 * @param {Zarafa.note.ui.NoteContextMenu} contextmenu This contextmenu
	 */
	/**
	 * @insert context.note.contextmenu.options
	 * Insertion point for adding options menu items into the context menu
	 * @param {Zarafa.note.ui.NoteContextMenu} contextmenu This contextmenu
	 */

	/**
	 * @cfg {Zarafa.core.data.IPMRecord[]} The records on which this context menu acts
	 */
	records: undefined,

	/**
	 * @constructor
	 * @param {Object} config Configuration object
	 */
	constructor: function(config)
	{
		config = config || {};

		if (config.records) {
			if (!Array.isArray(config.records)) {
				config.records = [ config.records ];
			}
		}

		Ext.applyIf(config, {
			items: [
				this.createContextActionItems(config.records),
				{ xtype: 'menuseparator' },
				container.populateInsertionPoint('context.note.contextmenu.actions', this),
				{ xtype: 'menuseparator' },
				container.populateInsertionPoint('context.note.contextmenu.options', this)
			],
			defaults: {
				xtype: 'zarafa.conditionalitem',
				hideOnDisabled: false
			}
		});

		Zarafa.note.ui.NoteContextMenu.superclass.constructor.call(this, config);
	},

	/**
	 * Create the Action context menu items
	 * @param {Zarafa.core.data.IPMRecord{}} The records on which this menu acts
	 * @return {Zarafa.core.ui.menu.ConditionalItem[]} The list of Action context menu items
	 * @private
	 */
	createContextActionItems: function(records)
	{
		return [{
			text: _('Open'),
			iconCls: 'icon_open',
			scope: this,
			handler: this.onContextItemOpen,
			singleSelectOnly: true
		}, {
			text: _('Copy/Move'),
			iconCls: 'icon_copy',
			scope: this,
			handler: this.onCopyMove
		}, {
			text: _('Print'),
			iconCls: 'icon_print',
			scope: this,
			handler: this.onContextItemPrint,
			singleSelectOnly: true
		}, {
			xtype: 'menuseparator'
		}, {
			text: _('Categories'),
			cls: 'k-unclickable',
			iconCls: 'icon_categories',
			hideOnClick: false,
			menu: {
				xtype: 'zarafa.categoriescontextmenu',
				records: records
			}
		}, {
			xtype: 'menuseparator'
		}, {
			text: _('Delete'),
			iconCls: 'icon_delete',
			scope: this,
			handler: this.onContextItemDelete
		}];
	},

	/**
	 * Open the {@link Zarafa.common.dialogs.CopyMoveContentPanel CopyMoveContentPanel} for copying
	 * or moving the currently selected notes.
	 * @private
	 */
	onCopyMove: function()
	{
		Zarafa.common.Actions.openCopyMoveContent(this.records);
	},

	/**
	 * Event handler which is called when the user selects the 'Open'
	 * item in the context menu. This will open the item in a new dialog.
	 * @private
	 */
	onContextItemOpen: function()
	{
		Zarafa.note.Actions.openNoteContent(this.records);
	},

	/**
	 * Event handler which is called when the user selects the 'Email message'
	 * item in the context menu. This will open a new mail dialog.
	 * @private
	 */
	onContextItemEmail: function()
	{
		Zarafa.note.Actions.openNoteEmailContent(this.records);
	},

	/**
	 * Event handler which is called when the user selects the 'Categories'
	 * item in the context menu. This will open {@link Zarafa.common.categories.dialogs.CategoriesContentPanel CategoriesContentPanel}.
	 * @private
	 */
	onContextItemCategories: function()
	{
		Zarafa.common.Actions.openCategoriesContent(this.records);
	},

	/**
	 * Event handler which is called when the user selects the 'Categories'
	 * item in the context menu. This will open {@link Zarafa.common.dialogs.CategoriesContentPanel CategoriesContentPanel}.
	 * @private
	 */
	onContextItemPrint: function()
	{
		Zarafa.common.Actions.openPrintDialog(this.records);
	},

	/**
	 * Event handler which is called when the user selects the 'Delete'
	 * item in the context menu. This will delete selected notes from view.
	 * @private
	 */
	onContextItemDelete: function()
	{
		Zarafa.common.Actions.deleteRecords(this.records);
	}
});

Ext.reg('zarafa.notecontextmenu', Zarafa.note.ui.NoteContextMenu);
