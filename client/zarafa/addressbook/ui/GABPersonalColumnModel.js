/*
 * #dependsFile client/zarafa/common/ui/grid/Renderers.js
 */
Ext.namespace('Zarafa.addressbook.ui');

/**
 * @class Zarafa.addressbook.ui.GABPersonalColumnModel
 * @extends Zarafa.common.ui.grid.ColumnModel
 *
 * Column model which should be used in the Global Addressbook for
 * personal folders.
 */
Zarafa.addressbook.ui.GABPersonalColumnModel = Ext.extend(Zarafa.common.ui.grid.ColumnModel, {

	/**
	 * @constructor
	 * @param {Object} config Configuration option
	 */
	constructor: function(config)
	{
		config = config || {};

		Ext.applyIf(config, {
			name: 'personal_contacts',

			columns: [{
				dataIndex: 'icon_index',
				headerCls: 'zarafa-icon-column',
				header: '<p class="icon_index">&nbsp;</p>',
				sortable: true,
				tooltip: _('Sort by: Icon'),
				width: 25,
				fixed: true,
				renderer: Zarafa.common.ui.grid.Renderers.icon
			},{
				dataIndex: 'full_name',
				// gridPanel.autoExpandColumn config will reference to this id
				id: 'full_name',
				header: _('Name'),
				sortable: true,
				tooltip: _('Sort by: Name'),
				renderer: Ext.util.Format.htmlEncode
			},{
				dataIndex: 'display_name',
				header: _('Display Name'),
				sortable: true,
				tooltip: _('Sort by: Display Name'),
				renderer: Ext.util.Format.htmlEncode,
				width: 250
			},{
				dataIndex: 'fileas',
				header: _('File as'),
				sortable: true,
				hidden: true,
				tooltip: _('Sort by: File As'),
				renderer: Ext.util.Format.htmlEncode,
				width: 250
			},{
				dataIndex: 'email_address',
				header: _('Email Address'),
				sortable: true,
				hidden: false,
				tooltip: _('Sort by: Email Address'),
				renderer: Ext.util.Format.htmlEncode,
				width: 400
			}]
		});

		Zarafa.addressbook.ui.GABPersonalColumnModel.superclass.constructor.call(this, config);
	}
});
