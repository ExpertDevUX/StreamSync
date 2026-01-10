<?php
/**
 * Plugin Name: ConnectNow - Video Conferencing
 * Plugin URI: https://thongphamit.site
 * Description: Open-source video conferencing platform for WordPress. Host video calls, team meetings, and group chats with end-to-end security.
 * Version: 2.0.0
 * Author: Hoang Thong Pham
 * Author URI: https://thongphamit.site
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: connect-now
 * Domain Path: /languages
 * Requires at least: 5.9
 * Requires PHP: 7.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('CONNECT_NOW_VERSION', '2.0.0');
define('CONNECT_NOW_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CONNECT_NOW_PLUGIN_URL', plugin_dir_url(__FILE__));
define('CONNECT_NOW_PLUGIN_FILE', __FILE__);

// Autoloader
require_once CONNECT_NOW_PLUGIN_DIR . 'includes/autoloader.php';

// Initialize plugin
require_once CONNECT_NOW_PLUGIN_DIR . 'includes/class-connect-now.php';
ConnectNow\Core\ConnectNow::get_instance();
