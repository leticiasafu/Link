import pkg from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import P from 'pino';
import fs from 'fs';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = pkg;

// Logger para depuración
const logger = P({ level: 'silent' });

// Configuración de GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Leer el token desde .env
const GITHUB_REPO_OWNER = 'leticiasafu'; // Reemplaza con tu nombre de usuario de GitHub
const GITHUB_REPO_NAME = 'Link'; // Reemplaza con el nombre del repositorio
const FILE_PATH = 'index.html'; // Ruta del archivo en el repositorio (en la raíz)
const BRANCH = 'main'; // Rama donde se encuentra el archivo

// Crear instancia de Octokit para interactuar con GitHub
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Conjunto para evitar procesamiento duplicado de mensajes
const processedMessages = new Set();

// Contador global para numerar los mensajes (persistente)
let messageCounter = loadMessageCounter();

// Función para cargar el contador desde un archivo local
function loadMessageCounter() {
    const counterFilePath = 'message_counter.txt'; // Archivo para almacenar el contador
    if (fs.existsSync(counterFilePath)) {
        const counter = parseInt(fs.readFileSync(counterFilePath, 'utf-8'), 10);
        return isNaN(counter) ? 1 : counter; // Si no es un número, comenzar desde 1
    }
    return 1; // Valor inicial si el archivo no existe
}

// Función para guardar el contador en un archivo local
function saveMessageCounter(counter) {
    const counterFilePath = 'message_counter.txt'; // Archivo para almacenar el contador
    fs.writeFileSync(counterFilePath, counter.toString(), 'utf-8');
}

// Función para actualizar el archivo index.html en GitHub
async function updateFileOnGitHub(filePath, content, commitMessage) {
    try {
        let sha = null;
        // Verificar si el archivo ya existe en GitHub
        try {
            const { data } = await octokit.repos.getContent({
                owner: GITHUB_REPO_OWNER,
                repo: GITHUB_REPO_NAME,
                path: filePath,
                ref: BRANCH, // Especifica la rama
            });
            sha = data.sha; // Obtener el SHA del archivo existente
        } catch (err) {
            if (err.status === 404) {
                console.log(`ℹ️ El archivo ${filePath} no existe en el repositorio. Se creará uno nuevo.`);
            } else {
                throw err; // Propagar otros errores
            }
        }
        // Actualizar o crear el archivo en GitHub
        await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_REPO_OWNER,
            repo: GITHUB_REPO_NAME,
            path: filePath,
            message: commitMessage,
            content: Buffer.from(content).toString('base64'), // Convertir contenido a Base64
            sha: sha, // SHA del archivo existente (null si es nuevo)
            branch: BRANCH, // Especifica la rama
        });
        console.log(`✅ Archivo ${filePath} actualizado en GitHub.`);
    } catch (err) {
        if (err.status === 404) {
            console.error(`❌ El archivo ${filePath} no existe en el repositorio.`);
        } else {
            console.error('❌ Error al actualizar el archivo en GitHub:', err.message);
        }
    }
}

