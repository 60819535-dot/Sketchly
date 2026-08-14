/* =====================================================
   SKETCHLY
   JAVASCRIPT PRINCIPAL
===================================================== */


/* =====================================================
   CHATBOT
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    const chatbotButton =
        document.getElementById("chatbotButton");

    const chatbotWindow =
        document.getElementById("chatbotWindow");

    const closeChat =
        document.getElementById("closeChat");


    /*
       Comprobamos que los elementos existan.
       Esto evita errores si alguna otra página
       no tiene chatbot.
    */

    if (!chatbotButton || !chatbotWindow) {
        return;
    }


    /* =========================
       ABRIR / CERRAR CHAT
    ========================= */

    chatbotButton.addEventListener("click", function () {

        chatbotWindow.classList.toggle("show");

    });


    /* =========================
       BOTÓN X
    ========================= */

    if (closeChat) {

        closeChat.addEventListener("click", function () {

            chatbotWindow.classList.remove("show");

        });

    }


    /* =========================
       CERRAR AL HACER CLICK
       FUERA DEL CHAT
    ========================= */

    document.addEventListener("click", function (event) {

        const chatbot =
            document.querySelector(".chatbot");

        if (!chatbot.contains(event.target)) {

            chatbotWindow.classList.remove("show");

        }

    });

});


/* =====================================================
   RESPUESTAS DEL CHATBOT
===================================================== */

function botReply(option) {

    const messages =
        document.getElementById("chatMessages");


    if (!messages) {
        return;
    }


    let response = "";


    /* =========================
       PORTAFOLIO
    ========================= */

    if (option === "portafolio") {

        response = `
            Puedes explorar nuestros estilos:
            <br><br>

            ✦ Personajes<br>
            ◇ Escenarios<br>
            ◎ Logotipos<br>
            ▦ Pixel Art

            <br><br>

            <a href="portafolio.html">
                Ver portafolio →
            </a>
        `;

    }


    /* =========================
       SOLICITUD
    ========================= */

    else if (option === "solicitud") {

        response = `
            ¡Perfecto! ✨

            <br><br>

            Puedes contarnos tu idea,
            agregar referencias y elegir
            el tipo de diseño que necesitas.

            <br><br>

            <a href="solicitud.html">
                Crear solicitud →
            </a>
        `;

    }


    /* =========================
       CONTACTO
    ========================= */

    else if (option === "contacto") {

        response = `
            Puedes comunicarte con el artista
            desde nuestra sección de contacto.

            <br><br>

            <a href="contacto.html">
                Contactar →
            </a>
        `;

    }


    /* =========================
       AGREGAR RESPUESTA
    ========================= */

    messages.insertAdjacentHTML(
        "beforeend",

        `
        <div class="bot-message chatbot-answer">
            ${response}
        </div>
        `
    );


    /* =========================
       BAJAR SCROLL
    ========================= */

    messages.scrollTop =
        messages.scrollHeight;

}
