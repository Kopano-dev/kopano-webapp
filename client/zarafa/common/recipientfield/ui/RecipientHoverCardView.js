Ext.namespace('Zarafa.common.recipientfield.ui');

/**
 * @class Zarafa.common.recipientfield.ui.RecipientHoverCardView
 * @extends Ext.Window
 * @xtype zarafa.recipienthovercardview
 *
 * This component will show quick view of recipient as an recipient hover panel.
 * It will show/hide card view when recipient field gets mouseenter/mouseleave.
 */
Zarafa.common.recipientfield.ui.RecipientHoverCardView = Ext.extend(Ext.Window, {
	// Insertion points for this class
	/**
	 * @insert context.common.recipientfield.hovercardview.actions
	 * @param {Zarafa.common.recipientfield.ui.RecipientHoverCardView} recipienthovercardview This hover card view
	 */

	/**
	 * @cfg {Boolean} editable
	 * False to prevent any button to edit the record on which this card is shown.
	 */
	editable: true,

	/**
	 * @cfg {Boolean} hasFocus true to recipient card view has focus, false otherwise
	 */
	hasFocus: false,

	/**
	 * @cfg {Zarafa.common.ui.messagepanel.RecipientLinks | Zarafa.common.ui.messagepanel.SentInfoLinks} recipient
	 * component for which hover card will show.
	 */
	recipientView: undefined,

	/**
	 * @cfg {Number} maximum length of text allowed after truncations,
	 * truncation will be replaced with ellipsis ('...').
	 */
	ellipsisStringEndLength: 30,

	/**
	 * @constructor
	 * @param {Object} config Configuration object
	 */
	constructor: function (config)
	{
		config = config || {};

		if (config.records) {
			if (Array.isArray(config.records)) {
				config.records = config.records[0];
			}
		}

		config = Ext.applyIf(config, {
			frame: false,
			hidden: false,
			closable: false,
			resizable: false,
			cls: 'k-recipient-card-view',
			layout: {
				type: 'hbox',
				align: 'stretch'
			},
			width: 340,
			height: 130,
			border: false,
			items: this.getHoverCardItems(config),
			buttonAlign: 'left',
			buttons: this.getHoverCardButtons(config.records)
		});

		Zarafa.common.recipientfield.ui.RecipientHoverCardView.superclass.constructor.call(this, config);
	},

	/**
	 * Initialize the component.
	 * This will register the card view window and window resize event.
	 * @private
	 */
	initComponent: function ()
	{
		Ext.EventManager.onWindowResize(this.hide, this);
		Ext.WindowMgr.register(this);
		if (this.recipientView) {
			this.recipientView.on('mouseleave', this.onRecipientMouseLeave, this, {
				buffer: 100
			});
		}
		Zarafa.common.recipientfield.ui.RecipientHoverCardView.superclass.initComponent.call(this);
	},

	/**
	 * Helper function which will return hover card items.
	 * @param {Object} config The config object contains the record which going to show in hover card.
	 * @return {Array} items The hover card items.
	 */
	getHoverCardItems: function (config)
	{
		var record = config.records;
		var emailAddress = record.get('smtp_address') || record.get('email_address');
		var toolTip = emailAddress.length > this.ellipsisStringEndLength ? emailAddress : '';
		return [{
			layout: {
				type: 'vbox'
			},
			border: false,
			width: 70,
			items: [{
				xtype: 'container',
				html: this.getImageOrInitials(record)
			}]
		}, {
			layout: {
				type: 'vbox'
			},
			border: false,
			cls: 'k-hover-card-recipient-detail-panel',
			items: [{
				xtype: 'displayfield',
				html: this.getDisplayName(record)
			}, {
				layout: {
					type: 'hbox'
				},
				width: 255,
				height: 70,
				border: false,
				items: [{
					xtype: 'displayfield',
					value: Ext.util.Format.ellipsis(emailAddress, this.ellipsisStringEndLength),
					cls: 'k-hover-card-email-text',
					tooltip: toolTip,
					plugins: 'zarafa.formfieldtooltipplugin'
				}, {
					xtype: 'zarafa.recipienthovercardbutton',
					iconCls: 'icon_copy',
					hidden: !record.isResolved(),
					handler: this.copyEmail,
					tooltip: _('Copy email address'),
					scope: this
				}, {
					xtype: 'zarafa.recipienthovercardbutton',
					iconCls: 'icon_copy_all',
					hidden: this.hideButton(config.store, record),
					handler: this.copyEmail,
					name: 'copyEmailAddresses',
					tooltip: _('Copy all email addresses'),
					scope: this
				}]
			}]
		}];
	},

	/**
	 * Helper function which used to hide the 'Copy email addresses' button from hover card if selected recipient was not resolved
	 * or only one recipient is in selected field (TO, Cc or Bcc).
	 *
	 * @param {Ext.data.Store} store The store can be {@link Zarafa.common.ui.messagepanel.RecipientLinks RecipientLinks} or
	 * {@link Zarafa.common.ui.messagepanel.SentInfoLinks SentInfoLinks}.
	 * @param {Ext.data.Record} record which will show in hover card view.
	 * @return {Boolean} return true if selected recipient is not resolved or field has only one recipient else false.
	 */
	hideButton: function(store, record)
	{
		if (!record.isResolved() || store.getCount() <= 1) {
			return true;
		}

		var recipients = Zarafa.common.Actions.getRecipientsByType(store, record.get('recipient_type'));
		return recipients.length === 1;
	},

	/**
	 * Helper function which will return array of
	 * @param {Ext.data.Record} record which will show in hover card view.
	 * @return {Array} items array of button for hover card view.
	 */
	getHoverCardButtons: function (record)
	{
		return [{
			xtype: 'zarafa.recipienthovercardbutton',
			text: _('Show Details'),
			iconCls: 'icon_contact',
			hidden: !record.isResolved(),
			handler: this.openDetailsContent,
			scope: this
		}, '->', container.populateInsertionPoint('context.common.recipientfield.hovercardview.actions', this), {
			xtype: 'zarafa.recipienthovercardbutton',
			iconCls: 'icon_new_email',
			handler: this.onEmailRecipient,
			tooltip: _('Send email'),
			scope: this
		}];
	},

	/**
	 * Displays this card at a specific xy position and fires the 'show' event if a
	 * handler for the 'beforeshow' event does not return false cancelling the operation.
	 * @param {Array} xy Contains X & Y [x, y] values for the position at which to show the menu (coordinates are page-based)
	 */
	showAt: function (xy)
	{
		if (this.fireEvent('beforeshow', this) !== false) {
			if (!this.el) {
				this.render(Ext.getBody());
			}
			//constrain to the viewport.
			xy = this.el.adjustForConstraints(xy);
			this.el.setXY(xy);
			this.el.show();
			this.focus();
			this.fireEvent('show', this);
			this.mon(this.el, 'mouseleave', this.onMouseLeave, this);
			this.mon(this.el, 'mouseenter', this.onMouseEnter, this);
		}
	},

	/**
	 * Hide the card view and unregister the card view window.
	 */
	hide: function ()
	{
		this.hasFocus = false;
		this.recipientView.un('mouseleave', this.onRecipientMouseLeave, this);
		Zarafa.common.recipientfield.ui.RecipientHoverCardView.superclass.hide.call(this);
		Ext.WindowMgr.unregister(this);
	},

	/**
	 * Event handler handel mouse leave event it will hide recipient card view
	 */
	onMouseLeave: function ()
	{
		this.hide();
	},

	/**
	 * Event handler which is call when mouse leave event occur on {@link #recipientView}
	 * It will hide recipient card view.
	 */
	onRecipientMouseLeave: function ()
	{
		if (!this.hasFocus) {
			this.hide();
		}
	},

	/**
	 * Event handler handel mouse enter event it will update {@link #hasFocus}.
	 */
	onMouseEnter: function ()
	{
		this.hasFocus = true;
	},

	/**
	 * Handler for the "Show Details" option. This will convert
	 * the {@link Zarafa.core.data.IPMRecipientRecord recipient}
	 * into a {@link Zarafa.core.data.MAPIRecord addressbook record}
	 * which can be opened in the Addressbook details content panel.
	 *
	 * @private
	 */
	openDetailsContent: function()
	{
		Zarafa.common.Actions.openViewRecipientContent(this.records);
	},

	/**
	 * Handler for the "Copy email address" and 'Copy email addresses' option. This will
	 * copy email address(es) of the resolved recipient(s).
 	 * @param {Zarafa.common.recipientfield.ui.RecipientHoverCardButton} item The item can be
	 * 'Copy email address' or 'Copy email addresses' button in hover card.
	 */
	copyEmail: function (item)
	{
		var copyAll = item.name === 'copyEmailAddresses';
		Zarafa.common.Actions.copyEmailAddress(this.records, this.store, copyAll);
	},

	/**
	 * Handler for the "Email Recipient" option. This will create
	 * a new {@link Zarafa.core.data.MAPIRecord mail record}
	 * and generate new phantom recipient for new mail. Then
	 * it will open a new MailCreate ContentPanel for the new mail
	 *
	 * @private
	 */
	onEmailRecipient: function()
	{
		Zarafa.common.Actions.onEmailRecipient(this.records);
	},

	/**
	 * Function will return html template that contain display name along with presence status.
	 * @param {Ext.data.Record} record which will show in hover card view.
	 * @returns {string} html string contains display name with presence status.
	 */
	getDisplayName: function (record)
	{
		return '<span class="zarafa-presence-status ' + Zarafa.core.data.PresenceStatus.getCssClass(record.get('presence_status')) + '">' +
			' <span class="zarafa-presence-status-icon"></span>' + Ext.util.Format.ellipsis(record.get('display_name'), 30) + '</span>';
	},

	/**
	 * Function will return html template that contains the sender user's image or initials.
	 * @param {Ext.data.Record} record which will show in hover card view.
	 * @returns {string} html string which contains the initials of a sender.
	 */
	getImageOrInitials: function(record)
	{
		var senderUserImage = record.get('user_image');
		if (Ext.isEmpty(senderUserImage)) {
			return '<span class="preview-header-sender-initial">'+ record.getSenderInitials() +'</span>';
		}
		
		return '<span class="preview-header-sender-image" style ="background-image:url('+ senderUserImage +');"></span>';
	}
});

Ext.reg('zarafa.recipienthovercardview', Zarafa.common.recipientfield.ui.RecipientHoverCardView);