// Función para guardar o actualizar el archivo HTML
function updateHTML(content) {
    const filePath = 'messages.html'; // Nombre del archivo HTML local

    // Leer el contenido existente o crear uno nuevo
    let htmlContent = '';
    if (fs.existsSync(filePath)) {
        htmlContent = fs.readFileSync(filePath, 'utf-8'); // Leer el contenido existente
    } else {
        // Crear la estructura inicial del HTML si no existe
        htmlContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Meus Links</title>
                <link rel="stylesheet" href="style.css"> <!-- Referencia al archivo CSS externo -->
                <script src="carousel.js" defer></script> <!-- Referencia al archivo JS externo -->
            </head>
            <body>
                <h1>Mensajes Recibidos</h1>
        `;
    }

    // Generar el carrusel de imágenes
    const carouselHTML = generateCarousel(content.images);

    // Agregar el nuevo contenido al HTML
    htmlContent += `
        <div class="message">
            <p class="message-number">#${String(messageCounter).padStart(3, '0')}</p>
            ${carouselHTML} <!-- Insertar el carrusel aquí -->
            <p><strong>Enlace:</strong> <a href="${content.link}" target="_blank">${content.link}</a></p>
            <p class="description"><strong>Descripción:</strong>
                ${formatDescription(content.description)}
                <a href="${content.link}" target="_blank" class="action-button">Comprar Agora</a>
                ⚠️ Promoção pode acabar a qualquer momento
            </p>
        </div>
    `;

    // Incrementar el contador de mensajes
    messageCounter++;
    saveMessageCounter(messageCounter); // Guardar el contador actualizado

    // Asegurar que el archivo HTML termine correctamente
    if (!htmlContent.endsWith('</body></html>')) {
        htmlContent += `
            </body>
            </html>
        `;
    }

    // Guardar el archivo HTML actualizado
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
    console.log(`✅ Contenido añadido al archivo HTML: ${filePath}`);

    // Actualizar el archivo index.html en GitHub
    updateFileOnGitHub(FILE_PATH, htmlContent, 'Actualización automática de index.html');
}

// Función para generar el carrusel de imágenes
function generateCarousel(images) {
    if (!images || images.length === 0) {
        return ''; // No mostrar carrusel si no hay imágenes
    }

    // Generar las imágenes del carrusel
    const carouselImages = images
        .map((image, index) => `<img src="${image}" alt="Imagen ${index + 1}" class="carousel-image ${index === 0 ? 'active' : ''}">`)
        .join('');

    // Retornar el HTML completo del carrusel
    return `
        <div class="carousel">
            <div class="carousel-images">
                ${carouselImages}
            </div>
            <button class="carousel-prev"><</button>
            <button class="carousel-next">></button>
        </div>
    `;
}

// Función para formatear la descripción
function formatDescription(description) {
    // Dividir la descripción en líneas separadas
    const lines = description.split('\n').map(line => line.trim()).filter(line => line);
    return lines.map(line => {
        // Normalizar "De:" y "Por:" para manejar variaciones
        if (/de:/i.test(line)) {
            line = line.replace(/de:/i, 'De:');
        }
        if (/por:/i.test(line) || /poor/i.test(line)) {
            line = line.replace(/por:/i, 'Por:').replace(/poor/i, 'Por:');
        }
        // Detectar precios "De:" y "Por:"
        if (line.includes('De:') || line.includes('Por:')) {
            // Extraer el valor numérico del precio usando una expresión regular
            const priceMatch = line.match(/[\d.,]+/);
            if (priceMatch) {
                const price = priceMatch[0].replace(',', '.'); // Reemplazar coma por punto para formato numérico
                return `<span class="${line.includes('Por:') ? 'promo-price' : ''}">${line.replace(/[*~]/g, '')}</span>`;
            }
        }
        // Eliminar texto redundante como "👉 Compre Aqui👇"
        if (line.includes('👉 Compre Aqui👇')) {
            return ''; // Eliminar esta línea
        }
        return line.replace(/[*~]/g, ''); // Limpiar caracteres innecesarios
    }).join('<br>'); // Usar <br> para mantener saltos de línea
}

// Función principal para iniciar la conexión de WhatsApp
async function startBot() {
    try {
        // Cargar estado de autenticación
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        // Crear socket de WhatsApp
        const sock = makeWASocket({
            printQRInTerminal: false, // Desactivar la generación automática del QR code
            auth: state,
            logger: logger, // Usar el logger con nivel "silent"
        });

        // Guardar credenciales actualizadas
        sock.ev.on('creds.update', saveCreds);

        // Manejar actualizaciones de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (connection === 'close') {
                const shouldReconnect =
                    (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Conexión perdida debido a:', lastDisconnect?.error);
                if (shouldReconnect) {
                    console.log('Reintentando conexión en 5 segundos...');
                    setTimeout(startBot, 5000); // Reintentar después de 5 segundos
                } else {
                    console.log('Sesión cerrada. Escanea el QR nuevamente.');
                }
            }
            if (connection === 'open') {
                console.log('✅ Conectado con éxito a WhatsApp Web!');
            }
            if (qr) {
                console.log('📌 Escanea el QR code para conectar:');
                qrcode.generate(qr, { small: true }); // Generar un QR code más pequeño
            }
        });

        // Manejar mensajes entrantes
        sock.ev.on('messages.upsert', async (messageUpsert) => {
            try {
                const message = messageUpsert.messages[0];
                if (!message || !message.key || !message.key.id) return; // Ignorar mensajes inválidos
                const messageId = message.key.id;
                if (processedMessages.has(messageId)) {
                    console.log(`⚠️ Mensaje duplicado ignorado: ${messageId}`);
                    return; // Ignorar mensajes ya procesados
                }
                processedMessages.add(messageId); // Marcar mensaje como procesado

                const { key, message: msg, pushName } = message;
                const sender = key.remoteJid;

                // Extraer texto del mensaje
                const messageText = msg?.conversation || msg?.text || '';
                const caption = msg?.imageMessage?.caption || msg?.videoMessage?.caption || '';

                // Extraer enlace del mensaje
                const link = extractURL(messageText) || extractURL(caption) || '';
                console.log(`🔍 Enlace extraído: ${link}`);

                // Validar descripción
                const description = caption.trim() || messageText.trim();
                console.log(`📝 Descripción detectada: ${description}`);

                // Procesar mensajes con enlace y descripción
                if (link && description) {
                    console.log(`✅ Todos los campos están presentes. Creando/actualizando HTML...`);
                    updateHTML({
                        link,
                        description,
                        images: [
                            'https://via.placeholder.com/400',
                            'https://via.placeholder.com/400',
                            'https://via.placeholder.com/400'
                        ] // Aquí debes reemplazar con tus URLs de imágenes
                    });
                } else {
                    console.log(`❌ Faltan datos para crear el HTML: Link=${!!link}, Descripción=${!!description}`);
                }
            } catch (err) {
                console.error('❌ Error al procesar el mensaje:', err);
            }
        });

        // Función para extraer URLs de texto plano
        function extractURL(text) {
            const urlRegex = /https?:\/\/[^\s]+/g; // Expresión regular para URLs
            const matches = text.match(urlRegex);
            return matches ? matches[0] : null;
        }

        // Manejar historial de mensajes
        sock.ev.on('messaging-history.set', async () => {
            console.log('Historial de mensajes sincronizado.');
        });

        // Manejar errores generales
        sock.ev.on('error', async (err) => {
            console.error('❌ Error en el bot:', err);
        });
    } catch (err) {
        console.error('❌ Error al iniciar el bot:', err);
    }
}

// Iniciar el bot
startBot();