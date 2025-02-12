document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.carousel').forEach(carousel => {
        const images = carousel.querySelectorAll('.carousel-image');
        let currentIndex = 0;

        // Mostrar la imagen actual
        function showImage(index) {
            images.forEach((img, i) => img.classList.toggle('active', i === index));
        }

        // Botón "Anterior"
        const prevButton = carousel.querySelector('.carousel-prev');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + images.length) % images.length;
                showImage(currentIndex);
            });
        }

        // Botón "Siguiente"
        const nextButton = carousel.querySelector('.carousel-next');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % images.length;
                showImage(currentIndex);
            });
        }

        // Mostrar la primera imagen al cargar
        showImage(currentIndex);
    });
});