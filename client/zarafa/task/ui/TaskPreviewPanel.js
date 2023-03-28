Ext.namespace('Zarafa.task.ui');

/**
 * @class Zarafa.task.ui.TaskPreviewPanel
 * @extends Ext.Panel
 * @xtype zarafa.taskpreviewpanel
 *
 * Panel that previews the contents of task.
 */
Zarafa.task.ui.TaskPreviewPanel = Ext.extend(Ext.Panel, {
	/**
	 * @constructor
	 * @param {Object} config configuration object.
	 */
	constructor: function(config)
	{
		config = config || {};

		Ext.applyIf(config, {
			xtype: 'zarafa.taskpreviewpanel',
			border: false,
			layout: 'zarafa.collapsible',
			items: [{
				xtype: 'zarafa.messageheader'
			},{
				xtype: 'zarafa.messagebody'
			}]
		});

		Zarafa.task.ui.TaskPreviewPanel.superclass.constructor.call(this, config);
	}
});

Ext.reg('zarafa.taskpreviewpanel', Zarafa.task.ui.TaskPreviewPanel);
