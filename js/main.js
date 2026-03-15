// Корзина (глобальна для форми замовлення), зберігається в localStorage
const CART_STORAGE_KEY = 'myboo-cart';

function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveCartToStorage() {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
        console.warn('Не вдалося зберегти кошик:', e);
    }
}

let cart = loadCartFromStorage();

const API_ORDERS = '/api/orders';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    bindProductEvents();
    updateCartCount();
    renderOrderSummary();
    startCountdown();
    initReviewsSlider();
    initMessengerFloatToggle();
});

// Закрити / відкрити панель Viber + Telegram (хрестик ↔ стрілка)
function initMessengerFloatToggle() {
    const wrap = document.getElementById('messenger-float-wrap');
    const btn = document.getElementById('messenger-float-toggle');
    if (!wrap || !btn) return;

    btn.addEventListener('click', () => {
        const isClosed = wrap.classList.toggle('is-closed');
        btn.setAttribute('aria-label', isClosed ? 'Відкрити панель контактів' : 'Закрити панель контактів');
    });
}

// Таймер зворотного відліку в hero (дата завершення акції: через 7 днів)
function startCountdown() {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    const daysEl = document.querySelector('[data-countdown-days]');
    const hoursEl = document.querySelector('[data-countdown-hours]');
    const minutesEl = document.querySelector('[data-countdown-minutes]');
    const secondsEl = document.querySelector('[data-countdown-seconds]');
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    function pad(n) {
        return String(Math.max(0, Math.floor(n))).padStart(2, '0');
    }

    function tick() {
        const now = new Date();
        const diff = end - now;
        if (diff <= 0) {
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            return;
        }
        const d = diff / (24 * 60 * 60 * 1000);
        const h = (diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000);
        const m = (diff % (60 * 60 * 1000)) / (60 * 1000);
        const s = (diff % (60 * 1000)) / 1000;
        daysEl.textContent = pad(d);
        hoursEl.textContent = pad(h);
        minutesEl.textContent = pad(m);
        secondsEl.textContent = pad(s);
    }

    tick();
    setInterval(tick, 1000);
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const el = document.querySelector('.cart-count');
    if (el) {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    }
}

function addToCart(productId, productName, price, quantity = 1, image = '') {
    const existing = cart.find(item => item.id === productId && item.name === productName);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({ id: productId, name: productName, price, quantity, image });
    }
    saveCartToStorage();
    updateCartCount();
    renderOrderSummary();
    showToast(`${productName} додано до кошика`);
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderOrderSummary() {
    const container = document.querySelector('[data-order-items]');
    const totalEl = document.querySelector('[data-order-total]');
    const totalFormEl = document.querySelector('[data-order-total-form]');
    const emptyEl = document.querySelector('[data-order-empty]');
    const formBlockEl = document.querySelector('[data-order-form-block]');
    const navOrderEl = document.querySelector('[data-nav-order]');
    if (!container || !totalEl) return;

    if (formBlockEl) formBlockEl.style.display = cart.length > 0 ? 'block' : 'none';
    if (navOrderEl) navOrderEl.style.display = cart.length > 0 ? '' : 'none';

    container.innerHTML = '';
    const total = getCartTotal();
    const totalText = total.toFixed(0) + ' грн';
    totalEl.textContent = totalText;
    if (totalFormEl) totalFormEl.textContent = totalText;

    if (cart.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'order-item-row';
        row.innerHTML = `<span>${item.name} × ${item.quantity}</span><span>${(item.price * item.quantity).toFixed(0)} грн</span>`;
        container.appendChild(row);
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #e8b86d;
        color: #0f0f0f;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function initReviewsSlider() {
    const slider = document.querySelector('[data-reviews-slider]');
    const dotsContainer = document.querySelector('[data-reviews-dots]');
    const prevBtn = document.querySelector('.reviews-slider-prev');
    const nextBtn = document.querySelector('.reviews-slider-next');
    if (!slider || !dotsContainer) return;

    const slides = slider.querySelectorAll('.reviews-slide');
    const total = slides.length;
    if (total === 0) return;

    let currentIndex = 0;

    function goTo(index) {
        if (index >= total) currentIndex = 0;
        else if (index < 0) currentIndex = total - 1;
        else currentIndex = index;
        const slideWidth = slides[0].offsetWidth;
        const offsetPx = currentIndex * slideWidth;
        slider.style.transform = `translateX(-${offsetPx}px)`;
        dots.forEach((d, i) => d.classList.toggle('is-active', i === currentIndex));
    }

    slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'reviews-dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Відгук ' + (i + 1));
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.reviews-dot');
    goTo(0);

    prevBtn?.addEventListener('click', () => goTo(currentIndex - 1));
    nextBtn?.addEventListener('click', () => goTo(currentIndex + 1));

    let touchStartX = 0;
    let touchEndX = 0;
    slider.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    slider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goTo(currentIndex + 1);
            else goTo(currentIndex - 1);
        }
    }, { passive: true });
}

