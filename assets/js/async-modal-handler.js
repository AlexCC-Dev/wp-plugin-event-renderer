document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.tc-trigger-modal-btn');
    const modal = document.getElementById('tc-checkout-modal');
    const closeModal = document.querySelector('.tc-modal-close');
    const wrapper = document.getElementById('tc-tickera-component-wrapper');

    buttons.forEach(button => {
        button.addEventListener('click', async function() {
            // 1. Obtener la URL de la página del evento específico
            const eventUrl = this.getAttribute('data-url');
            
            // 2. Abrir el modal en estado de carga
            modal.classList.remove('tc-modal-hidden');
            wrapper.innerHTML = '<p style="text-align:center;">Cargando tickets disponibles...</p>';

            try {
                // 3. Descargar el HTML de la página en segundo plano
                const response = await fetch(eventUrl);
                const htmlString = await response.text();
                
                // 4. Convertir el texto HTML en un objeto DOM navegable
                const parser = new DOMParser();
                const virtualDOM = parser.parseFromString(htmlString, 'text/html');
                
                // 5. Buscar el componente exacto dentro de ese DOM virtual
                const tickeraComponent = virtualDOM.querySelector('.tickera');

                // 6. Inyectarlo en nuestro modal
                if (tickeraComponent) {
                    wrapper.innerHTML = ''; // Limpiamos el texto de carga
                    wrapper.appendChild(tickeraComponent);
                } else {
                    wrapper.innerHTML = '<p>Lo sentimos, no se encontraron opciones de ticket para esta fecha.</p>';
                }

            } catch (error) {
                console.error("Error fetching event fragment:", error);
                wrapper.innerHTML = '<p>Error de red al cargar el evento.</p>';
            }
        });
    });

    // Cerrar el modal y limpiar el DOM inyectado
    closeModal.addEventListener('click', () => {
        modal.classList.add('tc-modal-hidden');
        wrapper.innerHTML = ''; 
    });
});