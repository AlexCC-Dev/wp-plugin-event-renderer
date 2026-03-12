document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.tc-trigger-modal-btn');
    const modal = document.getElementById('tc-checkout-modal');
    const closeModal = document.querySelector('.tc-modal-close');
    const wrapper = document.getElementById('tc-tickera-component-wrapper');

    buttons.forEach(button => {
        button.addEventListener('click', async function() {
            const eventUrl = this.getAttribute('data-url');
            const imgUrl = this.getAttribute('data-img'); // 1. Capturamos la imagen
            const figureContainer = modal.querySelector('.img-product-container figure');
            const eventTitle = this.getAttribute('data-title'); // Capturamos el título
            const eventDate = this.getAttribute('data-date');
            const titleContainer = modal.querySelector('.tc-modal-title');
            const dateContainer = modal.querySelector('.tc-modal-date');

            
            if (imgUrl) {
                figureContainer.innerHTML = `<img src="${imgUrl}" alt="Event Ticket" style="width: 100%; height: auto; border-radius: 8px; object-fit: cover;">`;
            } else {
                // Limpiamos o ponemos una imagen por defecto si el evento no tiene foto
                figureContainer.innerHTML = ''; 
            }
            
            titleContainer.textContent = eventTitle;
            dateContainer.textContent = `${eventDate}`;

            modal.classList.remove('tc-modal-hidden');
            wrapper.innerHTML = '<p style="text-align:center;">Cargando tickets disponibles...</p>';

            try {
                const response = await fetch(eventUrl);
                const htmlString = await response.text();
                
                const parser = new DOMParser();
                const virtualDOM = parser.parseFromString(htmlString, 'text/html');
                
                const tickeraComponent = virtualDOM.querySelector('.tickera');

                if (tickeraComponent) {
                    // 1. Buscamos el botón de compra nativo de WooCommerce dentro del componente
                    const buyBtn = tickeraComponent.querySelector('.add_to_cart_button');
                    
                    // 2. Si el botón existe, pero NO trae el contador, lo construimos e inyectamos
                    if (buyBtn && !tickeraComponent.querySelector('.coco-qty-wrap')) {
                        
                        // Envolvemos el botón en la estructura que usa tu tema
                        const wrapperInner = document.createElement('div');
                        wrapperInner.className = 'coco-btn-wrapper-inner';
                        
                        // Construimos el HTML exacto
                        const qtyHTML = `
                            <div class="coco-qty-wrap">
                                <button type="button" class="coco-qty-btn coco-minus">−</button>
                                <input type="number" min="1" step="1" class="coco-qty" value="1" aria-label="Quantity">
                                <button type="button" class="coco-qty-btn coco-plus">+</button>
                            </div>
                        `;
                        
                        // Insertamos el wrapper antes del botón de compra y metemos el botón dentro
                        buyBtn.parentNode.insertBefore(wrapperInner, buyBtn);
                        wrapperInner.insertAdjacentHTML('afterbegin', qtyHTML);
                        wrapperInner.appendChild(buyBtn);
                    }

                    // 3. Imprimimos el componente en pantalla
                    wrapper.innerHTML = ''; 
                    wrapper.appendChild(tickeraComponent);

                    // 4. Reactivamos la lógica del contador ya renderizado en el modal
                    const qtyInput = wrapper.querySelector('.coco-qty');
                    const btnMinus = wrapper.querySelector('.coco-minus') || wrapper.querySelectorAll('.coco-qty-btn')[0];
                    const btnPlus = wrapper.querySelector('.coco-plus') || wrapper.querySelectorAll('.coco-qty-btn')[1];

                    if (buyBtn) {
                        
                        buyBtn.textContent = 'BUY TICKETS';

                        if (qtyInput && btnMinus && btnPlus) {
                            
                            // Leemos el stock disponible desde la base de datos (atributo max nativo)
                            const maxStock = qtyInput.hasAttribute('max') && qtyInput.getAttribute('max') !== '' 
                                ? parseInt(qtyInput.getAttribute('max')) 
                                : Infinity; // Si no hay límite, lo dejamos infinito

                            const updateCartState = (newQty) => {
                                qtyInput.value = newQty;
                                buyBtn.setAttribute('data-quantity', newQty); 
                            };

                            btnMinus.addEventListener('click', () => {
                                let current = parseInt(qtyInput.value) || 1;
                                if (current > 1) {
                                    updateCartState(current - 1);
                                    btnPlus.style.opacity = '1'; // Restaurar aspecto visual
                                }
                            });

                            btnPlus.addEventListener('click', () => {
                                let current = parseInt(qtyInput.value) || 1;
                                
                                // Validación estricta de stock
                                if (current < maxStock) {
                                    updateCartState(current + 1);
                                } else {
                                    // Feedback visual si intentan comprar más boletos de los que existen
                                    btnPlus.style.opacity = '0.4';
                                    btnPlus.style.cursor = 'not-allowed';
                                }
                            });

                            qtyInput.addEventListener('input', (e) => {
                                let current = parseInt(e.target.value) || 1;
                                if (current < 1) current = 1;
                                if (current > maxStock) current = maxStock; // Bloqueo de teclado
                                updateCartState(current);
                            });
                        }
                    }

                } else {
                    wrapper.innerHTML = '<p style="text-align:center;">Lo sentimos, no se encontraron opciones de ticket para esta fecha.</p>';
                }

            } catch (error) {
                console.error("Error al cargar el fragmento DOM:", error);
                wrapper.innerHTML = '<p style="text-align:center;">Error de red al cargar el evento.</p>';
            }
        });
    });

    closeModal.addEventListener('click', () => {
        modal.classList.add('tc-modal-hidden');
        wrapper.innerHTML = ''; 
    });
});

// Escuchador global para el evento de WooCommerce
if (typeof jQuery !== 'undefined') {
    // WooCommerce dispara 'added_to_cart' a través de jQuery cuando la inserción en BD es exitosa
    jQuery(document.body).on('added_to_cart', function(event, fragments, cart_hash, $button) {
        
        // Verificamos si el clic provino de nuestro modal para no afectar otros botones de la web
        if ($button && $button.closest('#tc-checkout-modal').length > 0) {
            
            // Cambiamos el texto del botón temporalmente para mejor UX
            $button.text('Redirigiendo...');
            
            // Redirección segura al carrito
            window.location.href = '/cart/';
        }
    });
}