// Обработчики кнопок "В корзину" — тепер відкривають модалку (реальна прив'язка в bindProductEvents після renderProducts)

// Модалка товара (галерея)
const modalBackdrop = document.querySelector('[data-modal-backdrop]');
const modalMainImage = document.querySelector('[data-modal-main-image]');
const checkoutBackdrop = document.querySelector('[data-checkout-backdrop]');

let bodyScrollLockCount = 0;
function lockBodyScroll() {
    bodyScrollLockCount++;
    if (bodyScrollLockCount !== 1) return;
    const scrollY = window.scrollY || window.pageYOffset;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
    document.body.classList.add('modal-open');
}
function unlockBodyScroll() {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount !== 0) return;
    document.body.classList.remove('modal-open');
    const scrollY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scroll-y') || '0');
    document.documentElement.style.removeProperty('--scroll-y');
    window.scrollTo(0, scrollY);
}
const checkoutItemsEl = document.querySelector('[data-checkout-items]');
const checkoutTotalEl = document.querySelector('[data-checkout-total]');
const checkoutTotalBottomEl = document.querySelector('[data-checkout-total-bottom]');
const checkoutItemsFormEl = document.querySelector('[data-checkout-items-form]');
const checkoutTotalFormEl = document.querySelector('[data-checkout-total-form]');
const checkoutMessageEl = document.querySelector('[data-checkout-message]');

function openProductModal(productId) {
    if (!modalBackdrop || !modalMainImage) return;

    const product = products.find(item => String(item.id) === String(productId));
    if (!product) return;

    currentProductId = product.id;

    const modalTitle = document.querySelector('#product-modal-title');
    const modalDescEls = document.querySelectorAll('[data-modal-backdrop] .modal-desc');
    const modalPrice = document.querySelector('[data-modal-backdrop] .modal-price-row .product-price');
    const sizeSelect = document.querySelector('[data-modal-size]');
    const qtySelect = document.querySelector('[data-modal-qty]');
    const modalThumbs = document.querySelector('[data-modal-backdrop] .modal-thumbs');

    const fullName = product.color
        ? `${product.name} (${product.color})`
        : product.name;

    if (modalTitle) modalTitle.textContent = fullName;
    const modalPriceOld = document.querySelector('[data-modal-backdrop] .modal-price-old');
    if (modalPriceOld) modalPriceOld.textContent = `${Math.round(product.price * 1.25)} грн`;
    if (modalPrice) modalPrice.textContent = `${product.price} грн`;

    if (product.image) {
        modalMainImage.src = product.image;
        modalMainImage.alt = fullName;
        modalMainImage.style.display = 'block';
    } else {
        modalMainImage.removeAttribute('src');
        modalMainImage.alt = fullName;
        modalMainImage.style.display = 'none';
    }

    if (modalThumbs) {
        modalThumbs.innerHTML = '';
        const imgs = product.images && product.images.length ? product.images : [product.image];
        imgs.filter(Boolean).forEach((src, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'modal-thumb' + (i === 0 ? ' is-active' : '');
            btn.setAttribute('data-modal-thumb', src);
            btn.innerHTML = `<img src="${escapeHtml(src)}" alt="">`;
            modalThumbs.appendChild(btn);
        });
    }

    if (sizeSelect) {
        sizeSelect.innerHTML = '';
        (product.sizes || []).forEach(size => {
            const opt = document.createElement('option');
            opt.value = size;
            opt.textContent = size;
            sizeSelect.appendChild(opt);
        });
    }
    if (qtySelect) qtySelect.value = '1';

    if (modalDescEls[0]) modalDescEls[0].innerHTML = `<strong>Категорія:</strong> ${escapeHtml(product.category)}`;
    if (modalDescEls[1]) modalDescEls[1].innerHTML = `<strong>Назва товару:</strong> ${escapeHtml(fullName)}`;
    if (modalDescEls[2]) modalDescEls[2].innerHTML = `<strong>Розміри:</strong> ${escapeHtml((product.sizes || []).join(', '))}`;
    if (modalDescEls[3]) modalDescEls[3].innerHTML = `<strong>Опис:</strong> ${escapeHtml(product.description || '').replace(/\n/g, '<br>')}`;

    modalBackdrop.hidden = false;
    lockBodyScroll();
}

