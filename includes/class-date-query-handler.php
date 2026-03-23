<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class TC_Date_Query_Handler {

    private static $search_title = '';

    // =======================================================
    // 1. SELECTOR DE FECHAS (Coincidencia 100% Estricta + Zona Horaria CDMX)
    // =======================================================
    public static function get_tickera_dates( $current_event_id ) {
        if ( ! $current_event_id ) return array();

        $fechas_eventos = array();
        
        $event_title = get_the_title( $current_event_id );
        $clean_title = trim( str_replace( '[duplicate]', '', $event_title ) );
        self::$search_title = $clean_title;

        add_filter( 'posts_where', array( __CLASS__, 'filter_by_title' ), 10, 2 );

        // 1. Forzamos la zona horaria de Ciudad de México
        $tz = new DateTimeZone( 'America/Mexico_City' );
        $now = new DateTime( 'now', $tz );
        $current_time_str = $now->format( 'Y-m-d H:i:s' );

        $args = array(
            'post_type'        => 'tc_events',
            'post_status'      => 'publish',
            'posts_per_page'   => -1,
            'meta_key'         => 'event_date_time',
            'orderby'          => 'meta_value',
            'order'            => 'ASC',
            'suppress_filters' => true,
            'meta_query'       => array(
                array(
                    'key'     => 'event_date_time',
                    'value'   => $current_time_str, // Comparamos contra la hora exacta en CDMX
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
                
                // Filtro Estricto al 100%
                $loop_title = get_the_title( $post_id );
                $loop_clean = trim( str_replace( '[duplicate]', '', $loop_title ) );
                if ( strcasecmp( $clean_title, $loop_clean ) !== 0 ) {
                    continue; 
                }

                $stock_disponible = self::get_exact_stock( $post_id );
                if ( $stock_disponible <= 0 ) continue;

                $raw_date = get_post_meta( $post_id, 'event_date_time', true );
                $img_url  = get_the_post_thumbnail_url( $post_id, 'large' );
                
                if ( ! empty( $raw_date ) ) {
                    // Tratamos la fecha leída como si estuviera en CDMX
                    $date_obj = new DateTime( $raw_date, $tz );
                    $timestamp = $date_obj->getTimestamp();
                    
                    // Formateamos usando wp_date() con la zona horaria forzada
                    $fecha_completa = wp_date( 'F j, Y - g:i a', $timestamp, $tz );

                    $fechas_eventos[] = array(
                        'id'               => $post_id,
                        'titulo'           => $loop_title,
                        'fecha_formateada' => $fecha_completa,
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
            'fields' => 'ids'
        );
        
        $tickets_vinculados = get_posts( $args );
        if ( empty( $tickets_vinculados ) ) return 9999;

        $total_stock   = 0;
        $manages_stock = false;

        foreach ( $tickets_vinculados as $ticket_id ) {
            $product = wc_get_product( $ticket_id );
            if ( $product && $product->is_in_stock() ) {
                if ( $product->managing_stock() ) {
                    $manages_stock = true;
                    $total_stock  += intval( $product->get_stock_quantity() );
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

    // =======================================================
    // 2. CARTELERA PRINCIPAL (Zona Horaria CDMX)
    // =======================================================
    public static function get_unique_upcoming_events() {
        $eventos_unicos     = array();
        $titulos_procesados = array();

        $tz = new DateTimeZone( 'America/Mexico_City' );
        $now = new DateTime( 'now', $tz );
        $current_time_str = $now->format( 'Y-m-d H:i:s' );

        $args = array(
            'post_type'        => 'tc_events',
            'post_status'      => 'publish',
            'posts_per_page'   => -1,
            'meta_key'         => 'event_date_time',
            'orderby'          => 'date',
            'order'            => 'DESC',
            'suppress_filters' => true,
            'meta_query'       => array(
                array(
                    'key'     => 'event_date_time',
                    'value'   => $current_time_str,
                    'compare' => '>=',
                    'type'    => 'DATETIME'
                )
            )
        );

        $query = new WP_Query( $args );

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $raw_title   = get_the_title( $post_id );
                $title_parts = preg_split('/[-–\[\(]/', $raw_title);
                $base_title  = trim( $title_parts[0] );
                $base_title  = preg_replace('/\s+\d+$/', '', $base_title);
                $base_title  = trim( $base_title );
                $compare_title = mb_strtolower( $base_title );

                if ( in_array( $compare_title, $titulos_procesados ) ) continue;
                if ( self::get_exact_stock( $post_id ) <= 0 ) continue;

                $img_url = get_the_post_thumbnail_url( $post_id, 'large' );

                if ( $img_url ) {
                    $eventos_unicos[]     = array(
                        'id'          => $post_id,
                        'titulo_base' => $base_title,
                        'imagen'      => $img_url,
                        'permalink'   => get_permalink( $post_id )
                    );
                    $titulos_procesados[] = $compare_title;
                }
            }
            wp_reset_postdata();
        }
        return $eventos_unicos;
    }

    // =======================================================
    // 3. SIDEBAR (Zona Horaria CDMX estricta en Inicio y Fin)
    // =======================================================
    public static function get_all_upcoming_events( $limit = 10 ) {
        $eventos_sidebar = array();
        
        $tz = new DateTimeZone( 'America/Mexico_City' );
        $now = new DateTime( 'now', $tz );
        $current_time_str = $now->format( 'Y-m-d H:i:s' );

        $args = array(
            'post_type'        => 'tc_events',
            'post_status'      => 'publish',
            'posts_per_page'   => $limit,
            'meta_key'         => 'event_date_time',
            'orderby'          => 'meta_value',
            'order'            => 'ASC',
            'suppress_filters' => true,
            'meta_query'       => array(
                array(
                    'key'     => 'event_date_time',
                    'value'   => $current_time_str,
                    'compare' => '>=',
                    'type'    => 'DATETIME'
                )
            )
        );

        $query = new WP_Query( $args );

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $stock_disponible = self::get_exact_stock( $post_id );
                if ( $stock_disponible <= 0 ) continue;

                $raw_date     = get_post_meta( $post_id, 'event_date_time', true );
                $raw_end_date = get_post_meta( $post_id, 'event_end_date_time', true );
                $img_url      = get_the_post_thumbnail_url( $post_id, 'large' );
                
                if ( ! empty( $raw_date ) ) {
                    // Instanciamos el objeto de fecha usando la zona horaria estricta
                    $date_obj = new DateTime( $raw_date, $tz );
                    $timestamp = $date_obj->getTimestamp();
                    
                    // Formateamos pasando el objeto $tz
                    $hora_completa    = wp_date( 'g:i a', $timestamp, $tz );
                    $fecha_formateada = wp_date( 'F j, Y - g:i a', $timestamp, $tz );
                    
                    if ( ! empty( $raw_end_date ) ) {
                        $end_date_obj = new DateTime( $raw_end_date, $tz );
                        $end_timestamp = $end_date_obj->getTimestamp();
                        
                        $start_day = wp_date( 'Y-m-d', $timestamp, $tz );
                        $end_day   = wp_date( 'Y-m-d', $end_timestamp, $tz );
                        
                        if ( $start_day === $end_day ) {
                            $hora_completa    .= ' - ' . wp_date( 'g:i a', $end_timestamp, $tz );
                            $fecha_formateada .= ' – ' . wp_date( 'g:i a', $end_timestamp, $tz );
                        } else {
                            $hora_completa    .= ' - ' . wp_date( 'M j, g:i a', $end_timestamp, $tz );
                            $fecha_formateada .= ' – ' . wp_date( 'F j, Y - g:i a', $end_timestamp, $tz );
                        }
                    }

                    $eventos_sidebar[] = array(
                        'id'               => $post_id,
                        'titulo'           => get_the_title( $post_id ),
                        'mes'              => wp_date( 'M', $timestamp, $tz ),
                        'dia'              => wp_date( 'j', $timestamp, $tz ),
                        'hora'             => $hora_completa,
                        'fecha_formateada' => $fecha_formateada,
                        'imagen'           => $img_url ? $img_url : '',
                        'stock'            => $stock_disponible,
                        'permalink'        => get_permalink( $post_id )
                    );
                }
            }
            wp_reset_postdata();
        }
        return $eventos_sidebar;
    }
}