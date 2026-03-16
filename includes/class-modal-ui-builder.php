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
                        data-date="<?php echo esc_attr( $evento['fecha_formateada'] ); ?>"
                        data-stock="<?php echo esc_attr( $evento['stock'] ); ?>"> <?php echo esc_html( $evento['fecha_formateada'] ); ?>
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

    // NUEVO 1: Cartelera Principal (Muestra solo las imágenes)
    public static function render_master_billboard() {
        $eventos = TC_Date_Query_Handler::get_unique_upcoming_events();

        if ( empty( $eventos ) ) return '<p style="text-align:center;">No hay eventos próximos programados.</p>';

        ob_start();
        ?>
        <div class="tc-master-billboard-grid">
            <?php foreach ( $eventos as $evento ) : ?>
                <a href="<?php echo esc_url( $evento['permalink'] ); ?>" class="tc-event-image-card">
                    <img src="<?php echo esc_url( $evento['imagen'] ); ?>" alt="<?php echo esc_attr( $evento['titulo_base'] ); ?>">
                </a>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    // NUEVO 2: Lista Lateral de Eventos
    public static function render_upcoming_sidebar() {
        $eventos = TC_Date_Query_Handler::get_all_upcoming_events( 10 );

        if ( empty( $eventos ) ) return '<p>No hay eventos próximos.</p>';

        ob_start();
        ?>
        <div class="tc-upcoming-sidebar-wrapper">
            <h3 class="tc-sidebar-title">Upcoming Events</h3>
            <ul class="tc-upcoming-list">
                <?php foreach ( $eventos as $evento ) : ?>
                    <li>
                        <a href="<?php echo esc_url( $evento['permalink'] ); ?>" class="tc-upcoming-item-link">
                            <div class="tc-upcoming-date">
                                <span class="tc-month"><?php echo esc_html( strtoupper( $evento['mes'] ) ); ?></span>
                                <span class="tc-day"><?php echo esc_html( $evento['dia'] ); ?></span>
                            </div>
                            <div class="tc-upcoming-details">
                                <span class="tc-time"><?php echo esc_html( $evento['hora'] ); ?></span>
                                <span class="tc-title"><?php echo esc_html( $evento['titulo'] ); ?></span>
                            </div>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php
        return ob_get_clean();
    }
}