function closeProductModal() {
    if (modalBackdrop) modalBackdrop.hidden = true;
    unlockBodyScroll();
}

modalBackdrop?.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeProductModal();
});

document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeProductModal());
});

// Мініатюри в модалці (делегування — тумби будуються в openProductModal)
document.querySelector('[data-modal-backdrop]')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-thumb]');
    if (!btn || !modalMainImage) return;
    const src = btn.getAttribute('data-modal-thumb');
    if (!src) return;
    modalMainImage.src = src;
    btn.closest('.modal-thumbs')?.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
});

function renderCheckoutItems() {
    if (!checkoutItemsEl || !checkoutTotalEl || !checkoutTotalBottomEl) return;
    checkoutItemsEl.innerHTML = '';
    if (checkoutItemsFormEl) checkoutItemsFormEl.innerHTML = '';
    let total = 0;
    cart.forEach((item, index) => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;
        const row = document.createElement('div');
        row.className = 'checkout-item';
        row.innerHTML = `
            <div class="checkout-item-thumb">
            ${item.image
                ? `<img src="${escapeHtml(item.image)}" alt="">`
                : `<div class="product-placeholder">Фото</div>`
            }
            </div>
            <div class="checkout-item-info">
                <div class="checkout-item-name">${escapeHtml(item.name)}</div>
                <div class="checkout-item-meta">Кількість: ${item.quantity}</div>
            </div>
            <div class="checkout-item-price">${lineTotal.toFixed(0)} грн</div>
            <button type="button" class="checkout-item-remove" data-remove-one="${index}" aria-label="Видалити з кошика">×</button>
        `;
        checkoutItemsEl.appendChild(row);
        if (checkoutItemsFormEl) {
            const rowForm = document.createElement('div');
            rowForm.className = 'checkout-item checkout-item-in-form';
            rowForm.innerHTML = `
                <div class="checkout-item-thumb">
                ${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : `<div class="product-placeholder">Фото</div>`}
                </div>
                <div class="checkout-item-info">
                    <div class="checkout-item-name">${escapeHtml(item.name)}</div>
                    <div class="checkout-item-meta">× ${item.quantity}</div>
                </div>
                <div class="checkout-item-price">${lineTotal.toFixed(0)} грн</div>
            `;
            checkoutItemsFormEl.appendChild(rowForm);
        }
    });
    const totalText = total.toFixed(0) + ' грн';
    checkoutTotalEl.textContent = totalText;
    checkoutTotalBottomEl.textContent = totalText;
    if (checkoutTotalFormEl) checkoutTotalFormEl.textContent = totalText;
}

