<!doctype html>
<html>
<head>
	<title>Kopano Sign in</title>
	<meta name="description" content="Kopano WebApp is the ultimate frontend client for Kopano server. A rich collaboration platform utilizing e-mail, calendars, webmeetings, file sharing and more.">
	<meta name="author" content="Kopano.io">

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="kopano:webapp-view" content="interactive-signin">

	<link rel="icon" href="<?php echo $favicon ?>" type="image/x-icon">
	<link rel="shortcut icon" href="<?php echo $favicon ?>" type="image/x-icon">
	<link rel="stylesheet" type="text/css" href="client/resources/css/external/login.css">

	<script type="text/javascript"><?php require(BASE_PATH . 'client/oidc/oidc-client.js'); ?></script>
	<script type="text/javascript"><?php require(BASE_PATH . 'client/oidc-kopano.js'); ?></script>
</head>
<body class="login theme-<?php echo strtolower($theme ? $theme : 'basic') ?>">

	<div class="container">
		<div class="form-container">
			<span id="logo"></span>
			<button id="signin-btn"><?php echo _("Sign in") ?></button>
		</div>
	</div>
</body>
</html>
