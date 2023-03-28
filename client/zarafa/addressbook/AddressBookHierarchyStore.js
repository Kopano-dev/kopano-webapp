/*
 * #dependsFile client/zarafa/addressbook/AddressBookHierarchyProxy.js
 */
Ext.namespace('Zarafa.addressbook');

/**
 * @class Zarafa.addressbook.AddressBookHierarchyStore
 * @extends Zarafa.core.data.ListModuleStore
 * @xtype zarafa.addressbookhierarchystore
 * this will contain all records {@link Zarafa.addressbook.AddressbookHierchyRecord}
 * fetched from the server side, stores all available addressbooks from all
 * available server side MAPI stores
 */
Zarafa.addressbook.AddressBookHierarchyStore = Ext.extend(Zarafa.core.data.ListModuleStore, {
	/**
	 * @constructor
	 * @param config Configuration structure
	 */
	constructor: function(config)
	{
		config = config || {};

		Ext.applyIf(config, {
			preferredMessageClass: 'addressbook',
			standalone: true,
			proxy: new Zarafa.addressbook.AddressBookHierarchyProxy(),
			sortInfo: {
				field: 'display_name',
				direction: 'desc'
			}
		});

		Zarafa.addressbook.AddressBookHierarchyStore.superclass.constructor.call(this, config);
	},

	/**
	 * Compare a {@link Ext.data.Record#id ids} to determine if they are equal.
	 * This will apply the {@link Zarafa.core.EntryId#compareABEntryIds compareABEntryIds} function
	 * on both ids, as all records in this store will have a Address Book EntryId as unique key.
	 * @param {String} a The first id to compare
	 * @param {String} b The second id to compare
	 * @protected
	 */
	idComparison: function(a, b)
	{
		return Zarafa.core.EntryId.compareABEntryIds(a, b);
	},

	/**
	 * Function which is use to load {@link Zarafa.addressbook.AddressBookHierarchyStore store}
	 */
	loadAddressBookHierarchy: function ()
	{
		Zarafa.addressbook.AddressBookHierarchyStore.load({
			actionType: Zarafa.core.Actions.list,
			params: {
				subActionType: Zarafa.core.Actions.hierarchy,
				gab: 'all'
			}
		});
	},

	/**
	 * Notification handler called by {@link #onNotify} when
	 * a {@link Zarafa.core.data.Notifications#objectModified objectModified}
	 * notification has been received.
	 *
	 * This will update the address book hierarchy store
	 *
	 * @param {Zarafa.core.data.Notifications} action The notification action
	 * @param {Ext.data.Record/Array} records The record or records which have been affected by the notification.
	 * @param {Object} data The data which has been received from the PHP-side which must be applied
	 * to the given records.
	 * @param {Number} timestamp The {@link Date#getTime timestamp} on which the notification was received
	 * @param {Boolean} success The success status, True if the notification was successfully received.
	 * @private
	 */
	onNotifyObjectmodified: function(action, records, data, timestamp, success)
	{
		this.loadAddressBookHierarchy();
	}
});

Ext.reg('zarafa.addressbookhierarchystore', Zarafa.addressbook.AddressBookHierarchyStore);

Zarafa.onUIReady(function(){
	// Make a singleton of the address book store and load it immediately
	// Note: The typeof check is necessary for the js tests
	if ( typeof Zarafa.addressbook.AddressBookHierarchyStore === 'function' ){
		Zarafa.addressbook.AddressBookHierarchyStore = new Zarafa.addressbook.AddressBookHierarchyStore();
		Zarafa.addressbook.AddressBookHierarchyStore.on('load', function(){
			// Add a property to identify group headers and remove group headers that don't
			// have any group members (e.g. All Address Lists)
			var removeRecords = [];
			Zarafa.addressbook.AddressBookHierarchyStore.each(function(record, index){
				// The GAB has index 0
				if ( index>0 && record.get('depth')===0 ){
					if (
						index === Zarafa.addressbook.AddressBookHierarchyStore.getCount() ||
						Zarafa.addressbook.AddressBookHierarchyStore.getAt(index+1).get('depth') === 0
					){
						removeRecords.push(record);
					} else {
						record.set('group_header', true);
					}
				} else {
					record.set('group_header', false);
				}
			});

			Ext.each(removeRecords, function(record){
				Zarafa.addressbook.AddressBookHierarchyStore.remove(record);
			});
		});

		Zarafa.addressbook.AddressBookHierarchyStore.loadAddressBookHierarchy();
	}
});
