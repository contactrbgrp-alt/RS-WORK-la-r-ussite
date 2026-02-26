// --- RS-WORK AUTH ENGINE (ULTRA ROBUST) ---
console.log("RS-WORK Auth: Script starting...");

window.addEventListener('DOMContentLoaded', () => {
    console.log("RS-WORK Auth: DOM fully loaded.");

    try {
        // 1. Theme Management
        const themeToggle = document.getElementById('theme-toggle');
        const htmlElement = document.documentElement;

        if (themeToggle) {
            const savedTheme = localStorage.getItem('studyboost-theme') || 'light';
            htmlElement.setAttribute('data-theme', savedTheme);

            themeToggle.onclick = () => {
                const next = htmlElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
                htmlElement.setAttribute('data-theme', next);
                localStorage.setItem('studyboost-theme', next);
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
                    localStorage.setItem('studyboost-logged-in', 'true');
                    localStorage.setItem('studyboost-current-user', JSON.stringify(adminUser));
                    localStorage.setItem('studyboost-payment-verified', 'true');
                    window.location.href = 'dashboard.html';
                    return;
                }

                // Normal User Check
                const users = JSON.parse(localStorage.getItem('studyboost-users') || '[]');
                const user = users.find(u => u.email.toLowerCase() === email);

                if (user && user.password === pass) {
                    localStorage.setItem('studyboost-logged-in', 'true');
                    localStorage.setItem('studyboost-current-user', JSON.stringify(user));
                    window.location.href = 'dashboard.html';
                } else {
                    alert("Email ou mot de passe incorrect.");
                }
            };
        }

        if (signupForm) {
            signupForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('signup-name').value;
                const email = (document.getElementById('signup-email').value || "").trim().toLowerCase();
                const pass = document.getElementById('signup-password').value;
                const plan = document.getElementById('signup-plan').value;

                const users = JSON.parse(localStorage.getItem('studyboost-users') || '[]');
                if (users.find(u => u.email === email)) {
                    alert("Email déjà utilisé.");
                    return;
                }

                const newUser = { name, email, password: pass, plan };
                users.push(newUser);
                localStorage.setItem('studyboost-users', JSON.stringify(users));
                localStorage.setItem('studyboost-logged-in', 'true');
                localStorage.setItem('studyboost-current-user', JSON.stringify(newUser));

                window.location.href = 'dashboard.html';
            };
        }

    } catch (err) {
        console.error("RS-WORK Auth: Critical Error during initialization!", err);
    }
});
