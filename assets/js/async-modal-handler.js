document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.tc-trigger-modal-btn');
    const modal = document.getElementById('tc-checkout-modal');
    const closeModalBtn = document.querySelector('.tc-modal-close');
    const wrapper = document.getElementById('tc-tickera-component-wrapper');

    // Función centralizada para cerrar el modal y restaurar la página
    const closeAndCleanModal = () => {
        modal.classList.add('tc-modal-hidden');
        wrapper.innerHTML = ''; 
        // Restauramos el scroll y la interacción del fondo
        document.body.classList.remove('tc-modal-open');
    };

    buttons.forEach(button => {
        button.addEventListener('click', async function() {
            const eventUrl = button.getAttribute('data-url');
            const imgUrl = button.getAttribute('data-img');
            const eventTitle = button.getAttribute('data-title');
            const eventDate = button.getAttribute('data-date');
            
            const absoluteMaxStock = parseInt(button.getAttribute('data-stock')) || 9999;
            
            const figureContainer = modal.querySelector('.img-product-container figure');
            const titleContainer = modal.querySelector('.tc-modal-title');
            const dateContainer = modal.querySelector('.tc-modal-date');

            if (imgUrl) {
                figureContainer.innerHTML = `<img src="${imgUrl}" alt="${eventTitle}" style="width: 100%; height: auto; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
            } else {
                figureContainer.innerHTML = ''; 
            }

            titleContainer.textContent = eventTitle;
            dateContainer.textContent = `🕒 ${eventDate}`;
            
            // Abrimos el modal y BLOQUEAMOS el fondo
            modal.classList.remove('tc-modal-hidden');
            document.body.classList.add('tc-modal-open');
            
            wrapper.innerHTML = '<p style="text-align:center;">Cargando tickets disponibles...</p>';

            try {
                const response = await fetch(eventUrl);
                const htmlString = await response.text();
                
                const parser = new DOMParser();
                const virtualDOM = parser.parseFromString(htmlString, 'text/html');
                const tickeraComponent = virtualDOM.querySelector('.tickera');

                if (tickeraComponent) {
                    const finalBuyBtn = tickeraComponent.querySelector('.add_to_cart_button');

                    if (finalBuyBtn) {
                        const productId = finalBuyBtn.getAttribute('data-product_id');
                        
                        if (productId) {
                            const formData = new URLSearchParams();
                            formData.append('action', 'tc_get_exact_product_stock');
                            formData.append('product_id', productId);
                            formData.append('nonce', tcEdrConfig.nonce);

                            try {
                                const stockRes = await fetch(tcEdrConfig.ajaxUrl, { method: 'POST', body: formData });
                                const stockData = await stockRes.json();
                                
                                if (stockData.success) {
                                    absoluteMaxStock = parseInt(stockData.data.stock);
                                }
                            } catch (e) {
                                console.error("Error al consultar inventario en tiempo real", e);
                            }
                        }

                        if (!tickeraComponent.querySelector('.coco-qty-wrap')) {
                            const wrapperInner = document.createElement('div');
                            wrapperInner.className = 'coco-btn-wrapper-inner';
                            const qtyHTML = `
                                <div class="coco-qty-wrap">
                                    <button type="button" class="coco-qty-btn coco-minus">−</button>
                                    <input type="number" min="1" step="1" class="coco-qty" value="1" aria-label="Quantity">
                                    <button type="button" class="coco-qty-btn coco-plus">+</button>
                                </div>
                            `;
                            finalBuyBtn.parentNode.insertBefore(wrapperInner, finalBuyBtn);
                            wrapperInner.insertAdjacentHTML('afterbegin', qtyHTML);
                            wrapperInner.appendChild(finalBuyBtn);
                        }

                        wrapper.innerHTML = ''; 
                        wrapper.appendChild(tickeraComponent);

                        const qtyWrapOriginal = wrapper.querySelector('.coco-qty-wrap');
                        if (qtyWrapOriginal) {
                            const qtyWrapClone = qtyWrapOriginal.cloneNode(true);
                            qtyWrapOriginal.parentNode.replaceChild(qtyWrapClone, qtyWrapOriginal);
                        }

                        const qtyInput = wrapper.querySelector('.coco-qty');
                        const btnMinus = wrapper.querySelectorAll('.coco-qty-btn')[0];
                        const btnPlus = wrapper.querySelectorAll('.coco-qty-btn')[1];
                        const newBuyBtn = wrapper.querySelector('.add_to_cart_button');

                        if (newBuyBtn && qtyInput && btnMinus && btnPlus) {
                            newBuyBtn.textContent = 'BUY TICKETS';
                            qtyInput.removeAttribute('max');

                            const updateCartState = (newQty) => {
                                qtyInput.value = newQty;
                                newBuyBtn.setAttribute('data-quantity', newQty); 
                            };

                            btnMinus.addEventListener('click', () => {
                                let current = parseInt(qtyInput.value) || 1;
                                if (current > 1) {
                                    updateCartState(current - 1);
                                    btnPlus.style.opacity = '1'; 
                                    btnPlus.style.cursor = 'pointer';
                                }
                            });

                            btnPlus.addEventListener('click', () => {
                                let current = parseInt(qtyInput.value) || 1;
                                
                                if (current < absoluteMaxStock) {
                                    updateCartState(current + 1);
                                } else {
                                    btnPlus.style.opacity = '0.4';
                                    btnPlus.style.cursor = 'not-allowed';
                                }
                            });

                            qtyInput.addEventListener('input', (e) => {
                                let current = parseInt(e.target.value) || 1;
                                if (current < 1) current = 1;
                                if (current > absoluteMaxStock) current = absoluteMaxStock; 
                                updateCartState(current);
                            });
                        }
                    }

                } else {
                    wrapper.innerHTML = '<p style="text-align:center;">Lo sentimos, no se encontraron opciones de ticket.</p>';
                }

            } catch (error) {
                console.error("Error al cargar el fragmento DOM:", error);
                wrapper.innerHTML = '<p style="text-align:center;">Error de red al cargar el evento.</p>';
            }
        });
    });

    // 1. Evento para cerrar mediante el botón de la "X"
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeAndCleanModal);
    }

    // 2. Evento para cerrar al hacer clic afuera del modal (en el overlay oscuro)
    window.addEventListener('click', (e) => {
        // Verificamos si el elemento clickeado es exactamente el fondo del modal
        if (e.target === modal) {
            closeAndCleanModal();
        }
    });
});

if (typeof jQuery !== 'undefined') {
    jQuery(document.body).on('added_to_cart', function(event, fragments, cart_hash, $button) {
        if ($button && $button.closest('#tc-checkout-modal').length > 0) {
            $button.text('Redirigiendo...');
            window.location.href = '/cart/';
        }
    });
}