function openCheckoutModal(showForm) {
    if (!checkoutBackdrop || !checkoutItemsEl || !checkoutTotalEl || !checkoutTotalBottomEl) return;
    if (cart.length === 0) {
        showToast('Додайте товар до кошика.');
        return;
    }
    renderCheckoutItems();
    if (checkoutMessageEl) {
        checkoutMessageEl.textContent = '';
        checkoutMessageEl.dataset.state = '';
    }
    const cartView = document.querySelector('[data-checkout-cart-view]');
    const formView = document.querySelector('[data-checkout-form-view]');
    if (showForm && formView && cartView) {
        cartView.hidden = true;
        formView.hidden = false;
    } else if (cartView && formView) {
        cartView.hidden = false;
        formView.hidden = true;
    }
    checkoutBackdrop.hidden = false;
    lockBodyScroll();
}

function closeCheckoutModal() {
    if (!checkoutBackdrop) return;
    checkoutBackdrop.hidden = true;
    unlockBodyScroll();
}

checkoutBackdrop?.addEventListener('click', (e) => {
    if (e.target === checkoutBackdrop) {
        closeCheckoutModal();
    }
});

document.querySelectorAll('[data-checkout-close]').forEach(btn => {
    btn.addEventListener('click', () => closeCheckoutModal());
});

// Клік по кошику в навігації — відкриває модалку з переліком товарів та кнопкою «Оформити замовлення»
document.querySelector('.cart-btn')?.addEventListener('click', () => {
    openCheckoutModal(false);
});

// Перехід з виду кошика на форму замовлення
document.querySelector('[data-checkout-goto-form]')?.addEventListener('click', () => {
    const cartView = document.querySelector('[data-checkout-cart-view]');
    const formView = document.querySelector('[data-checkout-form-view]');
    if (cartView && formView) {
        cartView.hidden = true;
        formView.hidden = false;
    }
});

// Видалити один товар з кошика в модалці оформлення
checkoutItemsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-one]');
    if (!btn) return;
    const index = parseInt(btn.getAttribute('data-remove-one'), 10);
    if (isNaN(index) || index < 0 || index >= cart.length) return;
    cart.splice(index, 1);
    saveCartToStorage();
    updateCartCount();
    renderOrderSummary();
    renderCheckoutItems();
    if (cart.length === 0) {
        closeCheckoutModal();
        showToast('Кошик очищено.');
    } else {
        showToast('Товар видалено з кошика.');
    }
});

// Видалити все з кошика
document.querySelector('[data-checkout-clear]')?.addEventListener('click', () => {
    cart.length = 0;
    saveCartToStorage();
    updateCartCount();
    renderOrderSummary();
    closeCheckoutModal();
    showToast('Кошик очищено.');
});

// Кнопка "Замовити по знижці" в модалці товару
document.querySelector('[data-modal-order]')?.addEventListener('click', () => {
    if (!currentProductId) return;

    const product = products.find(item => String(item.id) === String(currentProductId));
    if (!product) return;

    const qtySelect = document.querySelector('[data-modal-qty]');
    const sizeSelect = document.querySelector('[data-modal-size]');
    const quantity = qtySelect ? parseInt(qtySelect.value, 10) || 1 : 1;
    const size = sizeSelect ? sizeSelect.value : '';

    let displayName = product.color ? `${product.name} (${product.color})` : product.name;
    if (size) displayName += `, ${size}`;

    addToCart(product.id, displayName, product.price, quantity, product.image || '');
    closeProductModal();
    openCheckoutModal(true);
});

// Кнопка "Додати в кошик і продовжити покупки" — додає в кошик, закриває модалку, без відкриття checkout
document.querySelector('[data-modal-add-continue]')?.addEventListener('click', () => {
    if (!currentProductId) return;

    const product = products.find(item => String(item.id) === String(currentProductId));
    if (!product) return;

    const qtySelect = document.querySelector('[data-modal-qty]');
    const sizeSelect = document.querySelector('[data-modal-size]');
    const quantity = qtySelect ? parseInt(qtySelect.value, 10) || 1 : 1;
    const size = sizeSelect ? sizeSelect.value : '';

    let displayName = product.color ? `${product.name} (${product.color})` : product.name;
    if (size) displayName += `, ${size}`;

    addToCart(product.id, displayName, product.price, quantity, product.image || '');
    closeProductModal();
});

