// ============================================================================
// BLOQUE 1: CÓDIGO ORIGINAL (Modal Principal - Selector de Fechas)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.tc-trigger-modal-btn');
    const modal = document.getElementById('tc-checkout-modal');
    const closeModalBtn = document.querySelector('.tc-modal-close');
    const wrapper = document.getElementById('tc-tickera-component-wrapper');

    const closeAndCleanModal = () => {
        if(modal) modal.classList.add('tc-modal-hidden');
        if(wrapper) wrapper.innerHTML = ''; 
        document.body.classList.remove('tc-modal-open');
    };

    const showSoldOutState = (container) => {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; padding: 20px;">
                <h2 style="font-size: 3.5rem; font-weight: 900; color: #ffffff; margin: 0; line-height: 1; text-transform: uppercase; letter-spacing: 2px; text-align: center;">SOLD OUT</h2>
            </div>
        `;
    };

    if (buttons.length > 0 && modal) {
        buttons.forEach(button => {
            button.addEventListener('click', async function() {
                const eventUrl = button.getAttribute('data-url');
                const imgUrl = button.getAttribute('data-img');
                const eventTitle = button.getAttribute('data-title');
                const eventDate = button.getAttribute('data-date');
                
                let rawStock = parseInt(button.getAttribute('data-stock'));
                let globalMaxStock = isNaN(rawStock) ? 9999 : rawStock;
                
                const figureContainer = modal.querySelector('.img-product-container figure');
                const titleContainer = modal.querySelector('.tc-modal-title');
                const dateContainer = modal.querySelector('.tc-modal-date');

                if (imgUrl) {
                    figureContainer.innerHTML = `<img src="${imgUrl}" alt="${eventTitle}" style="width: 100%; height: auto; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
                } else {
                    figureContainer.innerHTML = ''; 
                }

                titleContainer.textContent = eventTitle;
                dateContainer.textContent = `${eventDate}`;
                
                modal.classList.remove('tc-modal-hidden');
                document.body.classList.add('tc-modal-open');
                
                if (globalMaxStock <= 0) {
                    showSoldOutState(wrapper);
                    return; 
                }

                wrapper.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; min-height:250px;"><p style="text-align:center; color:#fff; font-size:1.2rem;">Loading...</p></div>';

                try {
                    const response = await fetch(eventUrl);
                    const htmlString = await response.text();
                    const parser = new DOMParser();
                    const virtualDOM = parser.parseFromString(htmlString, 'text/html');
                    const tickeraComponent = virtualDOM.querySelector('.tickera');

                    if (tickeraComponent) {
                        const finalBuyBtns = Array.from(tickeraComponent.querySelectorAll('.add_to_cart_button'));

                        if (finalBuyBtns.length > 0) {
                            for (const finalBuyBtn of finalBuyBtns) {
                                let localMaxStock = globalMaxStock; 
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
                                            localMaxStock = parseInt(stockData.data.stock);
                                        }
                                    } catch (e) {
                                        console.error("Error stock AJAX:", e);
                                    }
                                }

                                if (localMaxStock > 0) {
                                    if (!finalBuyBtn.parentNode.querySelector('.coco-qty-wrap')) {
                                        const wrapperInner = document.createElement('div');
                                        wrapperInner.className = 'coco-btn-wrapper-inner';
                                        const qtyHTML = `
                                            <div class="coco-qty-wrap">
                                                <button type="button" class="coco-qty-btn coco-minus">−</button>
                                                <input type="number" min="1" step="1" class="coco-qty" value="1" aria-label="Quantity" data-real-max="${localMaxStock}">
                                                <button type="button" class="coco-qty-btn coco-plus">+</button>
                                            </div>
                                        `;
                                        finalBuyBtn.parentNode.insertBefore(wrapperInner, finalBuyBtn);
                                        wrapperInner.insertAdjacentHTML('afterbegin', qtyHTML);
                                        wrapperInner.appendChild(finalBuyBtn);
                                        finalBuyBtn.textContent = 'BUY TICKETS';
                                    }
                                } else {
                                    finalBuyBtn.parentNode.innerHTML = '<p style="color:#e63946; font-weight:bold; text-align:center; padding:10px 0;">SOLD OUT</p>';
                                }
                            }

                            wrapper.innerHTML = ''; 
                            wrapper.appendChild(tickeraComponent);

                            const qtyWrappers = wrapper.querySelectorAll('.coco-btn-wrapper-inner');
                            qtyWrappers.forEach(wrap => {
                                const qtyInput = wrap.querySelector('.coco-qty');
                                const btnMinus = wrap.querySelector('.coco-minus');
                                const btnPlus = wrap.querySelector('.coco-plus');
                                const buyBtn = wrap.querySelector('.add_to_cart_button');
                                
                                if (qtyInput && btnMinus && btnPlus && buyBtn) {
                                    let thisMaxStock = parseInt(qtyInput.getAttribute('data-real-max')) || globalMaxStock;
                                    qtyInput.removeAttribute('max');

                                    const updateCartState = (newQty) => {
                                        qtyInput.value = newQty;
                                        buyBtn.setAttribute('data-quantity', newQty); 
                                        if (newQty >= thisMaxStock) {
                                            btnPlus.style.opacity = '0.4';
                                            btnPlus.style.cursor = 'not-allowed';
                                        } else {
                                            btnPlus.style.opacity = '1';
                                            btnPlus.style.cursor = 'pointer';
                                        }
                                    };

                                    btnMinus.addEventListener('click', () => {
                                        let current = parseInt(qtyInput.value) || 1;
                                        if (current > 1) { updateCartState(current - 1); }
                                    });

                                    btnPlus.addEventListener('click', () => {
                                        let current = parseInt(qtyInput.value) || 1;
                                        if (current < thisMaxStock) { updateCartState(current + 1); }
                                    });

                                    qtyInput.addEventListener('input', (e) => {
                                        let current = parseInt(e.target.value) || 1;
                                        if (current < 1) current = 1;
                                        if (current > thisMaxStock) current = thisMaxStock;
                                        updateCartState(current);
                                    });
                                    updateCartState(1);
                                }
                            });
                        } else {
                            showSoldOutState(wrapper);
                        }
                    } else {
                        showSoldOutState(wrapper);
                    }
                } catch (error) {
                    console.error("Error DOM:", error);
                    wrapper.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%;"><p style="text-align:center; color:#fff;">Connection Error.</p></div>';
                }
            });
        });

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeAndCleanModal);
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAndCleanModal();
            }
        });
    }
});

