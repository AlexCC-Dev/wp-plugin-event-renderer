document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.tc-trigger-modal-btn');
    const modal = document.getElementById('tc-checkout-modal');
    const closeModal = document.querySelector('.tc-modal-close');
    const wrapper = document.getElementById('tc-tickera-component-wrapper');

    buttons.forEach(button => {
        button.addEventListener('click', async function() {
            const eventoId = this.getAttribute('data-evento-id');
            
            // 1. Mostrar modal en estado de carga
            modal.classList.remove('tc-modal-hidden');
            wrapper.innerHTML = '<p>Cargando tickets...</p>';

            // 2. Preparar los datos para enviar al servidor WP
            const formData = new URLSearchParams();
            formData.append('action', 'load_tickera_component');
            formData.append('evento_id', eventoId);
            formData.append('nonce', tcEdrConfig.nonce);

            // 3. Ejecutar la petición asíncrona
            try {
                const response = await fetch(tcEdrConfig.ajaxUrl, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    // 4. Inyectar el componente de Tickera devuelto por el servidor
                    wrapper.innerHTML = data.data;
                } else {
                    wrapper.innerHTML = '<p>Error al cargar el evento.</p>';
                }
            } catch (error) {
                wrapper.innerHTML = '<p>Error de conexión.</p>';
            }
        });
    });

    // Cerrar el modal
    closeModal.addEventListener('click', () => {
        modal.classList.add('tc-modal-hidden');
        wrapper.innerHTML = ''; // Limpiar el DOM al cerrar
    });
});