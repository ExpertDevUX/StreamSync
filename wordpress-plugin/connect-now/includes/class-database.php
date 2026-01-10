<?php
namespace ConnectNow\Database;

class Database {
    private static $instance = null;
    private $wpdb;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
    }

    public function create_tables() {
        $charset_collate = $this->wpdb->get_charset_collate();

        // Rooms table
        $rooms_sql = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}connect_now_rooms (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            room_id VARCHAR(255) NOT NULL UNIQUE,
            room_name VARCHAR(255) NOT NULL,
            call_type VARCHAR(50) NOT NULL DEFAULT 'video',
            owner_id BIGINT(20) UNSIGNED NOT NULL,
            is_private TINYINT(1) DEFAULT 0,
            password_hash VARCHAR(255),
            max_participants INT(11) DEFAULT 100,
            auto_delete_days INT(11) DEFAULT 60,
            end_call_action VARCHAR(50) DEFAULT 'keep',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY room_id (room_id),
            KEY owner_id (owner_id)
        ) $charset_collate;";

        // Chat messages table
        $chat_sql = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}connect_now_messages (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            room_id VARCHAR(255) NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            message TEXT NOT NULL,
            translated_message LONGTEXT,
            attachment_url VARCHAR(500),
            attachment_type VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY room_id (room_id),
            KEY user_id (user_id)
        ) $charset_collate;";

        // Call history table
        $history_sql = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}connect_now_call_history (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            room_id VARCHAR(255) NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            join_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            leave_time DATETIME,
            duration_seconds INT(11),
            location_country VARCHAR(100),
            device_type VARCHAR(50),
            PRIMARY KEY (id),
            KEY room_id (room_id),
            KEY user_id (user_id)
        ) $charset_collate;";

        // Signaling table
        $signaling_sql = "CREATE TABLE IF NOT EXISTS {$this->wpdb->prefix}connect_now_signaling (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            room_id VARCHAR(255) NOT NULL,
            from_user_id VARCHAR(100) NOT NULL,
            to_user_id VARCHAR(100) NOT NULL,
            signal_type VARCHAR(50) NOT NULL,
            signal_data LONGTEXT NOT NULL,
            is_consumed TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY room_id (room_id),
            KEY to_user_id (to_user_id),
            KEY is_consumed (is_consumed)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($rooms_sql);
        dbDelta($chat_sql);
        dbDelta($history_sql);
        dbDelta($signaling_sql);
    }

    public function get_room($room_id) {
        return $this->wpdb->get_row(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->prefix}connect_now_rooms WHERE room_id = %s",
                $room_id
            )
        );
    }

    public function create_room($room_data) {
        return $this->wpdb->insert(
            "{$this->wpdb->prefix}connect_now_rooms",
            $room_data
        );
    }

    public function get_messages($room_id, $limit = 50) {
        return $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM {$this->wpdb->prefix}connect_now_messages 
                WHERE room_id = %s 
                ORDER BY created_at DESC 
                LIMIT %d",
                $room_id,
                $limit
            )
        );
    }

    public function add_message($message_data) {
        return $this->wpdb->insert(
            "{$this->wpdb->prefix}connect_now_messages",
            $message_data
        );
    }
}
