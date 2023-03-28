<?php
	require_once(BASE_PATH . 'server/includes/mapi/class.recurrence.php');

	/**
	 * Appointment Module
	 */
	class AppointmentListModule extends ListModule
	{
		/**
		 * @var date start interval of view visible
		 */
		private $startdate;

		/**
		 * @var date end interval of view visible
		 */
		private $enddate;

		/**
		 * Constructor
		 * @param int $id unique id.
		 * @param array $data list of all actions.
		 */
		function __construct($id, $data)
		{
			parent::__construct($id, $data);

			$this->properties = $GLOBALS["properties"]->getAppointmentListProperties();

			$this->startdate = false;
			$this->enddate = false;
		}

		/**
		 * Creates the notifiers for this module,
		 * and register them to the Bus.
		 */
		function createNotifiers()
		{
			$entryid = $this->getEntryID();
			$GLOBALS["bus"]->registerNotifier('appointmentlistnotifier', $entryid);
		}

		/**
		 * Executes all the actions in the $data variable.
		 * @return boolean true on success of false on fialure.
		 */
		function execute()
		{
			foreach($this->data as $actionType => $action)
			{
				if(isset($actionType)) {
					try {
						$store = $this->getActionStore($action);
						$entryid = $this->getActionEntryID($action);

						switch($actionType)
						{
							case "list":
								$this->messageList($store, $entryid, $action, $actionType);
								break;
							case "search":
								// @FIXME add functionality to handle private items
								$this->search($store, $entryid, $action, $actionType);
								break;
							case "updatesearch":
								$this->updatesearch($store, $entryid, $action);
								break;
							case "stopsearch":
								$this->stopSearch($store, $entryid, $action);
								break;
							default:
								$this->handleUnknownActionType($actionType);
						}
					} catch (MAPIException $e) {
						if (isset($action['suppress_exception']) && $action['suppress_exception'] === true) {
							$e->setNotificationType('console');
						}
						$this->processException($e, $actionType);
					}
				}
			}
		}

		/**
		 * Function which retrieves a list of calendar items in a calendar folder
		 * @param object $store MAPI Message Store Object
		 * @param string $entryid entryid of the folder
		 * @param array $action the action data, sent by the client
		 * @param string $actionType the action type, sent by the client
		 * @return boolean true on success or false on failure
		 */
		function messageList($store, $entryid, $action, $actionType)
		{
			if($store && $entryid) {
				// initialize start and due date with false value so it will not take values from previous request
				$this->startdate = false;
				$this->enddate = false;

				if(isset($action["restriction"])) {
					if(isset($action["restriction"]["startdate"])) {
						$this->startdate = $action["restriction"]["startdate"];
					}

					if(isset($action["restriction"]["duedate"])) {
						$this->enddate = $action["restriction"]["duedate"];
					}
				}

				if($this->startdate && $this->enddate) {
					$data = array();

					if(is_array($entryid) && !empty($entryid)) {
						$data["item"] = array();
						for($index = 0, $index2 = count($entryid); $index < $index2; $index++) {
							$this->getDelegateFolderInfo($store[$index]);

							// Set the active store in properties class and get the props based on active store.
							// we need to do this because of multi server env where shared store belongs to the different server.
							// Here name space is different per server. e.g. There is user A and user B and both are belongs to
							// different server and user B is shared store of user A because of that user A has 'categories' => -2062020578
							// and user B 'categories' => -2062610402,
							$GLOBALS["properties"]->setActiveStore($store[$index]);
							$this->properties = $GLOBALS["properties"]->getAppointmentListProperties();

							$data["item"] = array_merge($data["item"], $this->getCalendarItems($store[$index], $entryid[$index], $this->startdate, $this->enddate));
						}
					} else {
						$this->getDelegateFolderInfo($store);
						$data["item"] = $this->getCalendarItems($store, $entryid, $this->startdate, $this->enddate);
					}

					$this->addActionData("list", $data);
					$GLOBALS["bus"]->addData($this->getResponseData());
				} else {
					// for list view in calendar as startdate and enddate is passed as false
					// this will set sorting and paging for items in listview.

					$this->getDelegateFolderInfo($store);
					parent::messageList($store, $entryid, $action, $actionType);
				}
			}
		}

		/**
		 * Function to return all Calendar items in a given timeframe. This
		 * function also takes recurring items into account.
		 * @param object $store message store
		 * @param object $calendar folder
		 * @param date $start startdate of the interval
		 * @param date $end enddate of the interval
		 */
		function getCalendarItems($store, $entryid, $start, $end)
		{
			$restriction =
				// OR
				//  - Either we want all appointments which fall within the given range
				//	- Or we want all recurring items which we manually check if an occurrence
				//	  exists which will fall inside the range
				Array(RES_OR,
					Array(
						// OR
						//	- Either we want all properties which fall inside the range (or overlap the range somewhere)
						//		(start < appointmentEnd && due > appointmentStart)
						//	- Or we want all zero-minute appointments which fall at the start of the restriction.
						// Note that this will effectively exclude any appointments which have an enddate on the restriction
						// start date, as those are not useful for us. Secondly, we exclude all zero-minute appointments
						// which fall on the end of the restriction as the restriction is <start, end].
						array(RES_OR,
							array(
								// AND
								//	- The AppointmentEnd must fall after the start of the range
								//	- The AppointmentStart must fall before the end of the range
								Array(RES_AND,
									Array(
										// start < appointmentEnd
										Array(RES_PROPERTY,
											Array(RELOP => RELOP_GT,
												ULPROPTAG => $this->properties["duedate"],
												VALUE => $start
											)
										),
										// due > appointmentStart
										Array(RES_PROPERTY,
											Array(RELOP => RELOP_LT,
												ULPROPTAG => $this->properties["startdate"],
												VALUE => $end
											)
										)
									)
								),
								// AND
								//	- The AppointmentStart equals the start of the range
								//	- The AppointmentEnd equals the start of the range
								// In other words the zero-minute appointments on the start of the range
								array(RES_AND,
									array(
										// appointmentStart == start
										array(RES_PROPERTY,
											Array(RELOP => RELOP_EQ,
												ULPROPTAG => $this->properties["startdate"],
												VALUE => $start
											)
										),
										// appointmentEnd == start
										array(RES_PROPERTY,
											Array(RELOP => RELOP_EQ,
												ULPROPTAG => $this->properties["duedate"],
												VALUE => $start
											)
										)
									)
								)
							)
						),
						//OR
						//(item[isRecurring] == true)
						Array(RES_PROPERTY,
							Array(RELOP => RELOP_EQ,
								ULPROPTAG => $this->properties["recurring"],
								VALUE => true
							),
						)
					)
			);// global OR

			$folder = mapi_msgstore_openentry($store, $entryid);
			$table = mapi_folder_getcontentstable($folder, MAPI_DEFERRED_ERRORS);
			$calendaritems = mapi_table_queryallrows($table, $this->properties, $restriction);

			return $this->processItems($calendaritems, $store, $entryid, $start, $end);
		}

		/**
		 * Process calendar items to prepare them for being sent back to the client
		 * @param array $calendaritems array of appointments retrieved from the mapi tablwe
 		 * @param object $store message store
		 * @param object $calendar folder
		 * @param date $start startdate of the interval
		 * @param date $end enddate of the interval
		 * @return array $items processed items
		 */
		function processItems($calendaritems, $store, $entryid, $start, $end)
		{
			$items = Array();
			$openedMessages = Array();
			$proptags = $GLOBALS["properties"]->getRecurrenceProperties();

			foreach($calendaritems as $calendaritem)
			{
				$item = null;
				if (isset($calendaritem[$this->properties["recurring"]]) && $calendaritem[$this->properties["recurring"]]) {
					$recurrence = new Recurrence($store, $calendaritem, $proptags);
					$recuritems = $recurrence->getItems($start, $end);

					foreach($recuritems as $recuritem)
					{
						$item = Conversion::mapMAPI2XML($this->properties, $recuritem);

						// Single occurrences are never recurring
						$item['props']['recurring'] = false;

						if(isset($recuritem["exception"])) {
							$item["props"]["exception"] = true;
						}

						if(isset($recuritem["basedate"])) {
							$item["props"]["basedate"] = $recuritem["basedate"];
						}

						if ( isset($recuritem["exception"]) ){
							// Add categories if they are set on the exception
							// We will create a new Recurrence object with the opened message,
							// so we can open the attachments. The attachements for this exception
							// contains the categories property (if changed)
							$msgEntryid = bin2hex($calendaritem[$this->properties["entryid"]]);
							if ( !isset($openedMessages[$msgEntryid]) ){
								// Open the message and add it to the openedMessages property
								$message = mapi_msgstore_openentry($store, $calendaritem[$this->properties["entryid"]]);
								$openedMessages[$msgEntryid] = $message;
							} else {
								// This message was already opened
								$message = $openedMessages[$msgEntryid];
							}
							// Now create a Recurrence object with the mapi message (instead of the message props)
							// so we can open the attachments
							$recurrence = new Recurrence($store, $message, $proptags);
							$exceptionatt = $recurrence->getExceptionAttachment($recuritem["basedate"]);
							if($exceptionatt) {
								// Existing exception (open existing item, which includes basedate)
								$exception = mapi_attach_openobj($exceptionatt, 0);
								$exceptionProps = $GLOBALS['operations']->getMessageProps($store, $exception, array('categories'=>$this->properties["categories"]));

								if ( isset($exceptionProps['props']['categories']) ){
									$item["props"]["categories"] = $exceptionProps['props']['categories'];
								}
							}
						}

						$item = $this->processPrivateItem($item);

						// only add it in response if its not removed by above function
						if(!empty($item)) {
							array_push($items, $item);
						}
					}
				} else {
					$item = Conversion::mapMAPI2XML($this->properties, $calendaritem);

					$item = $this->processPrivateItem($item);

					// only add it in response if its not removed by above function
					if(!empty($item)) {
						array_push($items,$item);
					}
				}
			}

			usort($items, array("AppointmentListModule", "compareCalendarItems"));

			return $items;
		}

		/**
		 * Function will be used to process private items in a list response, modules can
		 * can decide what to do with the private items, remove the entire row or just
		 * hide the data. This function will only hide the data of the private appointments.
		 * @param {Object} $item item properties
		 * @return {Object} item properties after processing private items
		 */
		function processPrivateItem($item)
		{
			if($this->startdate && $this->enddate) {
				if($this->checkPrivateItem($item)) {
					$item['props']['subject'] = _('Private Appointment');
					$item['props']['location'] = '';
					$item['props']['reminder'] = 0;
					$item['props']['access'] = 0;
					$item['props']['sent_representing_name'] = '';
					$item['props']['display_to'] = '';
					$item['props']['display_cc'] = '';
					$item['props']['sender_name'] = '';

					return $item;
				}

				return $item;
			} else {
				// if we are in list view then we need to follow normal procedure of other listviews
				return parent::processPrivateItem($item);
			}
		}

		/**
		 * Function will sort items for the month view
		 * small startdate on top.
		 */
		public static function compareCalendarItems($a, $b)
		{
			$start_a = $a["props"]["startdate"];
			$start_b = $b["props"]["startdate"];

		   if ($start_a == $start_b) {
		       return 0;
		   }
		   return ($start_a < $start_b) ? -1 : 1;
		}
	}
?>
