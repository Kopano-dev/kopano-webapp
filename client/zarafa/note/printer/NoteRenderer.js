Ext.namespace('Zarafa.note.printer');

/**
 * @class Zarafa.note.printer.NoteRenderer
 * @extends Zarafa.common.printer.renderers.RecordRenderer
 *
 * A printer for notes using the same layout as for emails
 *
 * Prints a single note request or note item
 */
Zarafa.note.printer.NoteRenderer = Ext.extend(Zarafa.common.printer.renderers.RecordRenderer, {

	/**
	 * Generate the XTemplate HTML text for printing a single note item or note request.
	 * @param {Zarafa.core.data.MAPIRecord} record The note item to print
	 * @return {String} The HTML for the XTemplate to print
	 */
	generateBodyTemplate: function(record) {
		var html = '';
		html += '<b>{fullname}</b>\n';
		html += '<hr>\n';
		html += '<table>\n';
		html += this.addRow(_('Modified'), '{last_modification_time:formatDefaultTimeString("' + _("l jS F Y {0}") + '")}');
		html += this.optionalRow(_('Categories'), 'categories', '{categories}');
		html += '</table><br><p>\n';
		html += record.getBody(true);
		html += '</p>\n';
		return html;
	}
});

