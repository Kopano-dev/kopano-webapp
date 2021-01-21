<?php

/**
 * This class will check the server configuration and it stops the 
 * webapp from working until this is fixed
 */
class ConfigCheck 
{
	public $result;
	public $errorMessage = "";

	function __construct($haltOnError = true)
	{
		$this->haltOnError = $haltOnError;

		$this->result = true;

		// here we check our settings, changes to the config and
		// additional checks must be added/changed here
		$this->checkPHP("5.4", "You must upgrade PHP");
		$this->checkExtension("mapi", "7.0.0-27530", "If you have upgraded Kopano Core, please restart your webserver");
		$this->checkExtension("gettext", null, "Install the gettext extension for PHP");
		$this->checkPHPsetting("session.auto_start", "off", "Modify this setting in '%s'");
		$this->checkPHPsetting("output_handler", "", "With this option set, it is unsure if the Kopano WebApp will work correctly");
		$this->checkPHPsetting("zlib.output_handler", "", "With this option set, it is unsure if the Kopano WebApp will work correctly");
		$this->checkPHPsetting("zlib.output_compression", "off", "With this option set, it could occure that XMLHTTP-requests will fail");

		if (CONFIG_CHECK_COOKIES_HTTP) {
			$this->checkPHPsecurity("session.cookie_httponly", "on", "Modify this setting in '%s'");
		}
		if (CONFIG_CHECK_COOKIES_SSL) {
			$this->checkPHPsecurity("session.cookie_secure", "on", "Modify this setting in '%s'");
		}

		$this->checkDirectory(TMP_PATH, "rw", "Please make sure this directory exists and is writable for PHP and your webserver");
		$this->checkFunction("iconv", "Install the 'iconv' module for PHP, or else you don't have euro-sign support.");
		$this->checkFunction("gzencode", "You don't have zlib support: <a href=\"https://php.net/manual/en/ref.zlib.php#zlib.installation\">https://php.net/manual/en/ref.zlib.php#zlib.installation</a>");
		$this->checkLoader(DEBUG_LOADER, "Your 'DEBUG_LOADER' configuration isn't valid for the current setup. Please check this property.");

		// check if there were *any* errors and we need to stop the WebApp
		if (!$this->result && $this->haltOnError){
			?>
				<link rel="stylesheet" href="client/resources/css/external/configcheck.css" media="screen">

				<div class="wrapper">
					<div class="header">
						<h1>Invalid configuration</h1>
					</div>	
					<div class="action">
						<p class="intro">Don’t worry, we’ll help you get to the bottom of this problem.</p>
						<p>First of all if you see this message and aren't the administrator, please contact your system administrator for assistance.</p>
						<h3>Please validate</h3>
						<ul>
						<li><p><?php echo $this->errorMessage?></p></li>
						<li><p>Check your '<tt><?php echo $this->get_php_ini(); ?></tt>' file for faulty configurations.</p></li>
						<li><p>Documentation can be found <a href="https://documentation.kopano.io/" target="_blank">here.</a></p></li>
						<li><p>Readme can be found <a href="https://stash.kopano.io/projects/KW/repos/kopano-webapp/browse/README.md" target="_blank">here.</a></p></li>
						<li><p>Still stuck? Contact our support team at <a href="https://www.kopano.com/" target="_blank">kopano.com.</a></p></li>
						</ul>
					</div>
					<div class="disable">
						<h3>Disable this message</h3>
						<p>You can disable this check in your <i>config.php</i>, but this is not recommended.</p>
					</div>
				</div>
			<?php
			exit;
		}

	}

	/**
	 * This function throws all the errors, make sure that the check-function 
	 * will call this in case of an error.
	 */
	function error($string, $help)
	{
		if ($this->haltOnError) {
			$this->errorMessage = $string . ". <br>". $help;
		} else{
			trigger_error(strip_tags($string), E_USER_NOTICE);
		}
		$this->result = false;
	}

	/**
	 * See error()
	 */
	function error_version($name, $needed, $found, $help)
	{
		$this->error("Version error: $name $found found, but $needed needed.", $help);
	}

	/**
	 * See error()
	 */
	function error_notfound($name, $help)
	{
		$this->error("Not Found: $name not found", $help);
	}

	/**
	 * See error()
	 */
	function error_config($name, $needed, $help)
	{
		$help = sprintf($help, "<tt>".$this->get_php_ini()."</tt>");
		$this->error("PHP Config error: $name must be '$needed'", $help);
	}

	/**
	 * See error()
	 */
	function error_security($name, $needed, $help)
	{
		$help = sprintf($help, "<tt>" . $this->get_site_config() . "</tt>");
		$this->error("PHP Security Config error: $name must be '$needed'", $help);
	}

	/**
	 * See error()
	 */
	function error_directory($dir, $msg, $help)
	{
		$this->error("Directory error: $dir $msg", $help);
	}

	/**
	 * Retrieves the location of the apache site config
	 */
	function get_site_config()
	{
		if (isset($this->siteconfig)) {
			return $this->siteconfig;
		}

		// This is not 100% accurate, so it needs to be improved a bit.
		$result = "sites-enabled" . DIRECTORY_SEPARATOR . "kopano-webapp";

		ob_start();
		phpinfo(INFO_MODULES);
		$phpinfo = ob_get_contents();
		ob_end_clean();

		preg_match("/<td class=\"e\">[\s]*Server Root[\s]*<\/td>[\s]*<td class=\"v\">[\s]*(.*)[\s]*<\/td>/i", $phpinfo, $matches);
		if (isset($matches[1])){
			$result = trim($matches[1]) . DIRECTORY_SEPARATOR . $result;
		}
		$this->siteconfig = $result;
		return $result;
	}

