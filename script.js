
        document.querySelectorAll('.message').forEach(message => {
    message.addEventListener('click', () => {
        const compactView = message.querySelector('.message-compact');
        const expandedView = message.querySelector('.message-expanded');
        const isFullscreen = message.classList.contains('fullscreen');

        // Fechar todos os itens expandidos
        document.querySelectorAll('.message').forEach(item => {
            item.classList.remove('fullscreen');
            item.querySelector('.message-expanded').style.display = 'none';
            item.querySelector('.message-compact').style.display = 'block';

            // Redefinir a altura da imagem para a versão compacta
            const image = item.querySelector('.message-image');
            if (image) {
                image.style.maxHeight = '200px'; // Altura padrão para a versão compacta
            }
        });

        if (!isFullscreen) {
            // Abrir o item clicado em tela cheia
            message.classList.add('fullscreen');
            compactView.style.display = 'none';
            expandedView.style.display = 'block';

            // Mover a imagem para a versão expandida
            const image = message.querySelector('.message-image');
            expandedView.prepend(image); // Move a imagem para o início do .message-expanded
            image.style.maxHeight = '300px'; // Altura maior para a versão expandida
        } else {
            // Voltar para a versão compacta
            const image = message.querySelector('.message-image');
            compactView.prepend(image); // Move a imagem de volta para o .message-compact
            image.style.maxHeight = '200px'; // Altura menor para a versão compacta
        }
    });
});
    