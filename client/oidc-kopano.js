const userManager = (function(){
	"use strict"; 
	var onLogonPage = false;
	var mgr;
	const MAX_TRY = 5;
	var CURRENT_ATTEMPT = 0;

	Oidc.Log.logger = console;
	Oidc.Log.level = Oidc.Log.WARN;

	/**
	 * Helper function genreate the markup for message box.
	 *
	 * @param {Object} options Then options which used to generate markup.
	 * @return {string} html markup.
	 */
	function generateMarkup(options){
		const {message = "Unknown error", title, buttons = []} = options;
		const btns = buttons.map((button) => {
			return `<div id=${button.id} class="btn"> 
						${button.text} 
					</div>`;
		});
		return `
		<div id="oidc-error-msgBox">
			<div class="oidc-msg-container" >
				<div class="title">
					<span>${title}</span>
				</div>
				<div class="body">
					<span>${message}</span>
				</div>
				<div class="button-container">
					${btns.join("")}
				</div>
			</div>
		</div>
		`;
	}

	/**
	 * Function is used to compose custom message box.
	 * @param {Object} options Then options which used to generate markup.
	 */
	function showMessageBox(options) {
		document.body.innerHTML = DOMPurify.sanitize(generateMarkup(options));
		const {buttons = []} = options;
		for(const button of buttons) {
			if (button.id) {
				const btnEl = document.getElementById(button.id);
				btnEl.addEventListener("click", button.handler);
			}
		}
	}

	function remove_hash_from_url()
	{
		var uri = window.location.toString();
		if (uri.indexOf("#") > 0) {
			var clean_uri = uri.substring(0, uri.indexOf("#"));
			window.history.replaceState({}, document.title, clean_uri);
		}
	}

	/**
	 * Function which is used to handle an error which received as a response of 'postToken' .
	 * @param {Object} data Then error object 
	 */
	function handleError(data) {
		// Configuration Object for the custom message box.
		const cfg = {
			title :'Authorization failed',
			message : data.error.message,
			// handler used by the Ext.messageBox.
			handler : function (btnId) {
				if (btnId === "retry") {
					retryPostToken(data, false);
				} else if (btnId === "signout") {
					signOut();
				}
			},
			buttons: [{
				text : "Retry",
				id: "btnRetry",
				handler : function () {
					retryPostToken(data, false);
				}
			},{
				text : "Signout",
				id: "btnSignout",
				handler : signOut
			}]
		};

		wrapperHandler(data.error.hcode, cfg);
	}

	/**
	 * Helper function which do 'postToken' again.
	 * @param {Object} data The response data of last 'postToken'.
	 * @param {boolean} timeout true to wait for the 3 sec. to do 'postToken' false it wont wait for 3 sec.
	 */
	function retryPostToken(data, timeout) {
		mgr.getUser().then(function(user) {
			if (isUserNotExpired(user)) {
				if (timeout === false) {
					postToken(user);
					return;
				}

				window.setTimeout(function(){
					postToken(user);
				},3000);
			} else {
				handleError(data);
			}
		});
	}

	function onLoad() {
		try {
			var data = JSON.parse(this.responseText);
		} catch(e) {
			console.error('oidc unable to parse post token response', e);
		}

		if (data && data.error) {
			console.error('oidc post token failed', data);

			switch (data.error.hcode) {
				case 'MAPI_E_LOGON_FAILED' :
				case 'MAPI_E_UNCONFIGURED' :
				case 'MAPI_E_NETWORK_ERROR'	:
					if (++CURRENT_ATTEMPT <= MAX_TRY) {
						retryPostToken(data, true);
						return;
					} else {
						handleError(data);
					}
				default: break;
			}
		} else if (onLogonPage) {
			window.location.href = window.location.origin + window.location.pathname;
		} else if (data && data.authenticated === false) {
			wrapperHandler('AUTHENTICATION_FAILURE', {
				handler : function() {
					reauthenticateWithRedirect();
				}
			});
		} else {
			// Reset postToken try.
			CURRENT_ATTEMPT = 0;
		}
	}

	/**
	 * Helper function used to initialize the http request object.
	 *
	 * @param {String} method The request method.
	 * @param {String} url The url to request.
	 * @return {XMLHttpRequest} return xml http request instance.
	 */
	function request(method, url) {
		var http = new XMLHttpRequest();
		http.open(method, url, true);
		http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

		return http
	}

	/**
	 * Function triggered request to token service which authenticate the user
	 *
	 * @param {Object} user The current login user.
	 */
	function postToken(user) {
		// Post to webapp service with token.
		var http = request("POST", "kopano.php?service=token");

		var data = "token=" + user.access_token;
		if (onLogonPage) {
			data += "&new=true";
		}
		http.addEventListener("load", onLoad);
		http.send(data);
	}

	/**
	 * Function used to clear the webapp/php session. It will triggered an request to
	 * 'service.logout.php' which is responsible to destroy/clear the session.
	 * @param {function} onLoadEventHandler The event handler which triggered on load.
	 */
	function clearSession(onLoadEventHandler) {
		var http = request("GET", "kopano.php?service=logout");
		http.addEventListener("load", onLoadEventHandler);
		http.send();
	}

	/**
	 * Middleware function used to show the proper message box based on the action type.
	 * 
	 * @param {String} actionType The constant action type which used to show the message box.
	 * @param {Object} cfg The configuration object used by 'showMessageBox' to compose custom message box.
	 */
	function wrapperHandler(actionType, cfg) {
		if (window.Zarafa) {
			switch (actionType) {
				case "ACCESS_TOKEN_EXPIRED":
				case "AUTHENTICATION_FAILURE":
					var title = actionType === "ACCESS_TOKEN_EXPIRED" ?  _('Access token expired') : _('Authorization failed');
					window.Zarafa.core.Util.showMessageBox({
						title: title,
						msg: _('Failed to renew session, re-authentication is required.'),
						cls: Ext.MessageBox.ERROR_CLS,
						minWidth: 250,
						fn: cfg.handler,
						buttons: Ext.MessageBox.OK
					});
					break;
				case 'MAPI_E_LOGON_FAILED':
				case 'MAPI_E_UNCONFIGURED':
				case 'MAPI_E_NETWORK_ERROR':
					window.Zarafa.core.Util.showMessageBox({
						title: cfg.title,
						msg: cfg.message,
						cls: Ext.MessageBox.ERROR_CLS,
						fn: cfg.handler,
						customButton: [{
							text: _('Retry'),
							name: 'retry'
						}, {
							text: _('Signout'),
							name: 'signout'
						}],
						scope : this
					}, true);
					break;
				default:
					console.error("UnKnown action type:", actionType);
			}
		} else if (cfg) {
			// This will show the custom message box
			// when Extjs is unavailable.
			showMessageBox(cfg);
		}
	}

	/**
	 * Helper function which redirect to signin page.
	 *
	 * @param {Object} args The config options used by sign-in redirect.
	 */
	function signinRedirect(args) {
		if (window.Zarafa) {
			Zarafa.core.Util.disableLeaveRequester();
		}

		return mgr.signinRedirect(args);
	}

	/**
	 * Helper function which help to identify that give user is expired or not.
	 *
	 * @param {Object} user The current login user.
	 * @return {boolean} true if user session is not expired yet else false.
	 */
	function isUserNotExpired(user) {
		return user && user.access_token && !user.expired;
	}

	/**
	 * Helper function which used to silently renew the access token. In case it failed to renew
	 * it will redirect to prompt select_account logon page.
	 *
	 * @param {Object} mgr The instance of user manager.
	 */
	function silentRenewAccessToken(mgr) {
		mgr.signinSilent().then(function(user) {
			if (isUserNotExpired(user)) {
				console.debug('oidc sign-in silent successfully.');
				postToken(user);
			}
			return user;
		}).catch(function(err) {
			console.debug('oidc silent sign-in failed', err);
			return null;
		}).then(function(user) {
			if (!user) {
				console.debug('oidc sign-in silent did not return a user');
				// Silent sign-in failed, show message box which further
				// redirect to interactive login page.
				wrapperHandler("ACCESS_TOKEN_EXPIRED",{
					handler : function (){
						reauthenticateWithRedirect();
					}
				});
			}
		});
	}

	function init(oidcSettings, loginPage) {
		onLogonPage = loginPage;
		var url = window.location.href;
		if (!url.endsWith('/')) {
			url += '/';
		}
		oidcSettings.redirect_uri = url + '#oidc-callback';
		oidcSettings.post_logout_redirect_uri = url + '?logout';
		oidcSettings.silent_redirect_uri = url + "?oidc-silent-refresh";
		oidcSettings.accessTokenExpiringNotificationTime = 120;

		mgr = new Oidc.UserManager(oidcSettings);
		mgr.clearStaleState();

		mgr.events.addUserSignedOut(function (){
			console.debug('oidc user signed out at OP');
			mgr.removeUser();

			// clear php session and redirect to interactive sign in page.
			clearSession(function (){
				console.debug('webapp php session cleared.');

				Zarafa.core.Util.disableLeaveRequester();
				window.location = "?oidclogin";
			});
		});

		mgr.events.addAccessTokenExpiring(function () {
			console.debug('oidc token expiring');
		});

		// Try to silently renew the access token, in case if it fails
		// then show access token expired dialog. After click on ok button
		// it will redirect to interactive logon page.
		var accessTokenExpiredHandler = function() {
			console.warn('oidc access token expired');
			mgr.removeUser();
			mgr.getUser().then(function (user) {
				if (isUserNotExpired(user)) {
					postToken(user);
					return;
				}

				silentRenewAccessToken(mgr);
			});
		};

		// Event handler triggered when access token get expired.
		mgr.events.addAccessTokenExpired(accessTokenExpiredHandler);

		// Event handler triggered when getting error
		// while silently renewing access token.
		mgr.events.addSilentRenewError(function (err) {
			console.error("oidc silent renew error", err.error);
			if (err) {
				switch (err.error) {
					case 'interaction_required':
					case 'login_required':
						accessTokenExpiredHandler();
						return;
				}
			}

			// if there is not error
			setTimeout(function (){
				console.debug('oidc retrying silent renew');
				mgr.getUser().then(function (user) {
					console.debug('oidc retrying silent renew of user');
					if (isUserNotExpired(user)) {
						console.debug('oidc start silent renew', user);
						mgr.startSilentRenew();
					} else {
						console.debug('oidc failed to renew in time so try once to silently renew user.');
						mgr.signinSilent().catch(function(err) {
							console.debug('oidc silent sign-in failed', err);
							return null;
						}).then(function(user) {
							if (user === null) {
								console.debug('oidc sign-in silent did not return a user');
								// Silent sign-in failed, show message box which further
								// redirect to interactive login page.
								wrapperHandler("ACCESS_TOKEN_EXPIRED",{
									handler : function (){
										reauthenticateWithRedirect();
									}
								});
							}
						});
					}
				});
			}, 5000);
		});

		mgr.events.addUserLoaded(function (user) {
			console.debug('oidc user loaded', user);
			mgr.getUser().then(function(user){
				postToken(user);
			});
		});

		mgr.getUser().then(function(user) {
			if (isUserNotExpired(user)) {
				postToken(user);
				return;
			}

			// Callback redirect handling.
			if (onLogonPage && window.location.hash.startsWith('#oidc-callback')) {
				var error = undefined;
				mgr.signinRedirectCallback().catch(function(err) {
					console.error('oidc failed to complete authentication', err);
					error = err;
					return null;
				}).then(function (user){
					remove_hash_from_url();
					if (!user) {
						var msg = `Unable to complete the login. Please try again.
						<br/><br/>
						If this problem persists, contact your system administrator with the following details:<br/>
						Error: ${(error && error.message) || "Unable to complete login."}`;

						showMessageBox({
							title : 'Incomplete login',
							message: msg,
							buttons: [{
								text : "Retry",
								id: "btnRetry",
								handler : function () {
									remove_hash_from_url();
									mgr.removeUser();
									signinRedirect({"prompt" : "select_account"});
								}
							}]
						});
					}
				});
				return;
			}

			mgr.signinSilent().catch(function(err) {
				console.error('oidc sign-in silent failed', err);
				if (onLogonPage) {
					console.debug('oidc sign-in silent did not return a user');
					// Silent sign-in failed, login normal
					signinRedirect().catch(function (err) {
						console.error("Unreachable kopano konnect service.", err)
						showMessageBox({
							title: 'Connection error',
							message: 'Problem occurred while connecting to an authorization service.',
							buttons: [{
								text: "OK",
								id: "btnOk",
								handler: function () {
									signinRedirect();
								}
							}]
						});
					});
				}
			});
		});
	}

	/**
	 * Function called when user click on 'signout' button.
	 * It will signout the user and clear the php session.
	 */
	function signOut() {
		// clear php session and do signout.
		clearSession(function (){
			// We assume php session was clear successfully
			mgr.signoutRedirect();
		});
	}

	/**
	 * Re-Authenticates the current user with redirecting to interactive login page.
	 * It will first triggered request to clear the php session and then redirect to
	 * interactive login page.
	 */
	function reauthenticateWithRedirect() {
		// clear php session and do signout.
		clearSession(function (){
			// We assume php session was clear successfully
			signinRedirect({"prompt" : "select_account"});
		});
	}

	return {
		init,
		signOut,
		reauthenticateWithRedirect
	};
})();


document.addEventListener('DOMContentLoaded', function() {
	// Condition succeed when interactive signin page was show.
	const metaEl = document.querySelector("meta[name='kopano:webapp-view']");
	if (metaEl && metaEl.content === 'interactive-signin') {
		var uri = [location.protocol, '//', location.host, location.pathname].join('');
		window.history.replaceState({}, document.title, uri);

		document.getElementById("signin-btn").addEventListener("click", function (){
			window.location.reload();
		});
		return;
	}

	const elem = document.getElementById('oidc-settings');
	if (!elem) {
		return;
	}

	const oidcSettings = JSON.parse(elem.getAttribute('content'));
	const firstLogon = elem.getAttribute('logon') === "";
	userManager.init(oidcSettings, firstLogon);
});
