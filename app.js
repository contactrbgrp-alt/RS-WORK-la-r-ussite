// --- RS-WORK AUTH ENGINE (ULTRA ROBUST) ---
console.log("RS-WORK Auth: Script starting...");

window.addEventListener('DOMContentLoaded', () => {
    console.log("RS-WORK Auth: DOM fully loaded.");

    // Data Migration: StudyBoost -> RS-WORK
    ['theme', 'favorites', 'users', 'logged-in', 'current-user', 'payment-verified'].forEach(key => {
        const oldKey = `studyboost-${key}`;
        const newKey = `rswork-${key}`;
        if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, localStorage.getItem(oldKey));
        }
    });

    try {
        // 1. Theme Management
        const themeToggle = document.getElementById('theme-toggle');
        const htmlElement = document.documentElement;

        if (themeToggle) {
            const savedTheme = localStorage.getItem('rswork-theme') || 'light';
            htmlElement.setAttribute('data-theme', savedTheme);

            themeToggle.onclick = () => {
                const next = htmlElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                htmlElement.setAttribute('data-theme', next);
                localStorage.setItem('rswork-theme', next);
                if (window.lucide) lucide.createIcons();
            };
        }

        // 2. Lucide Icons
        if (window.lucide) {
            lucide.createIcons();
        } else {
            console.error("RS-WORK Auth: Lucide not found!");
        }

        // 3. Modal Elements
        const modal = document.getElementById('auth-modal');
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const closeModal = document.querySelector('.close-modal');
        const authTabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const heroCta = document.getElementById('hero-cta');

        if (!modal) {
            console.error("RS-WORK Auth: Auth modal not found in DOM.");
            return;
        }

        const openModal = (tab = 'login') => {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            switchTab(tab);
        };

        const switchTab = (tab) => {
            authTabs.forEach(t => t.dataset.tab === tab ? t.classList.add('active') : t.classList.remove('active'));
            if (tab === 'login') {
                if (loginForm) loginForm.classList.remove('hidden');
                if (signupForm) signupForm.classList.add('hidden');
            } else {
                if (loginForm) loginForm.classList.add('hidden');
                if (signupForm) signupForm.classList.remove('hidden');
            }
        };

        if (loginBtn) loginBtn.onclick = () => openModal('login');
        if (signupBtn) signupBtn.onclick = () => openModal('signup');
        if (heroCta) heroCta.onclick = () => openModal('signup');
        if (closeModal) closeModal.onclick = () => {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        };

        authTabs.forEach(tab => {
            tab.onclick = () => switchTab(tab.dataset.tab);
        });

        // 4. Auth Logic
        const ADMIN_EMAIL = "r.ruseenthiranruthees@gmail.com";

        if (loginForm) {
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim().toLowerCase();
                const pass = document.getElementById('login-password').value;

                console.log("RS-WORK Auth: Login attempt for", email);

                // Admin Bypass (Password provided: 1627200506)
                if (email === ADMIN_EMAIL && pass === "1627200506") {
                    console.log("RS-WORK Auth: Admin login success.");
                    const adminUser = { name: "Admin", email: ADMIN_EMAIL, isAdmin: true, plan: "annual" };
                    localStorage.setItem('rswork-logged-in', 'true');
                    localStorage.setItem('rswork-current-user', JSON.stringify(adminUser));
                    localStorage.setItem('rswork-payment-verified', 'true');
                    window.location.href = 'dashboard.html';
                    return;
                }

                // Normal User Check
                const users = JSON.parse(localStorage.getItem('rswork-users') || '[]');
                const user = users.find(u => u.email.toLowerCase() === email);

                if (user && user.password === pass) {
                    localStorage.setItem('rswork-logged-in', 'true');
                    localStorage.setItem('rswork-current-user', JSON.stringify(user));
                    if (user.isPaid) {
                        localStorage.setItem('rswork-payment-verified', 'true');
                    } else {
                        localStorage.removeItem('rswork-payment-verified');
                    }
                    window.location.href = 'dashboard.html';
                } else {
                    alert("Email ou mot de passe incorrect.");
                }
            };
        }

        // Helper for signup steps
        window.showSignupStep = (step) => {
            const s1 = document.getElementById('signup-step-1');
            const s2 = document.getElementById('signup-step-2');
            if (!s1 || !s2) return;

            if (step === 1) {
                s1.classList.remove('hidden');
                s2.classList.add('hidden');
            } else {
                s1.classList.add('hidden');
                s2.classList.remove('hidden');
            }
        };

        if (signupForm) {
            signupForm.onsubmit = (e) => {
                e.preventDefault();
                const email = (document.getElementById('signup-email').value || "").trim().toLowerCase();
                const users = JSON.parse(localStorage.getItem('rswork-users') || '[]');

                if (users.find(u => u.email === email)) {
                    alert("Email déjà utilisé.");
                    return;
                }

                if (email === ADMIN_EMAIL) {
                    // Quick path for admin
                    completeRegistration(null);
                    return;
                }

                // Show step 2 (Payment)
                const planValue = document.getElementById('signup-plan').value;
                document.getElementById('selected-plan-name').textContent = planValue === 'monthly' ? 'Mensuel (5,99€)' : 'Annuel (50€)';
                showSignupStep(2);
                setupSignupPayPal();
            };
        }

        function setupSignupPayPal() {
            const container = document.getElementById('paypal-registration-container');
            if (!container || !window.paypal) return;
            if (container.children.length > 0) return; // Already rendered

            const plan = document.getElementById('signup-plan').value;
            const amount = plan === 'monthly' ? '5.99' : '50.00';

            paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: { value: amount },
                            description: 'Inscription RS-WORK - Plan ' + plan
                        }]
                    });
                },
                onApprove: (data, actions) => {
                    return actions.order.capture().then(details => {
                        completeRegistration(details.id);
                    });
                },
                onError: (err) => {
                    console.error("PayPal Error:", err);
                    alert("Une erreur est survenue lors du paiement. Veuillez réessayer.");
                }
            }).render('#paypal-registration-container');
        }

        function completeRegistration(orderId) {
            const name = document.getElementById('signup-name').value;
            const email = (document.getElementById('signup-email').value || "").trim().toLowerCase();
            const pass = document.getElementById('signup-password').value;
            const plan = document.getElementById('signup-plan').value;

            const users = JSON.parse(localStorage.getItem('rswork-users') || '[]');
            const newUser = {
                name,
                email,
                password: pass,
                plan,
                isPaid: true,
                paidAt: new Date().toISOString(),
                paypalOrderID: orderId,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            localStorage.setItem('rswork-users', JSON.stringify(users));
            localStorage.setItem('rswork-logged-in', 'true');
            localStorage.setItem('rswork-current-user', JSON.stringify(newUser));
            localStorage.setItem('rswork-payment-verified', 'true');

            alert("Bienvenue " + name + " ! Votre paiement a été validé et votre compte est actif.");
            window.location.href = 'dashboard.html';
        }

        // 5. Cookie Consent Banner (RGPD)
        const showCookieBanner = () => {
            if (localStorage.getItem('rswork-cookies-accepted')) return;

            const banner = document.createElement('div');
            banner.id = 'cookie-banner';
            banner.style = `
                position: fixed; bottom: 20px; left: 20px; right: 20px; 
                background: var(--bg-main); border: 1px solid var(--border); 
                padding: 20px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                z-index: 10000; display: flex; align-items: center; justify-content: space-between;
                flex-wrap: wrap; gap: 15px;
            `;
            banner.innerHTML = `
                <div style="flex: 1; min-width: 250px;">
                    <div style="font-weight: 700; margin-bottom: 5px;">🍪 Respect de votre vie privée</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">
                        RS-WORK utilise des cookies essentiels pour assurer le bon fonctionnement du site et de votre espace membre. 
                        En continuant, vous acceptez notre <a href="mentions-legales.html" style="color: var(--primary);">politique de confidentialité</a>.
                    </div>
                </div>
                <button id="accept-cookies" class="btn btn-primary" style="padding: 10px 25px;">Accepter</button>
            `;
            document.body.appendChild(banner);

            document.getElementById('accept-cookies').onclick = () => {
                localStorage.setItem('rswork-cookies-accepted', 'true');
                banner.remove();
            };
        };

        showCookieBanner();

    } catch (err) {
        console.error("RS-WORK Auth: Critical Error during initialization!", err);
    }
});
