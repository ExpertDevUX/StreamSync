<?php
namespace ConnectNow\API;

use ConnectNow\Database\Database;

class API {
    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes() {
        // Create room
        register_rest_route('connect-now/v1', '/rooms', [
            'methods' => 'POST',
            'callback' => [$this, 'create_room'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        // Get room
        register_rest_route('connect-now/v1', '/rooms/(?P<room_id>[^/]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_room'],
            'permission_callback' => '__return_true',
        ]);

        // Send message
        register_rest_route('connect-now/v1', '/messages', [
            'methods' => 'POST',
            'callback' => [$this, 'send_message'],
            'permission_callback' => [$this, 'check_permission'],
        ]);

        // WebRTC signaling
        register_rest_route('connect-now/v1', '/signaling', [
            'methods' => ['GET', 'POST'],
            'callback' => [$this, 'handle_signaling'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function create_room(\WP_REST_Request $request) {
        $db = Database::get_instance();
        
        $room_data = [
            'room_id' => sanitize_text_field($request->get_param('room_id')),
            'room_name' => sanitize_text_field($request->get_param('room_name')),
            'call_type' => sanitize_text_field($request->get_param('call_type')),
            'owner_id' => get_current_user_id(),
            'is_private' => (int)$request->get_param('is_private'),
            'password_hash' => $request->get_param('password') ? wp_hash_password($request->get_param('password')) : null,
        ];

        if ($db->create_room($room_data)) {
            return new \WP_REST_Response(['success' => true, 'room_id' => $room_data['room_id']], 201);
        }

        return new \WP_REST_Response(['error' => 'Failed to create room'], 400);
    }

    public function get_room(\WP_REST_Request $request) {
        $db = Database::get_instance();
        $room_id = sanitize_text_field($request->get_param('room_id'));
        $room = $db->get_room($room_id);

        if ($room) {
            return new \WP_REST_Response($room, 200);
        }

        return new \WP_REST_Response(['error' => 'Room not found'], 404);
    }

    public function send_message(\WP_REST_Request $request) {
        $db = Database::get_instance();
        
        $message_data = [
            'room_id' => sanitize_text_field($request->get_param('room_id')),
            'user_id' => get_current_user_id(),
            'message' => wp_kses_post($request->get_param('message')),
            'attachment_url' => sanitize_url($request->get_param('attachment_url')),
            'attachment_type' => sanitize_text_field($request->get_param('attachment_type')),
        ];

        if ($db->add_message($message_data)) {
            return new \WP_REST_Response(['success' => true], 201);
        }

        return new \WP_REST_Response(['error' => 'Failed to send message'], 400);
    }

    public function handle_signaling(\WP_REST_Request $request) {
        // WebRTC signaling implementation
        return new \WP_REST_Response(['success' => true], 200);
    }

    public function check_permission() {
        return is_user_logged_in();
    }
}
