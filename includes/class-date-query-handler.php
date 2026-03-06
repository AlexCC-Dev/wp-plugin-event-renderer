<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Prevenir acceso directo
}

class TC_Date_Query_Handler {

    // Variable temporal para pasar el título al filtro SQL
    private static $search_title = '';

    /**
     * Consulta la DB para obtener las fechas de los eventos que coincidan en nombre.
     */
    public static function get_tickera_dates( $current_event_id ) {
        if ( ! $current_event_id ) return array();

        $fechas_eventos = array();

        // 1. Obtenemos el nombre del evento actual
        $event_title = get_the_title( $current_event_id );
        
        // 2. Limpieza de sufijos: Quitamos etiquetas como "[duplicate]" o " - Copia" 
        // para que la coincidencia abarque todos los eventos hermanos.
        $clean_title = trim( str_replace( '[duplicate]', '', $event_title ) );
        
        self::$search_title = $clean_title;

        // 3. Inyectamos nuestro filtro SQL personalizado antes de la consulta
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

        // 4. Retiramos el filtro inmediatamente para no romper otras consultas en la web
        remove_filter( 'posts_where', array( __CLASS__, 'filter_by_title' ), 10 );

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $post_id = get_the_ID();
                $raw_date = get_post_meta( $post_id, 'event_date_time', true );
                
                if ( ! empty( $raw_date ) ) {
                    $timestamp = strtotime( $raw_date );
                    $fechas_eventos[] = array(
                        'id'               => $post_id,
                        'fecha_formateada' => wp_date( 'F j, Y - g:i a', $timestamp )
                    );
                }
            }
            wp_reset_postdata();
        }

        return $fechas_eventos;
    }

    /**
     * Filtro SQL para forzar la búsqueda por el título del evento usando LIKE.
     */
    public static function filter_by_title( $where, $wp_query ) {
        global $wpdb;
        if ( self::$search_title ) {
            // El comodín % al final permite encontrar "Nombre del Show" ignorando si 
            // la base de datos tiene algo más escrito después del nombre.
            $where .= $wpdb->prepare( " AND {$wpdb->posts}.post_title LIKE %s", self::$search_title . '%' );
        }
        return $where;
    }
}