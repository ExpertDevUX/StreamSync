<?php
namespace ConnectNow\Core;

use ConnectNow\Admin\Admin;
use ConnectNow\Frontend\Frontend;
use ConnectNow\Database\Database;
use ConnectNow\API\API;

class ConnectNow {
    private static $instance = null;
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_hooks();
        $this->init_modules();
    }

    private function init_hooks() {
        // Activation and deactivation hooks
        register_activation_hook(CONNECT_NOW_PLUGIN_FILE, [$this, 'activate']);
        register_deactivation_hook(CONNECT_NOW_PLUGIN_FILE, [$this, 'deactivate']);
        
        // Load plugin textdomain
        add_action('plugins_loaded', [$this, 'load_textdomain']);
    }

    private function init_modules() {
        // Initialize database
        Database::get_instance();
        
        // Initialize admin panel
        if (is_admin()) {
            Admin::get_instance();
        } else {
            Frontend::get_instance();
        }
        
        // Initialize REST API
        API::get_instance();
    }

    public function activate() {
        Database::get_instance()->create_tables();
        flush_rewrite_rules();
    }

    public function deactivate() {
        flush_rewrite_rules();
    }

    public function load_textdomain() {
        load_plugin_textdomain('connect-now', false, dirname(CONNECT_NOW_PLUGIN_FILE) . '/languages');
    }
}