// Открытие модалки по клику на карточку товара
document.querySelectorAll('.product-card[data-product-modal]').forEach(card => {
    card.addEventListener('click', (e) => {
        const target = e.target;
        // Не перехватывать клики по внутренним кнопкам (если добавятся)
        if (target instanceof HTMLElement && target.closest('button')) {
            return;
        }
        const id = card.getAttribute('data-product-modal');
        if (id) {
            openProductModal(id);
        }
    });
});

// Форма замовлення (така ж як у кошику)
document.querySelector('[data-order-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const msgEl = form.querySelector('[data-order-message]');
    if (cart.length === 0) {
        if (msgEl) { msgEl.textContent = 'Додайте товари до кошика.'; msgEl.dataset.state = 'error'; }
        return;
    }

    const firstName = form.firstName && form.firstName.value ? form.firstName.value.trim() : '';
    const lastName = form.lastName && form.lastName.value ? form.lastName.value.trim() : '';
    const phone = form.phone && form.phone.value ? form.phone.value.trim() : '';
    const city = form.city && form.city.value ? form.city.value.trim() : '';
    const branch = form.branch && form.branch.value ? form.branch.value.trim() : '';

    const customer = {
        name: `${firstName} ${lastName}`.trim(),
        phone,
        address: `${city}, відділення НП №${branch}`,
    };
    const items = cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity }));
    const confirmType = (form.confirmType && form.confirmType.value) || 'call';

    if (msgEl) { msgEl.textContent = 'Надсилання…'; msgEl.dataset.state = ''; }

    try {
        const res = await fetch(API_ORDERS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer, items, confirmType }),
        });
        const data = await res.json();

        if (data.success) {
            if (msgEl) { msgEl.textContent = 'Замовлення №' + (data.orderId || '') + ' прийнято. Дякуємо!'; msgEl.dataset.state = 'success'; }
            cart.length = 0;
            saveCartToStorage();
            updateCartCount();
            renderOrderSummary();
            form.reset();
            showToast('Замовлення успішно надіслано!');
        } else {
            if (msgEl) { msgEl.textContent = data.error || 'Помилка відправки.'; msgEl.dataset.state = 'error'; }
        }
    } catch (err) {
        if (msgEl) { msgEl.textContent = 'Помилка з\'єднання. Запустіть сервер (npm start).'; msgEl.dataset.state = 'error'; }
    }
});

// Оформлення замовлення з модалки checkout
document.querySelector('[data-checkout-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!checkoutMessageEl) return;
    if (cart.length === 0) {
        checkoutMessageEl.textContent = 'Кошик порожній.';
        checkoutMessageEl.dataset.state = 'error';
        return;
    }

    const firstName = form.firstName.value.trim();
    const lastName = form.lastName.value.trim();
    const phone = form.phone.value.trim();
    const city = form.city.value.trim();
    const branch = form.branch.value.trim();

    const customer = {
        name: `${firstName} ${lastName}`.trim(),
        phone,
        address: `${city}, відділення НП №${branch}`,
    };
    const items = cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity }));
    const confirmType = (form.confirmType && form.confirmType.value) || 'call';

    checkoutMessageEl.textContent = 'Надсилання…';
    checkoutMessageEl.dataset.state = '';

    try {
        const res = await fetch(API_ORDERS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer, items, confirmType }),
        });
        const data = await res.json();
        if (data.success) {
            checkoutMessageEl.textContent = 'Замовлення прийнято! Дякуємо.';
            checkoutMessageEl.dataset.state = 'success';
            cart.length = 0;
            saveCartToStorage();
            updateCartCount();
            renderOrderSummary();
            form.reset();
            showToast('Замовлення успішно надіслано!');
            setTimeout(() => closeCheckoutModal(), 1200);
        } else {
            checkoutMessageEl.textContent = data.error || 'Помилка відправки.';
            checkoutMessageEl.dataset.state = 'error';
        }
    } catch (err) {
        checkoutMessageEl.textContent = 'Помилка з\'єднання. Запустіть сервер (npm start).';
        checkoutMessageEl.dataset.state = 'error';
    }
});

