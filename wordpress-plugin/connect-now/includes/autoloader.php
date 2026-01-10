<?php
namespace ConnectNow;

/**
 * Autoloader for ConnectNow plugin classes
 */
class Autoloader {
    public static function register() {
        spl_autoload_register([__CLASS__, 'load']);
    }

    public static function load($class) {
        $prefix = 'ConnectNow\\';
        if (strpos($class, $prefix) !== 0) {
            return;
        }

        $class_name = str_replace($prefix, '', $class);
        $file_path = CONNECT_NOW_PLUGIN_DIR . 'includes/class-' . strtolower(str_replace('\\', '-', $class_name)) . '.php';

        if (file_exists($file_path)) {
            require_once $file_path;
        }
    }
}

Autoloader::register();
