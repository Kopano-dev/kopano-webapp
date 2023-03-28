Ext.namespace('Zarafa.hierarchy');

/**
 * @class Zarafa.hierarchy.Actions
 * Hierarchy actions which can be used within {@link Ext.Button buttons}
 * or other {@link Ext.Component components} with action handlers.
 * @singleton
 */
Zarafa.hierarchy.Actions = {
	/**
	 * Open the folder. This will check if the user has rights to open
	 * the given folder, and will call {@link Zarafa.core.Container#selectFolder}
	 * if that is the case. Otherwise if this is a shared store, it will ask
	 * if the store can be closed.
	 * @param {Zarafa.hierarchy.data.MAPIFolderRecord[]} folders folders to open either as an array of
	 * {@link Zarafa.hierarchy.data.MAPIFolderRecord MAPIFolder} objects or a single object.
	 */
	openFolder: function(folders)
	{
		var folder = Ext.isArray(folders) ? folders[0] : folders;
		// FIXME: We should determine which accessflag we exactly need
		// and check for that flag.
		if (folder.get('access') !== 0) {
			if (folder.isSearchFolder()) {
				var componentType = Zarafa.core.data.SharedComponentType['common.search'];
				Zarafa.core.data.UIFactory.openLayerComponent(componentType, [], {
					'searchFolder': folder,
					'title': folder.get("display_name")
				});
			} else {
				container.selectFolder(folders);
			}
		} else if (folder.isIPMSubTree() || folder.isSharedFolder()) {
			Ext.MessageBox.show({
				title: _('Insufficient permissions'),
				msg: (folder.isIPMSubTree() ?
					_('Not enough permissions to open this store, do you want to remove it from the hierarchy?'):
					_('Not enough permissions to open this folder, do you want to remove it from the hierarchy?')),
				buttons: Ext.MessageBox.YESNO,
				fn: this.onFolderPermissionBox,
				scope: folder
			});
		} else {
			Ext.MessageBox.show({
				title: _('Insufficient Permissions'),
				msg: _('Not enough permissions to open this folder.'),
				buttons: Ext.MessageBox.OK
			});
		}
	},

	/**
	 * Event handler for the {@link Ext.MessageBox#show} which was opened by {@link #openFolder}.
	 * If the "yes" button was pressed, then the folder (the 'this' context for this function)
	 * will be removed from the hierarchy.
	 * @param {String} button The button which was pressed by the user
	 * @private
	 */
	onFolderPermissionBox: function(button)
	{
		if (button === 'yes') {
			if (this.isIPMSubTree()) {
				var store = container.getHierarchyStore();
				var mapistore = this.getMAPIStore();

				store.remove(mapistore);
				store.save(mapistore);
			} else {
				var store = this.store;

				store.remove(this);
				store.save(this);
			}
		}
	},

	/**
	 * Open a {@link Zarafa.common.dialogs.CreateFolderContent CreateFolderContent} for
	 * creating a new folder in the hierarchy.
	 * @param {Zarafa.hierarchy.data.MAPIFolderRecord} parentFolder The parent folder underneath the new
	 * folder must be created by default.
	 * @param {Object} config (optional) Configuration object for opening the ContentPanel
	 */
	openCreateFolderContent: function(parentFolder, config)
	{
		if (!Ext.isDefined(parentFolder)) {
			// Find parentFolder based on currentContext opened
			parentFolder = container.getHierarchyStore().getDefaultFolder(container.getCurrentContext().getName());

			// Still not found then get default 'Inbox' folder
			if (!Ext.isDefined(parentFolder)) {
				parentFolder = container.getHierarchyStore().getDefaultFolder('inbox');
			}
		}

		// create new folderrecord and set 'parent_entryid'
		var record = Zarafa.core.data.RecordFactory.createRecordObjectByObjectType(Zarafa.core.mapi.ObjectType.MAPI_FOLDER, {
			'parent_entryid': parentFolder.get('entryid'),
			'store_entryid': parentFolder.get('store_entryid')
		});
		config = Ext.applyIf(config || {}, { parentFolder: parentFolder, manager: Ext.WindowMgr });
		Zarafa.core.data.UIFactory.openCreateRecord(record, config);
	},

	/**
	 * Opens a {@link Zarafa.hierarchy.dialogs.FolderPropertiesContentPanel FolderPropertiesContentPanel}
	 *
	 * @param {Zarafa.core.data.IPFRecord} record describing folder
	 * @param {Object} config (optional) Configuration object for creating the ContentPanel
	 */
	openFolderPropertiesContent: function(folder, config)
	{
		var componentType = Zarafa.core.data.SharedComponentType['hierarchy.dialog.folderproperties'];
		config = Ext.applyIf(config || {}, {
			manager: Ext.WindowMgr
		});
		Zarafa.core.data.UIFactory.openLayerComponent(componentType, folder, config);
	},

	/**
	 * Opens a {@link Zarafa.hierarchy.dialogs.FolderSizeContentPanel FolderSizeContentPanel}
	 *
	 * @param {Zarafa.core.data.IPFRecord} record describing folder
	 * @param {Object} config (optional) Configuration object for creating the ContentPanel
	 */
	openFolderSizeContent: function(folder, config)
	{
		var componentType = Zarafa.core.data.SharedComponentType['hierarchy.dialog.foldersize'];
		config = Ext.applyIf(config || {}, {
			manager: Ext.WindowMgr
		});
		Zarafa.core.data.UIFactory.openLayerComponent(componentType, folder, config);
	},

	/**
	 * Opens a {@link Zarafa.hierarchy.dialogs.SharedFolderContentPanel SharedFolderContentPanel}
	 *
	 * @param {Zarafa.hierarchy.data.SharedFolderTypes} defaultSelectedFolderType default selected folder in combolist.
	 * @param {Object} config (optional) Configuration object for creating the ContentPanel
	 */
	openSharedFolderContent: function(defaultSelectedFolderType, config)
	{
		var componentType = Zarafa.core.data.SharedComponentType['hierarchy.dialog.opensharedfolder'];
		config = Ext.applyIf(config || {}, {
			defaultSelectedFolderType: defaultSelectedFolderType,
			modal: true
		});

		Zarafa.core.data.UIFactory.openLayerComponent(componentType, undefined, config);
	},

	/**
	 * Opens a {@link Zarafa.hierarchy.dialogs.FolderSelectionContentPanel FolderSelectionContentPanel}.
	 *
	 * @param {Object} config Configuration object for the content panel
	 */
	openFolderSelectionContent: function(config)
	{
		var componentType = Zarafa.core.data.SharedComponentType['hierarchy.dialog.folderselection'];
		config = Ext.applyIf(config || {}, {
			modal: true,
			folder: container.getHierarchyStore().getDefaultFolder('inbox')
		});

		Zarafa.core.data.UIFactory.openLayerComponent(componentType, undefined, config);
	},

	/**
	 * Append and update the browser tab title based on the unread counter of Inbox folder in hierarchy.
	 * This function will set and update title based on title_counter setting which resides
	 * in {@link Zarafa.settings.ui.SettingsDisplayWidget SettingsDisplayWidget}.
	 *
	 * @param {Zarafa.hierarchy.data.HierarchyStore} hierarchyStore to get unread mail count.
	 */
	setTitleCounter: function(hierarchyStore)
	{
		// First of all check if title counter plugin's setting available else check main settings.
		var titleCounterSetting = container.getSettingsModel().getOneOf('zarafa/v1/plugins/titlecounter/enable', 'zarafa/v1/main/title_counter/show');
		if (titleCounterSetting === true) {
      var title = container.getServerConfig().getWebappTitle();
      var unreadCounter = hierarchyStore.getDefaultFolder('inbox').get('content_unread');
      if (unreadCounter > 0) {
        title = '(' + unreadCounter + ') ' + title;
      }

      Ext.getDoc().dom.title = title;
    }
	}
};
