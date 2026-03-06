<?php
/**
 * Plugin Name: TC Event Date Renderer & Modal
 * Description: Interfaz asíncrona para renderizar fechas de Tickera y cargar el checkout en un modal.
 * Version: 1.0.0
 * Author: Tu Nombre
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Seguridad

// Cargar dependencias
require_once plugin_dir_path( __FILE__ ) . 'includes/class-date-query-handler.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-modal-ui-builder.php';

add_action( 'wp_enqueue_scripts', 'tc_edr_enqueue_assets' );
function tc_edr_enqueue_assets() {
    wp_enqueue_style( 'tc-edr-modal-css', plugin_dir_url( __FILE__ ) . 'assets/css/modal-layout.css' );
    wp_enqueue_script( 'tc-edr-modal-js', plugin_dir_url( __FILE__ ) . 'assets/js/async-modal-handler.js', array(), '1.0.0', true );
    
    // Pasar la URL de AJAX al frontend
    wp_localize_script( 'tc-edr-modal-js', 'tcEdrConfig', array(
        'ajaxUrl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'tc_edr_secure_nonce' )
    ));
}

// Registrar el Shortcode [tc_date_selector]
add_shortcode( 'tc_date_selector', array( 'TC_Modal_UI_Builder', 'render_date_grid' ) );

// Registrar el endpoint AJAX para inyectar el componente de Tickera
add_action( 'wp_ajax_nopriv_load_tickera_component', array( 'TC_Modal_UI_Builder', 'ajax_load_tickera_component' ) );
add_action( 'wp_ajax_load_tickera_component', array( 'TC_Modal_UI_Builder', 'ajax_load_tickera_component' ) );