// ============================================================================
// BLOQUE 2: NUEVO CÓDIGO AISLADO (Modal del Sidebar)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const sidebarButtons = document.querySelectorAll('.tc-sidebar-trigger-btn');
    const sidebarModal = document.getElementById('tc-sidebar-checkout-modal');
    const sidebarCloseBtn = document.querySelector('.tc-sidebar-modal-close');
    const sidebarWrapper = document.getElementById('tc-sidebar-tickera-component-wrapper');

    if (!sidebarModal) return;

    const closeAndCleanSidebarModal = () => {
        sidebarModal.classList.add('tc-modal-hidden');
        sidebarWrapper.innerHTML = ''; 
        document.body.classList.remove('tc-modal-open');
    };

    const showSoldOutState = (container) => {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; padding: 20px;">
                <h2 style="font-size: 3.5rem; font-weight: 900; color: #ffffff; margin: 0; line-height: 1; text-transform: uppercase; letter-spacing: 2px; text-align: center;">SOLD OUT</h2>
            </div>
        `;
    };

    if (sidebarButtons.length > 0) {
        sidebarButtons.forEach(button => {
            button.addEventListener('click', async function(e) {
                e.preventDefault(); 
                const eventUrl = button.getAttribute('data-url');
                const imgUrl = button.getAttribute('data-img');
                const eventTitle = button.getAttribute('data-title');
                const eventDate = button.getAttribute('data-date');
                let rawStock = parseInt(button.getAttribute('data-stock'));
                let globalMaxStock = isNaN(rawStock) ? 9999 : rawStock;
                
                const figureContainer = sidebarModal.querySelector('.img-product-container figure');
                const titleContainer = sidebarModal.querySelector('.tc-sidebar-modal-title');
                const dateContainer = sidebarModal.querySelector('.tc-sidebar-modal-date');

                if (imgUrl) {
                    figureContainer.innerHTML = `<img src="${imgUrl}" alt="${eventTitle}" style="width: 100%; height: auto; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
                } else {
                    figureContainer.innerHTML = ''; 
                }

                titleContainer.textContent = eventTitle;
                dateContainer.textContent = `${eventDate}`;
                
                sidebarModal.classList.remove('tc-modal-hidden');
                document.body.classList.add('tc-modal-open');
                
                if (globalMaxStock <= 0) {
                    showSoldOutState(sidebarWrapper);
                    return;
                }

                sidebarWrapper.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; min-height:250px;"><p style="text-align:center; color:#fff; font-size:1.2rem;">Loading tickets...</p></div>';

                try {
                    const response = await fetch(eventUrl);
                    const htmlString = await response.text();
                    const parser = new DOMParser();
                    const virtualDOM = parser.parseFromString(htmlString, 'text/html');
                    const tickeraComponent = virtualDOM.querySelector('.tickera');

                    if (tickeraComponent) {
                        const finalBuyBtns = Array.from(tickeraComponent.querySelectorAll('.add_to_cart_button'));
                        if (finalBuyBtns.length > 0) {
                            for (const finalBuyBtn of finalBuyBtns) {
                                let localMaxStock = globalMaxStock;
                                const productId = finalBuyBtn.getAttribute('data-product_id');
                                if (productId) {
                                    const formDataSidebar = new URLSearchParams();
                                    formDataSidebar.append('action', 'tc_get_exact_product_stock');
                                    formDataSidebar.append('product_id', productId);
                                    formDataSidebar.append('nonce', tcEdrConfig.nonce);
                                    try {
                                        const stockRes = await fetch(tcEdrConfig.ajaxUrl, { method: 'POST', body: formDataSidebar });
                                        const stockData = await stockRes.json();
                                        if (stockData.success) { localMaxStock = parseInt(stockData.data.stock); }
                                    } catch (e) {}
                                }
                                if (localMaxStock > 0) {
                                    if (!finalBuyBtn.parentNode.querySelector('.coco-qty-wrap')) {
                                        const wrapperInner = document.createElement('div');
                                        wrapperInner.className = 'coco-btn-wrapper-inner';
                                        const qtyHTML = `
                                            <div class="coco-qty-wrap">
                                                <button type="button" class="coco-qty-btn coco-minus">−</button>
                                                <input type="number" min="1" step="1" class="coco-qty" value="1" aria-label="Quantity" data-real-max="${localMaxStock}">
                                                <button type="button" class="coco-qty-btn coco-plus">+</button>
                                            </div>
                                        `;
                                        finalBuyBtn.parentNode.insertBefore(wrapperInner, finalBuyBtn);
                                        wrapperInner.insertAdjacentHTML('afterbegin', qtyHTML);
                                        wrapperInner.appendChild(finalBuyBtn);
                                        finalBuyBtn.textContent = 'BUY TICKETS';
                                    }
                                } else {
                                    finalBuyBtn.parentNode.innerHTML = '<p style="color:#e63946; font-weight:bold; text-align:center; padding:10px 0;">SOLD OUT</p>';
                                }
                            }
                            sidebarWrapper.innerHTML = ''; 
                            sidebarWrapper.appendChild(tickeraComponent);
                            const qtyWrappers = sidebarWrapper.querySelectorAll('.coco-btn-wrapper-inner');
                            qtyWrappers.forEach(wrap => {
                                const qtyInput = wrap.querySelector('.coco-qty');
                                const btnMinus = wrap.querySelector('.coco-minus');
                                const btnPlus = wrap.querySelector('.coco-plus');
                                const buyBtn = wrap.querySelector('.add_to_cart_button');
                                if (qtyInput && btnMinus && btnPlus && buyBtn) {
                                    let thisMaxStock = parseInt(qtyInput.getAttribute('data-real-max')) || globalMaxStock;
                                    qtyInput.removeAttribute('max');
                                    const updateCartState = (newQty) => {
                                        qtyInput.value = newQty;
                                        buyBtn.setAttribute('data-quantity', newQty); 
                                        if (newQty >= thisMaxStock) {
                                            btnPlus.style.opacity = '0.4';
                                            btnPlus.style.cursor = 'not-allowed';
                                        } else {
                                            btnPlus.style.opacity = '1';
                                            btnPlus.style.cursor = 'pointer';
                                        }
                                    };
                                    btnMinus.addEventListener('click', () => {
                                        let current = parseInt(qtyInput.value) || 1;
                                        if (current > 1) { updateCartState(current - 1); }
                                    });
                                    btnPlus.addEventListener('click', () => {
                                        let current = parseInt(qtyInput.value) || 1;
                                        if (current < thisMaxStock) { updateCartState(current + 1); }
                                    });
                                    qtyInput.addEventListener('input', (e) => {
                                        let current = parseInt(e.target.value) || 1;
                                        if (current < 1) current = 1;
                                        if (current > thisMaxStock) current = thisMaxStock;
                                        updateCartState(current);
                                    });
                                    updateCartState(1);
                                }
                            });
                        } else { showSoldOutState(sidebarWrapper); }
                    } else { showSoldOutState(sidebarWrapper); }
                } catch (error) {
                    sidebarWrapper.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%;"><p style="text-align:center; color:#fff;">Connection Error.</p></div>';
                }
            });
        });
    }

    if (sidebarCloseBtn) { sidebarCloseBtn.addEventListener('click', closeAndCleanSidebarModal); }
    window.addEventListener('click', (e) => { if (e.target === sidebarModal) { closeAndCleanSidebarModal(); } });
});

