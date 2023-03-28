<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<!-- Always force latest IE rendering engine (even in intranet) & Chrome Frame
		Remove this if you use the .htaccess -->
		<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">

		<title><?php echo $webappTitle; ?></title>
		<meta name="description" content="Kopano WebApp is the ultimate frontend client for Kopano server. A rich collaboration platform utilizing e-mail, calendars, webmeetings, file sharing and more.">
		<meta name="author" content="Kopano.io">

		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<link rel="icon" href="<?php echo $favicon ?>" type="image/x-icon">
		<link rel="shortcut icon" href="<?php echo $favicon ?>" type="image/x-icon">

		<link rel="stylesheet" type="text/css" href="client/resources/css/external/login.css">

		<?php
			/* Add the styling of the theme */
			echo Theming::getStyles($theme);
		?>

		<script type="text/javascript"><?php require(BASE_PATH . 'client/fingerprint.js'); ?></script>
	</head>

	<body class="login theme-<?php echo strtolower($theme ? $theme : 'basic') ?>">
		<div id="form-container">
			<div id="bg"></div>
			<div id="content">
				<div class="left">
					<div id="logo"></div>
					<?php if ( !empty($branch) ) { ?>
					<h2><i><?php echo $branch; ?></i></h2>
					<?php } ?>
				</div>
				<div class="right">
					<h1><?php echo _("Welcome"); ?></h1>
					<form action="<?php echo $url ?>" method="post">
						<label for="username"><?php echo _("Username"); ?></label>
						<input type="text" name="username" id="username" value="<?php echo $user; ?>" required>

						<label for="password"><?php echo _("Password"); ?></label>
						<input type="password" name="password" id="password" required>

						<?php if ( isset($error) ) { ?>
						<div id="error"><?php echo $error; ?></div>
						<?php } ?>

						<input id="submitbutton" class="button" type="submit" value="<?php echo _("Sign in"); ?>">
					</form>
				</div>
			</div>
		</div>
		<script type="text/javascript"><?php require(BASE_PATH . 'client/resize.js'); ?></script>
		<script type="text/javascript">

			// Set focus on the correct form element
			function onLoad() {

				const elements = form.querySelectorAll("input");
				let setFocus = false;

				for (const el of elements) {
					if (setFocus === false) {
						if (el.value === "" || el.id === "submitbutton") {
							el.focus();
							setFocus = true;
						}
					}

					// Inform the user if capslock is enabled in password field when typing
					if (el.name === "password") {

						password.addEventListener('keydown', function (event) {

							const errorDiv = document.getElementById('error');
							var caps = event.getModifierState && event.getModifierState('CapsLock');

							if (caps) {
								errorDiv.textContent = '<?php echo _("Caps lock is on") ?>';
							} else {
								errorDiv.textContent = '';
							}
						});
					}
				}
			}
			window.onload = onLoad;
			
			// Show a spinner when submitting
			var form = document.getElementsByTagName('form')[0];
			// Some browsers need some time to draw the spinner (MS Edge!),
			// so we use this variable to delay the submit a little;
			var firstSubmit = true;
			form.onsubmit = function(){
				if ( !firstSubmit ){
					return true;
				}
				// Adding this class will show the loader
				const cntEl = document.getElementById('form-container');
				cntEl.className += ' loading';
				// Call resizeLoginBox, because an error message might have enlarged the login box,
				// so it is out of position.
				resizeLoginBox();
				firstSubmit = false;
				window.setTimeout(function(){ form.submit(); }, 10);
				return false;
			};
		</script>
	</body>
</html>