	/**
	 * Retrieves the location of php.ini
	 */
	function get_php_ini()
	{
		if (isset($this->phpini)){
			return $this->phpini;
		}

		$result = "php.ini";
	
		ob_start();
		phpinfo(INFO_GENERAL);
		$phpinfo = ob_get_contents();
		ob_end_clean();

		preg_match("/<td class=\"v\">(.*php[45]?\.ini)/i", $phpinfo, $matches);
		if (isset($matches[0])){
			$result = $matches[0];
		}
		$this->phpini = $result;
		return $result;
	}

	/**********************************************************\
	*  Check functions					   *
	\**********************************************************/


	/**
	 * Checks for the PHP version
	 */
	function checkPHP($version, $help_msg="")
	{
		$result = true;
		if (version_compare(phpversion(), $version) == -1){
			$this->error_version("PHP",$version, phpversion(), $help_msg);
			$result = false;
		}
		return $result;
	}

	/**
	 * Check if extension is loaded and if the version is what we need
	 */
	function checkExtension($name, $version="", $help_msg="")
	{
		$result = true;
		if (extension_loaded($name)){
			if (version_compare(phpversion($name), $version) == -1){
				$this->error_version("PHP ".$name." extension",phpversion($name), $version, $help_msg);
				$result = false;
			}
		}else{
			$this->error_notfound("PHP ".$name." extension", $help_msg);
			$result = false;
		}
		return $result;
	}

	/**
	 * Check if a function exists
	 */
	function checkFunction($name, $help_msg="")
	{
		$result = true;
		if (!function_exists($name)){
			$this->error_notfound("PHP function '".$name."' ", $help_msg);
			$result = false;
		}
		return $result;
	}
	
	/**
	 * This function checks if a specific php setting (php.ini) is set to a 
	 * value we need, for example register_globals
	 */
	function checkPHPsetting($setting,$value_needed, $help_msg=""){
		$result = true;
		// convert $value_needed
		switch($value_needed){
			case "on":
			case "yes":
			case "true":
				$value = 1;
				break;

			case "off":
			case "no":
			case "false":
				$value = 0;
				break;

			default:
				$value = $value_needed;
		}

		if (ini_get($setting) != $value){
			$this->error_config($setting, $value_needed, $help_msg);
			$result = false;
		}
		return $result;
	}

	/**
	 * This function checks if a specific php setting (php.ini) is set to a 
	 * value we need, for example register_globals
	 */
	function checkPHPsecurity($setting,$value_needed, $help_msg=""){
		$result = true;
		// convert $value_needed
		switch($value_needed){
			case "on":
			case "yes":
			case "true":
				$value = 1;
				break;

			case "off":
			case "no":
			case "false":
				$value = 0;
				break;

			default:
				$value = $value_needed;
		}

		if (ini_get($setting) != $value){
			$this->error_security($setting, $value_needed, $help_msg);
			$result = false;
		}
		return $result;
	}

	/**
	 * This functions checks if a directory exists and if requested also if
	 * this directory is readable/writable specified with the $states parameter
	 *
	 * $states is a string which can contain these chars:
	 *	r  - check if directory is readable
	 *	w  - check if directory is writable
	 */
	function checkDirectory($dir, $states="r", $help_msg="")
	{
		$result = true;

		if (!is_dir($dir)){
			@mkdir($dir); // try to create the directory
		}

		if (is_dir($dir)){
			$states = strtolower($states);
			if (strpos($states,"r")!==FALSE){
				if (!is_readable($dir)){
					$this->error_directory($dir, "isn't readable", $help_msg);
					$result = false;
				}
			}
			if (strpos($states,"w")!==FALSE){
				if (!is_writable($dir)){
					$this->error_directory($dir, "isn't writable", $help_msg);
					$result = false;
				}
			}
		}else{
			$this->error_directory($dir, "doesn't exist", $help_msg);
			$result = false;
		}
		return $result;
	}

	/**
	 * Check if the correct files are present in the current folder based on the DEBUG_LOADER configuration
	 * option. This should prevent odd errors when the incorrect folders are present.
	 */
	function checkLoader($loader, $help_msg="")
	{
		$result = true;
		
		$releaseFiles = is_file(BASE_PATH . '/client/kopano.js');
		$sourceFiles = is_dir(BASE_PATH . '/client/zarafa');
		$debugFiles = is_file(BASE_PATH . '/client/zarafa-debug.js');
	
		switch ($loader) {
		case LOAD_RELEASE:
			if ($sourceFiles) {
				$this->error('LOAD_RELEASE set, but source files were found', $help_msg);
				$result = false; 
			} else if (!$releaseFiles) {
				$this->error('LOAD_RELEASE set, but no release files found', $help_msg);
				$result = false;
			}
			break;
		case LOAD_DEBUG:
			if ($sourceFiles) {
				$this->error('LOAD_DEBUG set, but source files were found', $help_msg);
				$result = false;
			} else if (!$debugFiles) {
				$this->error('LOAD_DEBUG set, but no debug files were found', $help_msg);
				$result = false;
			}
			break;
		case LOAD_SOURCE:
			if ($releaseFiles || $debugFiles) {
				$this->error('LOAD_SOURCE set, but release or debug file were found', $help_msg);
				$result = false;
			} else if (!$sourceFiles) {
				$this->error('LOAD_SOURCE set, but no source files found', $help_msg);
				$result = false;
			}
			break;
		default:
			$this->error('Unknown \'DEBUG_LOADER\' value: ' . $loader, $help_msg);
			$result = false;
			break;
		}

		return $result;
	}
}

?>
