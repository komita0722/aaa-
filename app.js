let currentIdx = 0;
let selectedLabels = [];
let isRandomMode = false;
let filteredQuestions = [...FULL_QUESTIONS];

// 統計用変数
let totalAnswered = 0;
let correctCount = 0;

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
    accuracy: document.getElementById('accuracy-rate')
};

// カテゴリ初期化
const categories = [...new Set(FULL_QUESTIONS.map(q => q.category))];
const firstOpt = document.createElement('option');
firstOpt.value = 'All'; firstOpt.textContent = 'すべてのカテゴリ';
el.category.appendChild(firstOpt);
categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    el.category.appendChild(opt);
});

function render() {
    const q = filteredQuestions[currentIdx];
    if (!q) return;

    selectedLabels = [];
    el.explanation.classList.add('hidden');
    el.submit.classList.remove('hidden');
    el.submit.disabled = true;
    el.options.innerHTML = '';
    
    el.qText.textContent = `Q${q.id}. ${q.question}`;
    el.progress.textContent = `問題 ${currentIdx + 1} / ${filteredQuestions.length}`;
    
    // 進捗バー更新
    const progressPercent = ((currentIdx + 1) / filteredQuestions.length) * 100;
    el.progressFill.style.width = `${progressPercent}%`;

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "option-btn w-full p-4 rounded-2xl border-2 border-slate-100 text-left transition-all flex items-center gap-4 bg-white hover:border-indigo-200 shadow-sm";
        btn.innerHTML = `<span class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold transition-all">${opt.label}</span> <span class="flex-1 text-sm">${opt.text}</span>`;
        
        btn.onclick = () => {
            if (!el.explanation.classList.contains('hidden')) return;
            const isMultiple = q.correctAnswer.length > 1;
            if (isMultiple) {
                if (selectedLabels.includes(opt.label)) {
                    selectedLabels = selectedLabels.filter(l => l !== opt.label);
                    btn.classList.remove('selected');
                } else {
                    selectedLabels.push(opt.label);
                    btn.classList.add('selected');
                }
            } else {
                selectedLabels = [opt.label];
                Array.from(el.options.children).forEach(c => c.classList.remove('selected'));
                btn.classList.add('selected');
            }
            el.submit.disabled = selectedLabels.length === 0;
        };
        el.options.appendChild(btn);
    });

    el.prev.disabled = currentIdx === 0;
    el.next.disabled = currentIdx === filteredQuestions.length - 1;
}

el.submit.onclick = () => {
    const q = filteredQuestions[currentIdx];
    const isCorrect = selectedLabels.length === q.correctAnswer.length && 
                      selectedLabels.every(l => q.correctAnswer.includes(l));

    // 統計更新
    totalAnswered++;
    if (isCorrect) correctCount++;
    const rate = Math.round((correctCount / totalAnswered) * 100);
    el.accuracy.textContent = `${rate}% (正解:${correctCount} / 挑戦:${totalAnswered})`;

    el.expText.textContent = q.explanation;
    el.explanation.classList.remove('hidden');
    el.submit.classList.add('hidden');

    Array.from(el.options.children).forEach((btn, idx) => {
        const label = q.options[idx].label;
        if (q.correctAnswer.includes(label)) btn.classList.add('correct');
        else if (selectedLabels.includes(label)) btn.classList.add('wrong');
    });
};

el.next.onclick = () => { if (currentIdx < filteredQuestions.length - 1) { currentIdx++; render(); } };
el.prev.onclick = () => { if (currentIdx > 0) { currentIdx--; render(); } };

function updateFilter() {
    const cat = el.category.value;
    const s = el.search.value.toLowerCase();
    filteredQuestions = FULL_QUESTIONS.filter(q => (cat === 'All' || q.category === cat) && (q.question.toLowerCase().includes(s) || q.explanation.toLowerCase().includes(s)));
    if (isRandomMode) filteredQuestions.sort(() => Math.random() - 0.5);
    currentIdx = 0; render();
}

el.category.onchange = updateFilter;
el.search.oninput = updateFilter;
el.random.onclick = () => {
    isRandomMode = !isRandomMode;
    el.random.textContent = isRandomMode ? "🔄 ランダム中" : "🔄 番号順";
    updateFilter();
};

render();
