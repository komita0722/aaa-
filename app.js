// --- 状態管理 ---
let progress = JSON.parse(localStorage.getItem('sf_admin_quiz_2026')) || {
    wrongIds: [],
    correctCount: 0,
    totalAttempted: 0,
    catStats: {}
};

let currentIdx = 0;
let selectedLabels = [];
let isRandomMode = false;
let isReviewMode = false;
let filteredQuestions = [...FULL_QUESTIONS];

const el = {
    qText: document.getElementById('question-text'),
    options: document.getElementById('options-container'),
    explanation: document.getElementById('explanation-box'),
    expText: document.getElementById('explanation-text'),
    submit: document.getElementById('submit-btn'),
    next: document.getElementById('next-btn'),
    prev: document.getElementById('prev-btn'),
    category: document.getElementById('category-filter'),
    random: document.getElementById('random-btn'),
    search: document.getElementById('search-input'),
    progress: document.getElementById('progress-badge'),
    progressFill: document.getElementById('progress-fill'),
    accuracy: document.getElementById('accuracy-rate'),
    statDetails: document.getElementById('stat-details'),
    weakCats: document.getElementById('weak-categories'),
    reviewBtn: document.getElementById('review-mode-btn'),
    resetBtn: document.getElementById('reset-stats')
};

// --- 初期化 ---
const init = () => {
    const categories = [...new Set(FULL_QUESTIONS.map(q => q.category))];
    el.category.innerHTML = '<option value="All">すべてのカテゴリ</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        el.category.appendChild(opt);
    });
    updateStatsDisplay();
    render();
};

function save() {
    localStorage.setItem('sf_admin_quiz_2026', JSON.stringify(progress));
    updateStatsDisplay();
}

function updateStatsDisplay() {
    const rate = progress.totalAttempted === 0 ? 0 : Math.round((progress.correctCount / progress.totalAttempted) * 100);
    el.accuracy.textContent = `${rate}%`;
    el.statDetails.textContent = `正解:${progress.correctCount} / 挑戦:${progress.totalAttempted}`;

    const weak = Object.entries(progress.catStats)
        .map(([name, s]) => ({ name, rate: (s.correct / s.attempt) * 100 }))
        .filter(c => c.rate < 70)
        .sort((a, b) => a.rate - b.rate)
        .map(c => `${c.name}`);
    el.weakCats.textContent = weak.length > 0 ? `重点復習: ${weak.join(' / ')}` : "弱点: なし（順調です！）";
}

// --- 描画・操作 ---
function render() {
    const q = filteredQuestions[currentIdx];
    if (!q) {
        el.qText.innerHTML = `<div class="text-center text-slate-400">問題が見つかりません</div>`;
        el.options.innerHTML = "";
        return;
    }

    selectedLabels = [];
    el.explanation.classList.add('hidden');
    el.submit.classList.remove('hidden');
    el.submit.disabled = true;
    el.options.innerHTML = '';
    
    el.qText.textContent = q.question;
    el.progress.textContent = `Q${q.id} | ${currentIdx + 1} / ${filteredQuestions.length} ${isReviewMode ? ' [復習中]' : ''}`;
    el.progressFill.style.width = `${((currentIdx + 1) / filteredQuestions.length) * 100}%`;

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "option-btn w-full p-4 rounded-2xl border-2 border-slate-100 text-left transition-all flex items-center gap-4 bg-white hover:border-indigo-200 shadow-sm";
        btn.innerHTML = `<span class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">${opt.label}</span> <span class="flex-1 text-sm">${opt.text}</span>`;
        
        btn.onclick = () => {
            if (!el.explanation.classList.contains('hidden')) return;
            selectedLabels = [opt.label];
            Array.from(el.options.children).forEach(c => c.classList.remove('selected'));
            btn.classList.add('selected');
            el.submit.disabled = false;
        };
        el.options.appendChild(btn);
    });

    el.prev.disabled = currentIdx === 0;
    el.next.disabled = currentIdx === filteredQuestions.length - 1;
}

el.submit.onclick = () => {
    const q = filteredQuestions[currentIdx];
    const isCorrect = selectedLabels[0] === q.correctAnswer[0];

    if (!progress.catStats[q.category]) progress.catStats[q.category] = { correct: 0, attempt: 0 };
    progress.totalAttempted++;
    progress.catStats[q.category].attempt++;

    if (isCorrect) {
        progress.correctCount++;
        progress.catStats[q.category].correct++;
        progress.wrongIds = progress.wrongIds.filter(id => id !== q.id);
    } else {
        if (!progress.wrongIds.includes(q.id)) progress.wrongIds.push(q.id);
    }

    save();
    el.expText.textContent = q.explanation;
    el.explanation.classList.remove('hidden');
    el.submit.classList.add('hidden');

    Array.from(el.options.children).forEach((btn, idx) => {
        const label = q.options[idx].label;
        if (q.correctAnswer.includes(label)) btn.classList.add('correct');
        else if (selectedLabels.includes(label)) btn.classList.add('wrong');
    });
};

const updateFilter = () => {
    const cat = el.category.value;
    const s = el.search.value.toLowerCase();
    
    filteredQuestions = FULL_QUESTIONS.filter(q => {
        const matchCat = (cat === 'All' || q.category === cat);
        const matchSearch = q.question.toLowerCase().includes(s);
        const matchReview = isReviewMode ? progress.wrongIds.includes(q.id) : true;
        return matchCat && matchSearch && matchReview;
    });

    if (isRandomMode) filteredQuestions.sort(() => Math.random() - 0.5);
    currentIdx = 0;
    render();
};

// --- イベント ---
el.next.onclick = () => { if (currentIdx < filteredQuestions.length - 1) { currentIdx++; render(); } };
el.prev.onclick = () => { if (currentIdx > 0) { currentIdx--; render(); } };
el.category.onchange = updateFilter;
el.search.oninput = updateFilter;
el.random.onclick = () => {
    isRandomMode = !isRandomMode;
    el.random.textContent = isRandomMode ? "🔄 ランダム中" : "🔄 番号順";
    updateFilter();
};
el.reviewBtn.onclick = () => {
    isReviewMode = !isReviewMode;
    el.reviewBtn.className = isReviewMode ? 
        "border px-3 py-2 rounded-lg text-xs bg-rose-600 text-white font-bold transition-colors" : 
        "border px-3 py-2 rounded-lg text-xs bg-white text-rose-600 font-bold transition-colors";
    el.reviewBtn.textContent = isReviewMode ? "✅ 復習モード: ON" : "❌ 復習モード: OFF";
    updateFilter();
};
el.resetBtn.onclick = () => {
    if(confirm("学習記録をリセットしますか？")) {
        localStorage.removeItem('sf_admin_quiz_2026');
        location.reload();
    }
};

init();