// ============================================================================
// BLOQUE 3: REDIRECCIÓN AL CARRITO
// ============================================================================
if (typeof jQuery !== 'undefined') {
    jQuery(document.body).on('added_to_cart', function(event, fragments, cart_hash, $button) {
        if ($button && (
            $button.closest('#tc-checkout-modal').length > 0 || 
            $button.closest('#tc-sidebar-checkout-modal').length > 0 ||
            $button.closest('#tc-calendar-checkout-modal').length > 0
        )) {
            $button.text('Redirigiendo...');
            window.location.href = '/cart/';
        }
    });
}

// ============================================================================
// BLOQUE 4: INTERCEPTOR DEL CALENDARIO (Construcción Dinámica e Imagen)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', async function(e) {
        
        const calendarLink = e.target.closest('a.fc-event');
        if (!calendarLink) return;

        e.preventDefault();
        const eventUrl = calendarLink.getAttribute('href');
        if (!eventUrl || eventUrl === '#') return;

        let calendarModal = document.getElementById('tc-calendar-checkout-modal');
        if (!calendarModal) {
            calendarModal = document.createElement('div');
            calendarModal.id = 'tc-calendar-checkout-modal';
            calendarModal.className = 'tc-modal-hidden';
            calendarModal.innerHTML = `
                <div class="tc-modal-content">
                    <span class="tc-calendar-modal-close tc-modal-close">&times;</span>
                    <div class="buy-modal-container">
                        <div class="tc-modal-left-column">
                            <div class="img-product-container"><figure class="wp-block-image size-full"></figure></div>
                            <div class="tc-modal-event-info">
                                <h3 class="tc-calendar-modal-title tc-modal-title"></h3>
                                <p class="tc-calendar-modal-date tc-modal-date"></p>
                            </div>
                        </div>
                        <div id="tc-calendar-tickera-component-wrapper" class="tc-modal-right-column"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(calendarModal);

            const closeBtn = calendarModal.querySelector('.tc-calendar-modal-close');
            closeBtn.addEventListener('click', () => {
                calendarModal.classList.add('tc-modal-hidden');
                document.body.classList.remove('tc-modal-open');
            });
            window.addEventListener('click', (event) => {
                if (event.target === calendarModal) {
                    calendarModal.classList.add('tc-modal-hidden');
                    document.body.classList.remove('tc-modal-open');
                }
            });
        }

        const mainWrapper = document.getElementById('tc-calendar-tickera-component-wrapper');
        const figureContainer = calendarModal.querySelector('.img-product-container figure');
        const titleContainer = calendarModal.querySelector('.tc-calendar-modal-title');
        const dateContainer = calendarModal.querySelector('.tc-calendar-modal-date');

        const showSoldOutState = (container) => {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 250px; padding: 20px;">
                    <h2 style="font-size: 3.5rem; font-weight: 900; color: #ffffff; margin: 0; line-height: 1; text-transform: uppercase; letter-spacing: 2px; text-align: center;">SOLD OUT</h2>
                </div>
            `;
        };

        figureContainer.innerHTML = '';
        const titleEl = calendarLink.querySelector('.fc-event-title');
        const dateEl = calendarLink.querySelector('.fc-event-time');
        
        titleContainer.textContent = titleEl ? titleEl.textContent : 'Cargando evento...';
        dateContainer.textContent = dateEl ? dateEl.textContent : '';
        
        calendarModal.classList.remove('tc-modal-hidden');
        document.body.classList.add('tc-modal-open');
        mainWrapper.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; min-height:250px;"><p style="text-align:center; color:#fff; font-size:1.2rem;">Buscando tickets...</p></div>';

        try {
            const response = await fetch(eventUrl);
            const htmlString = await response.text();
            const parser = new DOMParser();
            const virtualDOM = parser.parseFromString(htmlString, 'text/html');
            
            const tribeImage = virtualDOM.querySelector('.tribe-events-event-image img, .tribe-events-c-event-image__img');
            const wpFeatured = virtualDOM.querySelector('.wp-post-image, .attachment-full, .tc-event-image img');
            const ogImage = virtualDOM.querySelector('meta[property="og:image"]');
            
            let finalImgSrc = null;
            if (tribeImage) finalImgSrc = tribeImage.getAttribute('src');
            else if (wpFeatured) finalImgSrc = wpFeatured.getAttribute('src');
            else if (ogImage) finalImgSrc = ogImage.getAttribute('content');

            if (finalImgSrc) {
                figureContainer.innerHTML = `<img src="${finalImgSrc}" style="width: 100%; height: auto; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
            }

            const tickeraComponent = virtualDOM.querySelector('.tickera');
            if (tickeraComponent) {
                const finalBuyBtns = Array.from(tickeraComponent.querySelectorAll('.add_to_cart_button'));
                let globalMaxStock = 9999; 

                if (finalBuyBtns.length > 0) {
                    for (const finalBuyBtn of finalBuyBtns) {
                        let localMaxStock = globalMaxStock; 
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
                                    localMaxStock = parseInt(stockData.data.stock);
                                }
                            } catch (e) {
                                console.error("Error stock AJAX:", e);
                            }
                        }

                        if (localMaxStock > 0) {
                            if (!finalBuyBtn.parentNode.querySelector('.coco-qty-wrap')) {
                                const wrapperInner = document.createElement('div');
                                wrapperInner.className = 'coco-btn-wrapper-inner';
                                const qtyHTML = `
                                    <div class="coco-qty-wrap">
                                        <button type="button" class="coco-qty-btn coco-minus">−</button>
                                        <input type="number" min="1" step="1" class="coco-qty" value="1" aria-label="Quantity" data-real-max="${localMaxStock}">
                                        <button type="button" class="coco-qty-btn coco-plus">+</button>
                                    </div>
                                `;
                                finalBuyBtn.parentNode.insertBefore(wrapperInner, finalBuyBtn);
                                wrapperInner.insertAdjacentHTML('afterbegin', qtyHTML);
                                wrapperInner.appendChild(finalBuyBtn);
                                finalBuyBtn.textContent = 'BUY TICKETS';
                            }
                        } else {
                            finalBuyBtn.parentNode.innerHTML = '<p style="color:#e63946; font-weight:bold; text-align:center; padding:10px 0;">SOLD OUT</p>';
                        }
                    }

                    mainWrapper.innerHTML = ''; 
                    mainWrapper.appendChild(tickeraComponent);

                    const qtyWrappers = mainWrapper.querySelectorAll('.coco-btn-wrapper-inner');
                    qtyWrappers.forEach(wrap => {
                        const qtyInput = wrap.querySelector('.coco-qty');
                        const btnMinus = wrap.querySelector('.coco-minus');
                        const btnPlus = wrap.querySelector('.coco-plus');
                        const buyBtn = wrap.querySelector('.add_to_cart_button');
                        
                        if (qtyInput && btnMinus && btnPlus && buyBtn) {
                            let thisMaxStock = parseInt(qtyInput.getAttribute('data-real-max')) || globalMaxStock;
                            qtyInput.removeAttribute('max');

                            const updateCartState = (newQty) => {
                                qtyInput.value = newQty;
                                buyBtn.setAttribute('data-quantity', newQty); 
                                if (newQty >= thisMaxStock) {
                                    btnPlus.style.opacity = '0.4';
                                    btnPlus.style.cursor = 'not-allowed';
                                } else {
                                    btnPlus.style.opacity = '1';
                                    btnPlus.style.cursor = 'pointer';
                                }
                            };

                            btnMinus.addEventListener('click', () => {
                                let current = parseInt(qtyInput.value) || 1;
                                if (current > 1) { updateCartState(current - 1); }
                            });

                            btnPlus.addEventListener('click', () => {
                                let current = parseInt(qtyInput.value) || 1;
                                if (current < thisMaxStock) { updateCartState(current + 1); }
                            });

                            qtyInput.addEventListener('input', (e) => {
                                let current = parseInt(e.target.value) || 1;
                                if (current < 1) current = 1;
                                if (current > thisMaxStock) current = thisMaxStock;
                                updateCartState(current);
                            });
                            updateCartState(1);
                        }
                    });
                } else {
                    showSoldOutState(mainWrapper);
                }
            } else {
                showSoldOutState(mainWrapper);
            }
        } catch (error) {
            mainWrapper.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%;"><p style="text-align:center; color:#fff;">Connection Error.</p></div>';
        }
    });
});

// ============================================================================
// BLOQUE 5: RESPONSIVE CALENDARIO MÓVIL (Inyección Automática)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth > 780) return; 

    const parseTime = (timeStr) => {
        if (!timeStr) return 9999; 
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 9999;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const modifier = match[3].toUpperCase();
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours * 60 + minutes;
    };

    const setupMobileCalendar = () => {
        const calendarContainer = document.getElementById('tc_calendar');
        if (!calendarContainer) return;

        // 1. EL JS CREA E INYECTA EL CONTENEDOR DE LA LISTA SI NO EXISTE EN EL DOM
        let listContainer = document.getElementById('tc-mobile-event-list');
        if (!listContainer) {
            listContainer = document.createElement('div');
            listContainer.id = 'tc-mobile-event-list';
            // Inyectamos el listContainer exactamente DEBAJO del calendario dinámicamente
            calendarContainer.after(listContainer);
        }

        const dayCells = calendarContainer.querySelectorAll('.fc-daygrid-day');
        dayCells.forEach(cell => {
            const events = cell.querySelectorAll('a.fc-event');
            if (events.length > 0) {
                cell.classList.add('tc-has-events');
            } else {
                cell.classList.remove('tc-has-events');
            }
        });

        if (!calendarContainer.dataset.tcListenerAttached) {
            calendarContainer.dataset.tcListenerAttached = 'true'; 

            calendarContainer.addEventListener('click', (e) => {
                const cell = e.target.closest('.fc-daygrid-day');
                if (!cell) return;

                if (e.target.tagName.toLowerCase() === 'a') e.preventDefault();

                const currentCells = calendarContainer.querySelectorAll('.fc-daygrid-day');
                currentCells.forEach(c => c.classList.remove('tc-selected-day'));
                cell.classList.add('tc-selected-day');

                listContainer.innerHTML = ''; 

                const dayEvents = Array.from(cell.querySelectorAll('a.fc-event'));
                
                if (dayEvents.length === 0) {
                    listContainer.classList.remove('tc-active');
                    return;
                }

                listContainer.classList.add('tc-active');
                
                const dateStr = cell.getAttribute('data-date');
                const [year, month, day] = dateStr.split('-');
                const displayDate = new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                
                listContainer.innerHTML = `<h4 style="color:#fff; margin-top:0; margin-bottom:15px; font-size:1rem; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid #444; padding-bottom:10px;">Events for ${displayDate}</h4>`;

                dayEvents.sort((a, b) => {
                    const timeElA = a.querySelector('.fc-event-time');
                    const timeElB = b.querySelector('.fc-event-time');
                    const timeA = timeElA ? timeElA.textContent : '';
                    const timeB = timeElB ? timeElB.textContent : '';
                    return parseTime(timeA) - parseTime(timeB);
                });

                dayEvents.forEach(ev => {
                    const titleEl = ev.querySelector('.fc-event-title');
                    const timeEl = ev.querySelector('.fc-event-time');
                    
                    const title = titleEl ? titleEl.textContent : 'Event';
                    const time = timeEl ? timeEl.textContent : '';
                    const href = ev.getAttribute('href');

                    const item = document.createElement('a');
                    item.href = href;
                    item.className = 'tc-mobile-list-item fc-event'; 
                    item.innerHTML = `
                        <div class="tc-mobile-list-title">${title}</div>
                        <div class="tc-mobile-list-time"><span>${time}</span><span style="color:#e63946; font-weight:bold;">Buy Tickets &rarr;</span></div>
                    `;
                    listContainer.appendChild(item);
                });
                
                setTimeout(() => {
                    listContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    };

    setTimeout(setupMobileCalendar, 800);

    const observer = new MutationObserver(() => {
        clearTimeout(window.tcCalTimeout);
        window.tcCalTimeout = setTimeout(setupMobileCalendar, 400);
    });

    const calendarWrap = document.getElementById('tc_calendar');
    if (calendarWrap) {
        observer.observe(calendarWrap, { childList: true, subtree: true });
    }
});