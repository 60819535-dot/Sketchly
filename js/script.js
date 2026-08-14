document.addEventListener("DOMContentLoaded", () => {

    console.log("Sketchly iniciado correctamente.");

    // Animación suave para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", function(event) {

            const target = document.querySelector(
                this.getAttribute("href")
            );

            if (target) {

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth"
                });

            }

        });

    });


    // Efecto pequeño al hacer scroll
    const header = document.querySelector(".header");

    window.addEventListener("scroll", () => {

        if (window.scrollY > 20) {

            header.style.boxShadow =
                "0 5px 25px rgba(0,0,0,.06)";

        } else {

            header.style.boxShadow = "none";

        }

    });

});
