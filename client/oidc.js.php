<?php
	$oidcSettings = Array(
		'authority' => OIDC_ISS,
		'client_id' => OIDC_CLIENT_ID,
		'response_type' => 'code',
		'response_mode' => 'fragment',
		'scope' => OIDC_SCOPE,
		'includeIdTokenInSilentRenew' => true,
		'automaticSilentRenew' => true,
	);
?>

<script type="text/javascript"><?php require(BASE_PATH . 'client/dompurify/purify.js'); ?></script>
<script type="text/javascript"><?php require(BASE_PATH . 'client/oidc/oidc-client.js'); ?></script>
<script type="text/javascript"><?php require(BASE_PATH . 'client/oidc-kopano.js'); ?></script>
<meta name="oidc-settings" id="oidc-settings" content="<?php echo htmlspecialchars(json_encode($oidcSettings)); ?>">
