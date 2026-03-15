<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class TC_Date_Query_Handler {

    private static $search_title = '';

    public static function get_tickera_dates( $current_event_id ) {
        if ( ! $current_event_id ) return array();

        $fechas_eventos = array();
        $event_title = get_the_title( $current_event_id );
        
        $clean_title = trim( str_replace( '[duplicate]', '', $event_title ) );
        self::$search_title = $clean_title;

        add_filter( 'posts_where', array( __CLASS__, 'filter_by_title' ), 10, 2 );

        $args = array(
            'post_type'      => 'tc_events',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'meta_key'       => 'event_date_time',
            'orderby'        => 'meta_value',
            'order'          => 'ASC',
            'meta_query'     => array(
                array(
                    'key'     => 'event_date_time',
                    'value'   => current_time( 'Y-m-d H:i:s' ),
                    'compare' => '>=',
                    'type'    => 'DATETIME'
                )
            )
        );

        $query = new WP_Query( $args );
        remove_filter( 'posts_where', array( __CLASS__, 'filter_by_title' ), 10 );

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $stock_disponible = self::get_exact_stock( $post_id );
                
                if ( $stock_disponible <= 0 ) {
                    continue; 
                }

                $raw_date = get_post_meta( $post_id, 'event_date_time', true );
                $img_url = get_the_post_thumbnail_url( $post_id, 'large' );
                
                if ( ! empty( $raw_date ) ) {
                    $timestamp = strtotime( $raw_date );
                    $fechas_eventos[] = array(
                        'id'               => $post_id,
                        'titulo'           => get_the_title( $post_id ),
                        'fecha_formateada' => wp_date( 'F j, Y - g:i a', $timestamp ),
                        'imagen'           => $img_url ? $img_url : '',
                        'stock'            => $stock_disponible
                    );
                }
            }
            wp_reset_postdata();
        }

        return $fechas_eventos;
    }

    private static function get_exact_stock( $event_id ) {
        if ( ! class_exists( 'WooCommerce' ) ) return 9999; 

        $args = array(
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'meta_query'     => array(
                array(
                    'key'     => '_tickera_event_id',
                    'value'   => $event_id,
                    'compare' => '='
                )
            ),
            'fields'         => 'ids'
        );
        
        $tickets_vinculados = get_posts( $args );

        if ( empty( $tickets_vinculados ) ) return 9999; 

        $total_stock = 0;
        $manages_stock = false;

        foreach ( $tickets_vinculados as $ticket_id ) {
            $product = wc_get_product( $ticket_id );
            if ( $product && $product->is_in_stock() ) {
                if ( $product->managing_stock() ) {
                    $manages_stock = true;
                    // Forzamos el parseo a entero para evitar strings vacíos
                    $stock = intval( $product->get_stock_quantity() );
                    $total_stock += $stock;
                }
            }
        }

        return $manages_stock ? $total_stock : 9999;
    }

    public static function filter_by_title( $where, $wp_query ) {
        global $wpdb;
        if ( self::$search_title ) {
            $where .= $wpdb->prepare( " AND {$wpdb->posts}.post_title LIKE %s", self::$search_title . '%' );
        }
        return $where;
    }
}