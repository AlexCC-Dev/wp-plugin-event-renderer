<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class TC_Date_Query_Handler {

    private static $search_title = '';

    public static function get_tickera_dates( $current_event_id ) {
        if ( ! $current_event_id ) return array();

        $fechas_eventos = array();
        
        // 1. Obtenemos el nombre del evento actual
        $event_title = get_the_title( $current_event_id );
        
        // 2. Limpieza de sufijos para agrupar todos los shows hermanos
        $clean_title = trim( str_replace( '[duplicate]', '', $event_title ) );
        self::$search_title = $clean_title;

        // 3. Inyectamos filtro SQL para buscar por coincidencia de nombre
        add_filter( 'posts_where', array( __CLASS__, 'filter_by_title' ), 10, 2 );

        $args = array(
            'post_type'      => 'tc_events',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'meta_key'       => 'event_date_time',
            'orderby'        => 'meta_value',
            'order'          => 'ASC', 
            
            // Filtramos estrictamente desde este preciso minuto hacia el futuro.
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
        
        // Retiramos filtro para no ensuciar otras consultas de WordPress
        remove_filter( 'posts_where', array( __CLASS__, 'filter_by_title' ), 10 );

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();
                
                // Mantenemos la regla de stock
                $stock_disponible = self::get_exact_stock( $post_id );
                
                if ( $stock_disponible <= 0 ) {
                    continue; 
                }

                $raw_date = get_post_meta( $post_id, 'event_date_time', true );
                // Extraemos también la hora de finalización
                /*$raw_end_date = get_post_meta( $post_id, 'event_end_date_time', true );
                */
                $img_url = get_the_post_thumbnail_url( $post_id, 'large' );
                
                if ( ! empty( $raw_date ) ) {
                    $timestamp = strtotime( $raw_date );
                    
                    // Construimos la fecha base con la hora de inicio
                    $fecha_completa = wp_date( 'F j, Y - g:i a', $timestamp );
                    
                    // Si el evento tiene configurada una hora de cierre, la agregamos
                    /*if ( ! empty( $raw_end_date ) ) {
                        $end_timestamp = strtotime( $raw_end_date );
                        $fecha_completa .= ' – ' . wp_date( 'g:i a', $end_timestamp );
                    }*/

                    $fechas_eventos[] = array(
                        'id'               => $post_id,
                        'titulo'           => get_the_title( $post_id ),
                        'fecha_formateada' => $fecha_completa, // Mandamos la cadena completa
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

    // =======================================================
    // 2. CARTELERA PRINCIPAL (Solo futuros, agrupa por nombre y prioriza el último creado)
    // =======================================================
    public static function get_unique_upcoming_events() {
        $eventos_unicos = array();
        $titulos_procesados = array();

        $args = array(
            'post_type'      => 'tc_events',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'meta_key'       => 'event_date_time',
            'orderby'        => 'date',
            'order'          => 'DESC',
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

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $raw_title = get_the_title( $post_id );
                
                // 1. Cortar en guiones, corchetes o paréntesis (Ej: "Titulo - Copia" -> "Titulo ")
                $title_parts = preg_split('/[-–\[\(]/', $raw_title);
                $base_title = trim( $title_parts[0] );
                
                // 2. NUEVA MAGIA REGEX: Eliminar números secuenciales sueltos al final del string
                // Esto convierte "Título Ejemplo 3" en "Título Ejemplo"
                $base_title = preg_replace('/\s+\d+$/', '', $base_title);
                $base_title = trim( $base_title );

                // 3. Normalizamos a minúsculas para que la validación sea a prueba de balas
                $compare_title = mb_strtolower( $base_title );

                // Si ya guardamos el evento más reciente con este nombre, ignoramos los viejos
                if ( in_array( $compare_title, $titulos_procesados ) ) {
                    continue; 
                }
                
                if ( self::get_exact_stock( $post_id ) <= 0 ) {
                    continue; 
                }

                $img_url = get_the_post_thumbnail_url( $post_id, 'large' );

                if ( $img_url ) {
                    $eventos_unicos[] = array(
                        'id'               => $post_id,
                        'titulo_base'      => $base_title, // Guardamos el nombre limpio sin el número
                        'imagen'           => $img_url,
                        'permalink'        => get_permalink( $post_id )
                    );
                    
                    // Registramos que ya encontramos al "representante" de este show
                    $titulos_procesados[] = $compare_title; 
                }
            }
            wp_reset_postdata();
        }
        return $eventos_unicos;
    }

    // NUEVO 2: Lista Sidebar desglosada (Aislada para alimentar su propio modal)
    public static function get_all_upcoming_events( $limit = 10 ) {
        $eventos_sidebar = array();
        $args = array(
            'post_type'      => 'tc_events',
            'post_status'    => 'publish',
            'posts_per_page' => $limit,
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

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $stock_disponible = self::get_exact_stock( $post_id );
                if ( $stock_disponible <= 0 ) continue;

                $raw_date = get_post_meta( $post_id, 'event_date_time', true );
                /*$raw_end_date = get_post_meta( $post_id, 'event_end_date_time', true );*/ 
                $img_url = get_the_post_thumbnail_url( $post_id, 'large' ); // Extraemos la imagen
                
                if ( ! empty( $raw_date ) ) {
                    $timestamp = strtotime( $raw_date );
                    
                    $hora_completa = wp_date( 'g:i a', $timestamp );
                    $fecha_formateada = wp_date( 'F j, Y - g:i a', $timestamp ); // Fecha para el modal
                    
                    /*if ( ! empty( $raw_end_date ) ) {
                        $end_timestamp = strtotime( $raw_end_date );
                        $hora_completa .= ' - ' . wp_date( 'g:i a', $end_timestamp );
                        $fecha_formateada .= ' – ' . wp_date( 'g:i a', $end_timestamp );
                    }*/

                    $eventos_sidebar[] = array(
                        'id'               => $post_id,
                        'titulo'           => get_the_title( $post_id ),
                        'mes'              => wp_date( 'M', $timestamp ),
                        'dia'              => wp_date( 'j', $timestamp ),
                        'hora'             => $hora_completa,
                        'fecha_formateada' => $fecha_formateada,
                        'imagen'           => $img_url ? $img_url : '', // Enviamos imagen
                        'stock'            => $stock_disponible,        // Enviamos stock
                        'permalink'        => get_permalink( $post_id )
                    );
                }
            }
            wp_reset_postdata();
        }
        return $eventos_sidebar;
    }
}