// Форма контактов
document.querySelector('.contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Повідомлення надіслано! Ми зв\'яжемося з вами найближчим часом.');
    e.target.reset();
});


// кариочки товара
const products = [
    {
    id: 1,
    category: "БОДІСТОКІНГИ",
    name: "Бодістокінг AnnaBell",
    image: "assets/bodystocking-black-1.png",
    images: ["assets/bodystocking-black-1.png", "assets/bodystocking-black-2.png", "assets/bodystocking-black-3.png"],
    color: "чорний",
    price: 250,
    sizes: ["XS","S","M","L","XL","2XL"],
    description: `Розмір універсальний, дуже еластичний матеріал.
    Підійде на XS, S, M, L, XL, 2XL.
    Ідеальний варіант, якщо не знаєте свого розміру.
    Ідеально сідає по фігурі.
    Білизна в ціну не входить.`
    },
    
    {
    id: 2,
    category: "БОДІСТОКІНГИ",
    name: "Бодістокінг AnnaBell",
    image: "assets/bodystocking-1.png",
    images: ["assets/bodystocking-1.png", "assets/bodystocking-2.png", "assets/bodystocking-3.png"],
    color: "червоний",
    price: 250,
    sizes: ["XS","S","M","L","XL","2XL"],
    description: `Розмір універсальний, дуже еластичний матеріал.
    Підійде на XS, S, M, L, XL, 2XL.
    Ідеальний варіант, якщо не знаєте свого розміру.
    Ідеально сідає по фігурі.
    Білизна в ціну не входить.`
    },
    
    {
    id: 3,
    category: "БОДІСТОКІНГИ",
    name: "Бодістокінг Kleopatra",
    image: "assets/Kleopatra.jpg",
    images: ["assets/Kleopatra.jpg", "assets/Kleopatra2.jpg", "assets/Kleopatra3.jpg"],
    price: 330,
    sizes: ["XS","S","M","L","XL","2XL"],
    description: `Матеріал нейлон, ніжний на дотик і надзвичайно тягнеться.
    Приймає форму тіла.
    Підійде на XS, S, M, L, XL, 2XL.
    Ідеальний варіант, якщо не знаєте свого розміру.
    Бодістокінг без білизни.`
    },
    
    {
    id: 4,
    category: "БОДІСТОКІНГИ",
    name: "Бодістокінг Leo",
    image: "assets/BodyLeo.jpg",
    images: ["assets/BodyLeo.jpg", "assets/BodyLeo2.jpg", "assets/BodyLeo3.jpg"],
    price: 360,
    sizes: ["XS","S","M","L","XL","2XL"],
    description: `Матеріал нейлон, ніжний на дотик і добре тягнеться.
    Приймає форму тіла.
    Підійде на XS, S, M, L, XL, 2XL.
    Ідеальний варіант, якщо не знаєте свого розміру.
    Бодістокінг без білизни.`
    },
    
    {
    id: 5,
    category: "БОДІСТОКІНГИ",
    name: "Бодістокінг Lily",
    image: "assets/BodyLilyChorniy.jpg",
    images: ["assets/BodyLilyChorniy.jpg", "assets/BodyLilyChorniy2.jpg", "assets/BodyLilyChorniy3.png"],
    color: "чорний",
    price: 330,
    sizes: ["XS","S","M","L","XL","2XL"],
    description: `Матеріал нейлон, ніжний на дотик і дуже еластичний.
    Приймає форму тіла.
    Підійде на XS, S, M, L, XL, 2XL.
    Ідеальний варіант, якщо не знаєте свого розміру.
    Бодістокінг без білизни.`
    },
    
    {
    id: 6,
    category: "БОДІСТОКІНГИ",
    name: "Бодістокінг Lily",
    image: "assets/BodyLilyBiliy.jpg",
    images: ["assets/BodyLilyBiliy.jpg", "assets/BodyLiluBiliy2.jpg", "assets/BodyLilyBiliy3.jpg"],
    color: "білий",
    price: 330,
    sizes: ["XS","S","M","L","XL","2XL"],
    description: `Матеріал нейлон, ніжний на дотик і дуже еластичний.
    Приймає форму тіла.
    Підійде на XS, S, M, L, XL, 2XL.
    Ідеальний варіант, якщо не знаєте свого розміру.
    Бодістокінг без білизни.`
    },
    
    {
    id: 7,
    category: "БОДІ",
    name: "Боді з відкритим доступом",
    image: "assets/BodyZDostupomChorne.jpg",
    images: ["assets/BodyZDostupomChorne.jpg", "assets/BodyZDostupomChorne2.jpg", "assets/BodyZDostupomChorne3.webp"],
    color: "чорний",
    price: 330,
    sizes: ["S","M","L","XL"],
    description: `Неймовірно чарівний боді з відкритим доступом.
    Створений для незабутніх ночей.
    Матеріал нейлон, дуже еластичний.
    Приймає форму тіла і регулюється затяжками.`
    },
    
    {
    id: 8,
    category: "БОДІ",
    name: "Боді з відкритим доступом",
    image: "assets/BodyZDostupomChervone.jpg",
    images: ["assets/BodyZDostupomChervone.jpg", "assets/BodyZDostupomChervone2.webp", "assets/BodyZDostupomChervone3.jpg"],
    color: "червоний",
    price: 330,
    sizes: ["S","M","L","XL"],
    description: `Неймовірно чарівний боді з відкритим доступом.
    Створений для незабутніх ночей.
    Матеріал нейлон, дуже еластичний.
    Приймає форму тіла і регулюється затяжками.`
    },
    
    {
    id: 9,
    category: "КОМПЛЕКТИ",
    name: "Комплект Bella",
    image: "assets/BodyBella.jpg",
    images: ["assets/BodyBella.jpg", "assets/BodyBella2.jpg", "assets/BodyBella3.jpg"],
    price: 410,
    sizes: ["XS","S","M","L","XL"],
    description: `Красивий комплект для особливих подій.
    Матеріал нейлон, ніжний на дотик і добре тягнеться.
    Підійде на XS, S, M, L, XL.
    Комплектація: топ + колготки.`
    },
    
    {
    id: 10,
    category: "КОМПЛЕКТИ",
    name: "Комплект Monica",    
    image: "assets/KomplektMonika.jpg",
    images: ["assets/KomplektMonika.jpg", "assets/KomplektMonika2.jpg", "assets/KomplektMonika3.jpg"],
    price: 400,
    sizes: ["XS","S","M","L"],
    description: `Красивий комплект для незабутніх моментів.
    Матеріал нейлон, добре тягнеться.
    Підійде на XS, S, M, L.
    Ідеально сідає по фігурі.`
    },
    
    {
    id: 11,
    category: "ХАЛАТИ",
    name: "Халатик + трусики",
    image: "assets/XalatZKruzhevomSiniy.png",
    images: ["assets/XalatZKruzhevomSiniy.png", "assets/XalatZKruzhevomSiniy2.png", "assets/XalatZKruzhevomSiniy3.png"],
    color: "синій",
    price: 270,
    sizes: ["XS","S","M","L","XL"],
    description: `Короткий халат з поясом.
    На плечах і спині вставки з прозорого мережива.
    У комплекті трусики T-стрінги.`
    },
    
    {
    id: 12,
    category: "ХАЛАТИ",
    name: "Халатик + трусики",
    image: "assets/XalatZKruzhevomChervoni.png",
    images: ["assets/XalatZKruzhevomChervoni.png", "assets/XalatZKruzhevomChervoni2.png"],
    color: "червоний",
    price: 270,
    sizes: ["XS","S","M","L","XL"],
    description: `Короткий халат з поясом.
    На плечах і спині вставки з прозорого мережива.
    У комплекті трусики T-стрінги.`
    },
    
    {
    id: 13,
    category: "ХАЛАТИ",
    name: "Халатик + трусики",
    image: "assets/XalatPlusTrusikiChorni.jpg",
    images: ["assets/XalatPlusTrusikiChorni.jpg", "assets/XalatPlusTrusikiChorni2.jpg", "assets/XalatPlusTrusikiChorni3.jpg"],
    color: "чорний",
    price: 310,
    sizes: ["XS","S","M","L"],
    description: `Елегантний напівпрозорий халатик.
    Підкреслює силует.
    Прикрашений вставками з мережива.
    Зав'язується стрічкою спереду.
    У комплекті трусики-стрінги.
    Довжина халатика 75 см.`
    },
    
    {
    id: 14,
    category: "ХАЛАТИ",
    name: "Халатик + трусики",
    image: "assets/XalatPlusTrusikiChervoni.jpg",
    images: ["assets/XalatPlusTrusikiChervoni.jpg", "assets/XalatPlusTrusikiChervoni2.jpg", "assets/XalatPlusTrusikiChervoni3.jpg"],
    color: "червоний",
    price: 310,
    sizes: ["XS","S","M","L"],
    description: `Елегантний напівпрозорий халатик.
    Підкреслює силует.
    Прикрашений вставками з мережива.
    Зав'язується стрічкою спереду.
    У комплекті трусики-стрінги.
    Довжина халатика 75 см.`
    },

    {
    id: 15,
    category: "БОДІ",
    name: "Боді з доступом чорне",
    image: "assets/BodyZDostupomChorne2.jpg",
    images: ["assets/BodyZDostupomChorne2.jpg"],
    color: "чорне",
    price: 360,
    sizes: ["80B", "80C", "80D", "80E", "85B", "85C", "85D", "85E", "90B", "90C", "90D", "90E"],
    description: `Боді з відкритим вирізом знизу. Зручне для годування. М'який пуш-ап. Можна носити з костюмом або окремо.`
    }
    ];

    let currentProductId = null;

