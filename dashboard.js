// --- RS-WORK DASHBOARD ENGINE (TOTAL RECOVERY MODE) ---
console.log("RS-WORK Dashboard: Engine starting...");

const CONFIG = {
    adminEmail: "r.ruseenthiranruthees@gmail.com"
};



let state = {
    chapters: [],
    currentChapter: null,
    flashcards: [],
    currentFlashcardIndex: 0,
    quiz: [],
    currentQuizIndex: 0,
    userAnswers: {},
    favorites: JSON.parse(localStorage.getItem('studyboost-favorites') || '[]')
};

window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    console.log("RS-WORK: Initializing...");

    // 1. Auth & Payment Check
    const user = JSON.parse(localStorage.getItem('studyboost-current-user') || '{}');
    if (localStorage.getItem('studyboost-logged-in') !== 'true') {
        window.location.href = 'index ruthees.html';
        return;
    }

    const isAdmin = user.email === CONFIG.adminEmail;
    // Temporarily disabled payment lock to ensure user can see their courses
    // const isPaid = localStorage.getItem('studyboost-payment-verified') === 'true';
    document.getElementById('payment-lock').classList.add('hidden');

    if (isAdmin) {
        document.getElementById('admin-sidebar-link').classList.remove('hidden');
    }

    // 2. Initialize UI Components
    if (window.lucide) lucide.createIcons();
    setupTheme();
    setupNavigation();
    setupFilters();
    setupActionButtons();

    // 3. Load Library
    const db = window.RS_DB || (typeof RS_DB !== 'undefined' ? RS_DB : null);
    if (db && db.chapters) {
        state.chapters = db.chapters;
        renderLibrary();
    } else {
        console.error("RS-WORK: Database (db.js) not found. Check if the file is loaded correctly.");
    }
}

function setupTheme() {
    const themeBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    html.setAttribute('data-theme', localStorage.getItem('studyboost-theme') || 'light');

    themeBtn.onclick = () => {
        const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        localStorage.setItem('studyboost-theme', next);
        if (window.lucide) lucide.createIcons();
    };
}

function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-link');
    const views = document.querySelectorAll('.view');

    links.forEach(link => {
        link.onclick = (e) => {
            if (link.style.pointerEvents === 'none') return;
            e.preventDefault();
            const target = link.dataset.view;
            showView(target);
        };
    });

    document.querySelectorAll('.back-to-lib').forEach(btn => {
        btn.onclick = () => showView('library');
    });

    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.onclick = () => {
            localStorage.clear();
            window.location.href = 'index ruthees.html';
        };
    });
}

function showView(viewId) {
    const views = document.querySelectorAll('.view');
    const links = document.querySelectorAll('.sidebar-link');

    views.forEach(v => {
        v.id === `view-${viewId}` ? v.classList.remove('hidden') : v.classList.add('hidden');
    });

    links.forEach(l => {
        if (l.dataset.view === viewId) {
            l.classList.add('active');
        } else if (l.dataset.view !== 'progress') { // Keep active states clean
            l.classList.remove('active');
        }
    });

    if (viewId === 'admin') updateAdminStats();
    if (viewId === 'favorites') renderFavorites();
    if (window.lucide) lucide.createIcons();
}

function setupFilters() {
    document.getElementById('f-level').onchange = renderLibrary;
    document.getElementById('f-subject').onchange = renderLibrary;
}

function renderLibrary() {
    const grid = document.getElementById('lib-grid');
    const level = document.getElementById('f-level').value;
    const subject = document.getElementById('f-subject').value;

    const filtered = state.chapters.filter(c => {
        return (level === 'all' || c.level === level) && (subject === 'all' || c.subject === subject);
    });

    grid.innerHTML = filtered.map(c => {
        const isFav = state.favorites.includes(c.id);
        return `
        <div class="chapter-card" style="background:var(--bg-main); border:1px solid var(--border); border-radius:15px; padding:25px; transition:all 0.3s; cursor:pointer; position:relative; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
                <div style="display:flex; gap:8px">
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(0,74,173,0.1); color:var(--primary)">${c.level}</span>
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(99,102,241,0.1); color:#6366f1">${c.subject}</span>
                </div>
                <button onclick="event.stopPropagation(); toggleFavorite(${c.id})" class="fav-btn" style="background:none; border:none; cursor:pointer; color:${isFav ? '#f59e0b' : 'var(--text-muted)'}; padding:5px;">
                    <i data-lucide="${isFav ? 'star' : 'star'}"></i>
                </button>
            </div>
            <div onclick="selectChapter(${c.id})">
                <h3 style="margin-bottom:10px">${c.title}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted)">${c.flashcards.length} Flashcards â€¢ ${c.quiz.length} Questions</p>
            </div>
        </div>
    `}).join('');

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:50px; color:var(--text-muted)">Aucun chapitre trouvÃ©.</p>';
    }
}

