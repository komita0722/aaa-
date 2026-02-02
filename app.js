let currentIdx = 0;
let selectedLabels = [];
let isRandomMode = false;
let filteredQuestions = [...FULL_QUESTIONS];

const elements = {
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
    progress: document.getElementById('progress-badge')
};

// カテゴリ初期化
[...new Set(FULL_QUESTIONS.map(q => q.category))].forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    elements.category.appendChild(opt);
});

function render() {
    const q = filteredQuestions[currentIdx];
    if (!q) { elements.qText.textContent = "該当する問題がありません"; return; }

    selectedLabels = [];
    elements.explanation.classList.add('hidden');
    elements.submit.classList.remove('hidden');
    elements.submit.disabled = true;
    elements.options.innerHTML = '';
    
    elements.qText.textContent = `Q${q.id}. ${q.question}`;
    elements.progress.textContent = `${currentIdx + 1} / ${filteredQuestions.length}`;

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "option-btn w-full p-5 rounded-2xl border-2 border-slate-100 text-left transition-all flex items-center gap-4 bg-white hover:border-indigo-200 shadow-sm";
        btn.innerHTML = `<span class="label-circle w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold transition-all">${opt.label}</span> <span class="flex-1">${opt.text}</span>`;
        
        btn.onclick = () => {
            if (!elements.explanation.classList.contains('hidden')) return;
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
                Array.from(elements.options.children).forEach(c => c.classList.remove('selected'));
                btn.classList.add('selected');
            }
            elements.submit.disabled = selectedLabels.length === 0;
        };
        elements.options.appendChild(btn);
    });
}

elements.submit.onclick = () => {
    const q = filteredQuestions[currentIdx];
    elements.explanation.classList.remove('hidden');
    elements.expText.textContent = q.explanation;
    elements.submit.classList.add('hidden');

    Array.from(elements.options.children).forEach((btn, idx) => {
        const label = q.options[idx].label;
        if (q.correctAnswer.includes(label)) btn.classList.add('correct');
        else if (selectedLabels.includes(label)) btn.classList.add('wrong');
    });
};

elements.next.onclick = () => { if (currentIdx < filteredQuestions.length - 1) { currentIdx++; render(); } };
elements.prev.onclick = () => { if (currentIdx > 0) { currentIdx--; render(); } };

function updateFilter() {
    const cat = elements.category.value;
    const s = elements.search.value.toLowerCase();
    filteredQuestions = FULL_QUESTIONS.filter(q => (cat === 'All' || q.category === cat) && (q.question.toLowerCase().includes(s) || q.explanation.toLowerCase().includes(s)));
    if (isRandomMode) filteredQuestions.sort(() => Math.random() - 0.5);
    currentIdx = 0; render();
}

elements.category.onchange = updateFilter;
elements.search.oninput = updateFilter;
elements.random.onclick = () => {
    isRandomMode = !isRandomMode;
    elements.random.textContent = isRandomMode ? "🔄 ランダム中" : "🔄 番号順";
    updateFilter();
};

render();
