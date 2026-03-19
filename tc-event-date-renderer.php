<?php
/**
 * Plugin Name: Event Date Bridge for Tickera & WooCommerce
 * Description: Interfaz asíncrona para renderizar fechas de Tickera y cargar el checkout en un modal.
 * Version: 1.0.1
 * Author: Pospago
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Seguridad

require_once plugin_dir_path( __FILE__ ) . 'includes/class-date-query-handler.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/class-modal-ui-builder.php';

add_action( 'wp_enqueue_scripts', 'tc_edr_enqueue_assets' );
function tc_edr_enqueue_assets() {
    wp_enqueue_style( 'tc-edr-modal-css', plugin_dir_url( __FILE__ ) . 'assets/css/modal-layout.css' );
    wp_enqueue_script( 'tc-edr-modal-js', plugin_dir_url( __FILE__ ) . 'assets/js/async-modal-handler.js', array(), time(), true );
    
    // RESTAURADO: Necesitamos pasarle al JS la ruta segura para consultar el stock
    wp_localize_script( 'tc-edr-modal-js', 'tcEdrConfig', array(
        'ajaxUrl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'tc_edr_secure_nonce' )
    ));
}

add_shortcode( 'tc_date_selector', array( 'TC_Modal_UI_Builder', 'render_date_grid' ) );
add_shortcode( 'tc_cartelera_unica', array( 'TC_Modal_UI_Builder', 'render_master_billboard' ) );
add_shortcode( 'tc_upcoming_sidebar', array( 'TC_Modal_UI_Builder', 'render_upcoming_sidebar' ) );
// =========================================================================
// NUEVO ENDPOINT AJAX: Consulta el stock exacto del ID del Producto
// =========================================================================
add_action( 'wp_ajax_nopriv_tc_get_exact_product_stock', 'tc_get_exact_product_stock_callback' );
add_action( 'wp_ajax_tc_get_exact_product_stock', 'tc_get_exact_product_stock_callback' );

function tc_get_exact_product_stock_callback() {
    check_ajax_referer( 'tc_edr_secure_nonce', 'nonce' );

    $product_id = isset( $_POST['product_id'] ) ? intval( $_POST['product_id'] ) : 0;

    if ( $product_id > 0 && class_exists( 'WooCommerce' ) ) {
        $product = wc_get_product( $product_id );
        
        if ( $product ) {
            // Si gestiona stock, devolvemos la cantidad exacta de la base de datos
            if ( $product->managing_stock() ) {
                $stock = intval( $product->get_stock_quantity() );
                wp_send_json_success( array( 'stock' => $stock ) );
            } else {
                // Si no tiene la casilla de "Gestión de inventario" marcada, es ilimitado
                wp_send_json_success( array( 'stock' => 9999 ) ); 
            }
        }
    }
    
    wp_send_json_error( 'Producto no encontrado' );
    wp_die();