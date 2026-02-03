// --- 1. 状態管理 (localStorageから読み込み、なければ初期化) ---
let progress = JSON.parse(localStorage.getItem('sf_admin_quiz_v1')) || {
    wrongIds: [],      // 間違えた問題のIDリスト
    correctCount: 0,   // 総正解数
    totalAttempted: 0, // 総挑戦数
    catStats: {}       // カテゴリ別の統計 { カテゴリ名: {correct: 0, attempt: 0} }
};

let currentIdx = 0;
let selectedLabels = [];
let isRandomMode = false;
let isReviewMode = false;
let filteredQuestions = [...FULL_QUESTIONS];

// --- 2. HTML要素の取得 ---
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

// --- 3. 初期化処理 ---
// カテゴリセレクトボックスの生成
const categories = [...new Set(FULL_QUESTIONS.map(q => q.category))];
el.category.innerHTML = '<option value="All">すべてのカテゴリ</option>';
categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    el.category.appendChild(opt);
});

// データの保存と表示更新
function save() {
    localStorage.setItem('sf_admin_quiz_v1', JSON.stringify(progress));
    updateStatsDisplay();
}

// 統計表示の更新（UIの二重表示を防止）
function updateStatsDisplay() {
    const rate = progress.totalAttempted === 0 ? 0 : Math.round((progress.correctCount / progress.totalAttempted) * 100);
    el.accuracy.textContent = `${rate}%`;
    el.statDetails.textContent = `正解:${progress.correctCount} / 挑戦:${progress.totalAttempted}`;

    // 弱点分析 (正解率70%未満を弱点として表示)
    const weak = Object.entries(progress.catStats)
        .map(([name, s]) => ({ name, rate: (s.correct / s.attempt) * 100 }))
        .filter(c => c.rate < 70)
        .sort((a, b) => a.rate - b.rate)
        .map(c => `${c.name}(${Math.round(c.rate)}%)`);
    
    el.weakCats.textContent = weak.length > 0 ? `弱点: ${weak.join(', ')}` : "弱点: 分析中または順調です";
}

// --- 4. メインロジック ---

// 問題の描画
function render() {
    const q = filteredQuestions[currentIdx];
    
    // 問題がない場合の表示（復習モード等で0件になった時）
    if (!q) {
        el.qText.innerHTML = `
            <div class="text-center py-10">
                <p class="text-slate-400 mb-4">${isReviewMode ? "復習が必要な（間違えた）問題はありません！" : "該当する問題が見つかりません。"}</p>
                <button onclick="resetFilters()" class="text-indigo-600 underline text-sm font-bold">条件をクリアして全問表示に戻す</button>
            </div>`;
        el.options.innerHTML = "";
        el.submit.classList.add('hidden');
        el.progress.textContent = "0 / 0";
        el.progressFill.style.width = "0%";
        el.prev.disabled = true;
        el.next.disabled = true;
        return;
    }

    selectedLabels = [];
    el.explanation.classList.add('hidden');
    el.submit.classList.remove('hidden');
    el.submit.disabled = true;
    el.options.innerHTML = '';
    
    el.qText.textContent = `Q${q.id}. ${q.question}`;
    el.progress.textContent = `問題 ${currentIdx + 1} / ${filteredQuestions.length} ${isReviewMode ? '(復習中)' : ''}`;
    el.progressFill.style.width = `${((currentIdx + 1) / filteredQuestions.length) * 100}%`;

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

// 回答確定
el.submit.onclick = () => {
    const q = filteredQuestions[currentIdx];
    const isCorrect = selectedLabels.length === q.correctAnswer.length && 
                      selectedLabels.every(l => q.correctAnswer.includes(l));

    // カテゴリ統計の初期化
    if (!progress.catStats[q.category]) progress.catStats[q.category] = { correct: 0, attempt: 0 };
    
    // 統計のカウントアップ
    progress.totalAttempted++;
    progress.catStats[q.category].attempt++;

    if (isCorrect) {
        progress.correctCount++;
        progress.catStats[q.category].correct++;
        // 正解したら「間違えたリスト」から削除
        progress.wrongIds = progress.wrongIds.filter(id => id !== q.id);
    } else {
        // 間違えたら「間違えたリスト」に追加（重複防止）
        if (!progress.wrongIds.includes(q.id)) progress.wrongIds.push(q.id);
    }

    save();

    // 解説表示と正誤判定のスタイル適用
    el.expText.textContent = q.explanation;
    el.explanation.classList.remove('hidden');
    el.submit.classList.add('hidden');

    Array.from(el.options.children).forEach((btn, idx) => {
        const label = q.options[idx].label;
        if (q.correctAnswer.includes(label)) btn.classList.add('correct');
        else if (selectedLabels.includes(label)) btn.classList.add('wrong');
    });
};

// --- 5. フィルタ・モード切替 ---

function updateFilter() {
    const cat = el.category.value;
    const s = el.search.value.toLowerCase();
    
    filteredQuestions = FULL_QUESTIONS.filter(q => {
        const matchCat = (cat === 'All' || q.category === cat);
        const matchSearch = (q.question.toLowerCase().includes(s) || q.explanation.toLowerCase().includes(s));
        const matchReview = isReviewMode ? progress.wrongIds.includes(q.id) : true;
        return matchCat && matchSearch && matchReview;
    });

    if (isRandomMode) filteredQuestions.sort(() => Math.random() - 0.5);
    
    currentIdx = 0; 
    render();
}

// 条件を完全にクリアする
window.resetFilters = () => {
    isReviewMode = false;
    el.reviewBtn.textContent = "❌ 復習モード: OFF";
    el.reviewBtn.className = "border px-3 py-2 rounded-lg text-xs bg-white hover:bg-rose-50 text-rose-600 font-bold transition-colors";
    el.category.value = "All";
    el.search.value = "";
    updateFilter();
};

// --- 6. イベントリスナー ---

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
    if (isReviewMode) {
        el.reviewBtn.textContent = "❌ 復習モード: ON";
        el.reviewBtn.classList.replace('bg-white', 'bg-rose-600');
        el.reviewBtn.classList.replace('text-rose-600', 'text-white');
    } else {
        el.reviewBtn.textContent = "❌ 復習モード: OFF";
        el.reviewBtn.classList.replace('bg-rose-600', 'bg-white');
        el.reviewBtn.classList.replace('text-white', 'text-rose-600');
    }
    updateFilter();
};

el.resetBtn.onclick = () => {
    if(confirm("これまでの学習記録（正解率や間違えた問題）をすべてリセットしますか？")) {
        localStorage.removeItem('sf_admin_quiz_v1');
        location.reload();
    }
};

// 初回実行
updateStatsDisplay();
render();
