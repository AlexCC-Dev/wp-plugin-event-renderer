<?php
class TC_Modal_UI_Builder {

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
                <button class="tc-trigger-modal-btn" 
                        data-url="<?php echo esc_url( get_permalink( $evento['id'] ) ); ?>"
                        data-img="<?php echo esc_url( $evento['imagen'] ); ?>"
                        data-title="<?php echo esc_attr( $evento['titulo'] ); ?>"
                        data-date="<?php echo esc_attr( $evento['fecha_formateada'] ); ?>">
                    <?php echo esc_html( $evento['fecha_formateada'] ); ?>
                </button>
            <?php endforeach; ?>
        </div>

        <div id="tc-checkout-modal" class="tc-modal-hidden">
            <div class="tc-modal-content">
                <span class="tc-modal-close">&times;</span>
                
                <div class="buy-modal-container">
                    
                    <div class="tc-modal-left-column">
                        <div class="img-product-container">
                            <figure class="wp-block-image size-full">
                                </figure>
                        </div>
                        <div class="tc-modal-event-info">
                            <h3 class="tc-modal-title"></h3>
                            <p class="tc-modal-date"></p>
                        </div>
                    </div>
                    
                    <div id="tc-tickera-component-wrapper" class="tc-modal-right-column">
                        <div class="coco-qty-wrap"></div>
                    </div>
                    
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}