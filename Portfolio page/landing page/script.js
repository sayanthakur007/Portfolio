// Loading Screen
window.addEventListener('load', () => {
    const loading = document.getElementById('loading');
    setTimeout(() => {
        loading.classList.add('fade-out');
        setTimeout(() => {
            loading.style.display = 'none';
        }, 500);
    }, 2000);
});

// Navbar
let menu = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');

menu.onclick = () => {
    navbar.classList.toggle('active');
    menu.classList.toggle('bx-x');
}

window.onscroll = () => {
    navbar.classList.remove('active');
    menu.classList.remove('bx-x');
}

// Dark Mode with smooth transition
let darkmode = document.querySelector('#darkmode');

darkmode.onclick = () => {
    if(darkmode.classList.contains('bx-moon')){
        darkmode.classList.replace('bx-moon','bx-sun');
        document.body.classList.add('active');
    }else{
        darkmode.classList.replace('bx-sun','bx-moon');
        document.body.classList.remove('active');
    }
}

// Smooth scrolling for navigation links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        const offsetTop = targetSection.offsetTop - 80;

        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    });
});

// Scroll-triggered animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
});

// Menu item interactions
document.querySelectorAll('.menu-item').forEach(item => {
    const cartIcon = item.querySelector('.cart-icon');
    const heartIcon = item.querySelector('.bx-heart');
    const priceElement = item.querySelector('.price');

    // Cart icon click animation
    cartIcon.addEventListener('click', () => {
        cartIcon.style.animation = 'none';
        setTimeout(() => {
            cartIcon.style.animation = 'bounceIn 0.6s ease';
        }, 10);

        // Add to cart effect
        const originalPrice = priceElement.textContent;
        priceElement.textContent = 'Added!';
        priceElement.style.color = '#28a745';
        setTimeout(() => {
            priceElement.textContent = originalPrice;
            priceElement.style.color = '';
        }, 1000);
    });

    // Heart icon click effect
    heartIcon.addEventListener('click', () => {
        heartIcon.classList.toggle('bxs-heart');
        heartIcon.style.color = heartIcon.classList.contains('bxs-heart') ? '#e74c3c' : '';
    });
});

// Button hover effects
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-3px) scale(1.05)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0) scale(1)';
    });
});

// Parallax effect for home section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const homeImg = document.querySelector('.home-img img');
    if (homeImg) {
        homeImg.style.transform = `translateY(${scrolled * 0.2}px)`;
    }
});

// Typing effect restart
const typingElement = document.querySelector('.typing-effect');
if (typingElement) {
    setInterval(() => {
        typingElement.style.animation = 'none';
        setTimeout(() => {
            typingElement.style.animation = 'typing 3s steps(11) forwards, blink 0.75s step-end infinite';
        }, 10);
    }, 8000);
}

// Dynamic counter for menu prices (just for fun)
let counter = 0;
const counterInterval = setInterval(() => {
    document.querySelectorAll('.price').forEach(price => {
        const target = parseInt(price.textContent);
        const current = parseInt(price.textContent.replace(/\D/g, ''));
        if (current < target) {
            price.textContent = Math.min(current + Math.ceil(target / 50), target);
        }
    });
    counter++;
    if (counter > 50) clearInterval(counterInterval);
}, 50);

// Scroll Reveal with enhanced options
const sr = ScrollReveal ({
    origin: 'bottom',
    distance: '60px',
    duration: 1000,
    delay: 200,
    reset: false,
    easing: 'ease-in-out'
});

sr.reveal('.home-text', { origin: 'left' });
sr.reveal('.home-img', { origin: 'right' });
sr.reveal('.about-img', { origin: 'left', delay: 300 });
sr.reveal('.about-text', { origin: 'right', delay: 300 });
sr.reveal('.box', { interval: 200, delay: 400 });
sr.reveal('.s-box', { interval: 150, delay: 500 });
sr.reveal('.connect-text', { origin: 'left', delay: 600 });
sr.reveal('.contact-box', { interval: 100, delay: 700 });

// Back to Top Button
const backToTopBtn = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
});

backToTopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Particle Effect
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

createParticles();