window.selectChapter = (id) => {
    const chapter = state.chapters.find(c => c.id === id);
    if (!chapter) return;

    state.currentChapter = chapter;
    state.flashcards = chapter.flashcards;
    state.quiz = chapter.quiz;
    state.currentFlashcardIndex = 0;
    state.currentQuizIndex = 0;
    state.userAnswers = {};

    // Enable navigation links
    const enable = ['nav-flashcards', 'nav-quiz'];
    enable.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
        }
    });

    document.getElementById('title-fc').textContent = chapter.title;
    document.getElementById('title-q').textContent = `Quiz : ${chapter.title}`;

    updateFlashcardUI();
    updateQuizUI();
    showView('flashcards');
};

function setupActionButtons() {
    // Flashcards
    document.getElementById('current-flashcard').onclick = () => {
        const inner = document.querySelector('.flashcard-inner');
        const currentRotation = inner.style.transform || 'rotateY(0deg)';
        inner.style.transform = currentRotation === 'rotateY(180deg)' ? 'rotateY(0deg)' : 'rotateY(180deg)';
    };

    document.getElementById('fc-prev').onclick = () => {
        if (state.currentFlashcardIndex > 0) {
            state.currentFlashcardIndex--;
            updateFlashcardUI();
        }
    };

    document.getElementById('fc-next').onclick = () => {
        if (state.currentFlashcardIndex < state.flashcards.length - 1) {
            state.currentFlashcardIndex++;
            updateFlashcardUI();
        }
    };


}



function updateFlashcardUI() {
    if (!state.flashcards.length) return;
    const card = state.flashcards[state.currentFlashcardIndex];
    document.getElementById('card-question').textContent = card.question;
    document.getElementById('card-answer').textContent = card.answer;
    document.getElementById('fc-count').textContent = `${state.currentFlashcardIndex + 1} / ${state.flashcards.length}`;
    document.querySelector('.flashcard-inner').style.transform = 'rotateY(0deg)';
}

function updateQuizUI() {
    if (!state.quiz.length) return;
    const q = state.quiz[state.currentQuizIndex];
    document.querySelector('.quiz-question').textContent = q.question;
    const container = document.querySelector('.quiz-options');
    container.innerHTML = '';

    q.options.forEach(opt => {
        const b = document.createElement('button');
        b.className = 'option full-width' + (state.userAnswers[state.currentQuizIndex] === opt ? ' selected' : '');
        b.style.textAlign = 'left';
        b.style.padding = '15px';
        b.textContent = opt;
        b.onclick = () => {
            state.userAnswers[state.currentQuizIndex] = opt;
            updateQuizUI();
        };
        container.appendChild(b);
    });

    const nextBtn = document.getElementById('next-quiz-btn');
    nextBtn.disabled = !state.userAnswers[state.currentQuizIndex];
    nextBtn.textContent = (state.currentQuizIndex === state.quiz.length - 1) ? "Terminer le Quiz" : "Question Suivante";
    document.getElementById('q-bar').style.width = `${((state.currentQuizIndex + 1) / state.quiz.length) * 100}%`;

    nextBtn.onclick = () => {
        if (state.currentQuizIndex < state.quiz.length - 1) {
            state.currentQuizIndex++;
            updateQuizUI();
        } else {
            const score = calculateScore();
            alert(`Quiz terminÃ© ! Votre score : ${score} / ${state.quiz.length}`);
            showView('library');
        }
    };
}

