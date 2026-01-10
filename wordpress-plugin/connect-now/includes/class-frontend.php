<?php
namespace ConnectNow\Frontend;

class Frontend {
    private static $instance = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_shortcode('connect_now', [$this, 'render_meeting_room']);
        add_shortcode('connect_now_lobby', [$this, 'render_lobby']);
    }

    public function enqueue_scripts() {
        // Only load on pages with ConnectNow shortcodes
        wp_enqueue_script(
            'connect-now-app',
            CONNECT_NOW_PLUGIN_URL . 'assets/js/app.js',
            ['react', 'react-dom'],
            CONNECT_NOW_VERSION,
            true
        );

        wp_enqueue_style(
            'connect-now-styles',
            CONNECT_NOW_PLUGIN_URL . 'assets/css/style.css',
            [],
            CONNECT_NOW_VERSION
        );

        // Pass PHP variables to JavaScript
        wp_localize_script('connect-now-app', 'connectNowConfig', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('connect_now_nonce'),
            'userId' => get_current_user_id(),
            'restUrl' => rest_url('connect-now/v1'),
        ]);
    }

    public function render_lobby() {
        ob_start();
        ?>
        <div id="connect-now-lobby" class="connect-now-app">
            <div class="lobby-container">
                <h1><?php esc_html_e('ConnectNow - Video Conferencing', 'connect-now'); ?></h1>
                <div id="lobby-content"></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    public function render_meeting_room($atts) {
        $atts = shortcode_atts(['room_id' => ''], $atts);
        
        if (empty($atts['room_id'])) {
            return '<p>' . esc_html__('Room ID is required', 'connect-now') . '</p>';
        }

        ob_start();
        ?>
        <div id="connect-now-room" class="connect-now-app" data-room-id="<?php echo esc_attr($atts['room_id']); ?>">
            <div id="meeting-content"></div>
        </div>
        <?php
        return ob_get_clean();
    }
}