function escapeHtml(str = '') {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderProducts() {
    const grid = document.querySelector('[data-products-grid]');
    if (!grid) return;

    grid.innerHTML = '';

    products.forEach(product => {
        const article = document.createElement('article');
        article.className = 'product-card';
        article.setAttribute('data-product-modal', product.id);

        const fullName = product.color
            ? `${product.name} (${product.color})`
            : product.name;

        const imageMarkup = product.image
            ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(fullName)}" class="product-main-img">`
            : `<div class="product-placeholder">Фото скоро</div>`;

        article.innerHTML = `
            <div class="product-image">
                <span class="product-sale-badge">Розпродаж</span>
                ${imageMarkup}
                <button class="product-quick-add" type="button">Детальніше</button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                <p class="product-desc">
                    ${product.color ? `Колір: ${escapeHtml(product.color)}<br>` : ''}
                    ${escapeHtml(product.category)}
                </p>
                <div class="product-footer">
                    <span class="product-prices">
                        <span class="product-price-old">${Math.round(product.price * 1.25)} грн</span>
                        <span class="product-price">${product.price} грн</span>
                    </span>
                    <button class="product-add" data-id="${product.id}" type="button">+</button>
                </div>
            </div>
        `;

        grid.appendChild(article);
    });
}

function bindProductEvents() {
    // Кнопка "+" на картці — відкриває модалку товару
    document.querySelectorAll('.product-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (id) openProductModal(id);
        });
    });

    document.querySelectorAll('.product-quick-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.product-card');
            const id = card?.getAttribute('data-product-modal');
            if (id) {
                openProductModal(id);
            }
        });
    });

    document.querySelectorAll('.product-card[data-product-modal]').forEach(card => {
        card.addEventListener('click', (e) => {
            const target = e.target;
            if (target instanceof HTMLElement && target.closest('button')) return;

            const id = card.getAttribute('data-product-modal');
            if (id) {
                openProductModal(id);
            }
        });
    });
}