function calculateScore() {
    return state.quiz.reduce((score, q, i) => {
        return score + (state.userAnswers[i] === q.answer ? 1 : 0);
    }, 0);
}

window.toggleFavorite = (id) => {
    const idx = state.favorites.indexOf(id);
    if (idx > -1) {
        state.favorites.splice(idx, 1);
    } else {
        state.favorites.push(id);
    }
    localStorage.setItem('studyboost-favorites', JSON.stringify(state.favorites));
    renderLibrary();
    if (document.getElementById('view-favorites').classList.contains('hidden') === false) {
        renderFavorites();
    }
};

function renderFavorites() {
    const grid = document.getElementById('fav-grid');
    const filtered = state.chapters.filter(c => state.favorites.includes(c.id));

    grid.innerHTML = filtered.map(c => `
        <div class="chapter-card" style="background:var(--bg-main); border:1px solid var(--border); border-radius:15px; padding:25px; transition:all 0.3s; cursor:pointer; position:relative; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px">
                <div style="display:flex; gap:8px">
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(0,74,173,0.1); color:var(--primary)">${c.level}</span>
                    <span style="padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; background:rgba(99,102,241,0.1); color:#6366f1">${c.subject}</span>
                </div>
                <button onclick="event.stopPropagation(); toggleFavorite(${c.id})" class="fav-btn" style="background:none; border:none; cursor:pointer; color:#f59e0b; padding:5px;">
                    <i data-lucide="star"></i>
                </button>
            </div>
            <div onclick="selectChapter(${c.id})">
                <h3 style="margin-bottom:10px">${c.title}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted)">${c.flashcards.length} Flashcards â€¢ ${c.quiz.length} Questions</p>
            </div>
        </div>
    `).join('');

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:50px; color:var(--text-muted)">Vous n\'avez aucun cours favori pour le moment.</p>';
    }
    if (window.lucide) lucide.createIcons();
}



function updateAdminStats() {


    const users = JSON.parse(localStorage.getItem('studyboost-users') || '[]');
    document.getElementById('stats-total-users').textContent = users.length;
    document.getElementById('stats-monthly-plans').textContent = users.filter(u => u.plan === 'monthly').length;
    document.getElementById('stats-annual-plans').textContent = users.filter(u => u.plan === 'annual').length;

    const list = document.getElementById('admin-user-list');
    if (list) {
        list.innerHTML = users.map(u => `
            <div class="user-row" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; background:var(--bg-main); padding:15px; border-radius:12px; border:1px solid var(--border);">
                <div>
                    <div style="font-weight:700; font-size:1rem; color:var(--text-main)">${u.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted)">${u.email}</div>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                    <span class="badge ${u.plan === 'annual' ? 'featured' : ''}" style="background:var(--primary); color:white; padding:6px 12px; border-radius:8px; font-size:0.7rem; font-weight:700;">
                        ${u.plan === 'annual' ? 'ABONNEMENT ANNUEL' : 'ABONNEMENT MENSUEL'}
                    </span>
                    ${u.email !== CONFIG.adminEmail ? `<button onclick="deleteUser('${u.email}')" class="btn btn-sm" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:none; padding:8px; border-radius:8px; cursor:pointer;"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>` : ''}
                </div>
            </div>
        `).join('');
    }
    if (window.lucide) lucide.createIcons();
}

window.deleteUser = (email) => {
    if (confirm(`Supprimer l'utilisateur ${email} ?`)) {
        let users = JSON.parse(localStorage.getItem('studyboost-users') || '[]');
        users = users.filter(u => u.email !== email);
        localStorage.setItem('studyboost-users', JSON.stringify(users));
        updateAdminStats();
    }
};

// Custom CSS for animations and states
const style = document.createElement('style');
style.innerHTML = `
    .spin { animation: rotate 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .option.selected { background: var(--primary) !important; color: white !important; border-color: var(--primary) !important; }
    .hidden { display: none !important; }
    .chapter-card:hover { transform: translateY(-5px); border-color: var(--primary); box-shadow: var(--shadow-lg); }
    .badge { font-weight: 700; font-size: 0.8rem; }
`;
document.head.appendChild(style);

