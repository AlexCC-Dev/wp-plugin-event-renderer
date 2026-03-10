<?php
class TC_Modal_UI_Builder {

    // Renderiza la vista inicial (solo fechas)
    public static function render_date_grid( $atts ) {
        $atts = shortcode_atts( array(
            'id' => get_the_ID(), 
        ), $atts, 'tc_date_selector' );

        $evento_id = intval( $atts['id'] );
        $fechas_eventos = TC_Date_Query_Handler::get_tickera_dates( $evento_id );
        
        ob_start();
        ?>
        <div class="tc-date-grid-container">
            <?php foreach ( $fechas_eventos as $evento ) : ?>
                <button class="tc-trigger-modal-btn" data-url="<?php echo esc_url( get_permalink( $evento['id'] ) ); ?>">
                    <?php echo esc_html( $evento['fecha_formateada'] ); ?>
                </button>
            <?php endforeach; ?>
        </div>

        <div id="tc-checkout-modal" class="tc-modal-hidden">
            <div class="tc-modal-content">
                <span class="tc-modal-close">&times;</span>
                <div id="tc-tickera-component-wrapper">
                    <div class="coco-qty-wrap"></div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    // Responde a la petición de JS y devuelve el componente oficial de Tickera
    public static function ajax_load_tickera_component() {
        check_ajax_referer( 'tc_edr_secure_nonce', 'nonce' );

        $evento_id = isset( $_POST['evento_id'] ) ? intval( $_POST['evento_id'] ) : 0;

        if ( $evento_id > 0 ) {
            // Renderizamos el shortcode nativo de Tickera pasándole el ID del evento seleccionado
            // Nota: Ajusta "[tickera]" al shortcode exacto que uses para el botón de compra
            $tickera_html = do_shortcode( '[tickera event_id="' . $evento_id . '"]' );
            wp_send_json_success( $tickera_html );
        } else {
            wp_send_json_error( 'ID de evento inválido' );
        }
        wp_die();
    }
}