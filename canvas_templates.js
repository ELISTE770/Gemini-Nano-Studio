// Canvas Built-in Project Templates for Gemini Nano Studio
const CANVAS_BUILTIN_TEMPLATES = {
    kanban: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>לוח משימות Kanban</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Assistant', sans-serif; background-color: #0f172a; }</style>
</head>
<body class="p-6 text-slate-100 min-h-screen">
  <div class="max-w-5xl mx-auto space-y-6">
    <header class="flex items-center justify-between pb-4 border-b border-slate-800">
      <div>
        <h1 class="text-2xl font-black text-white flex items-center gap-2">📋 לוח משימות Kanban</h1>
        <p class="text-xs text-slate-400 mt-1">גרור משימות בין העמודות • שמירה אוטומטית מקומית</p>
      </div>
      <button onclick="addTask('todo')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
        + משימה חדשה
      </button>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- To Do -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[450px]">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <span class="font-bold text-sm text-blue-400">לביצוע (To Do)</span>
          <span id="count-todo" class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono">0</span>
        </div>
        <div id="col-todo" class="flex-1 space-y-3" ondragover="allowDrop(event)" ondrop="dropTask(event, 'todo')"></div>
      </div>

      <!-- In Progress -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[450px]">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <span class="font-bold text-sm text-amber-400">בתהליך (In Progress)</span>
          <span id="count-inprogress" class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono">0</span>
        </div>
        <div id="col-inprogress" class="flex-1 space-y-3" ondragover="allowDrop(event)" ondrop="dropTask(event, 'inprogress')"></div>
      </div>

      <!-- Done -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[450px]">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <span class="font-bold text-sm text-emerald-400">הושלם (Done)</span>
          <span id="count-done" class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono">0</span>
        </div>
        <div id="col-done" class="flex-1 space-y-3" ondragover="allowDrop(event)" ondrop="dropTask(event, 'done')"></div>
      </div>
    </div>
  </div>

  <script>
    let tasks = JSON.parse(localStorage.getItem('kanban_tasks') || '[]');
    if (tasks.length === 0) {
      tasks = [
        { id: '1', title: 'הגדרת שרת מקומי Gemini Nano', col: 'done' },
        { id: '2', title: 'בדיקת ביצועים וטוקנים לשנייה', col: 'inprogress' },
        { id: '3', title: 'אינדוקס מסמכים במאגר ידע RAG', col: 'todo' }
      ];
      save();
    }

    function save() {
      localStorage.setItem('kanban_tasks', JSON.stringify(tasks));
      render();
    }

    function render() {
      ['todo', 'inprogress', 'done'].forEach(col => {
        const el = document.getElementById('col-' + col);
        const colTasks = tasks.filter(t => t.col === col);
        document.getElementById('count-' + col).textContent = colTasks.length;
        el.innerHTML = colTasks.map(t => \`
          <div id="task-\${t.id}" draggable="true" ondragstart="dragTask(event, '\${t.id}')" class="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 rounded-xl cursor-grab active:cursor-grabbing transition shadow flex items-start justify-between gap-2 group">
            <span class="text-xs text-slate-200 font-medium leading-relaxed">\${t.title}</span>
            <button onclick="deleteTask('\${t.id}')" class="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-1">✕</button>
          </div>
        \`).join('');
      });
    }

    function addTask(col) {
      const title = prompt('הזן תיאור משימה:');
      if (!title || !title.trim()) return;
      tasks.push({ id: Date.now().toString(), title: title.trim(), col: col });
      save();
    }

    function deleteTask(id) {
      tasks = tasks.filter(t => t.id !== id);
      save();
    }

    let draggedId = null;
    function dragTask(e, id) { draggedId = id; e.dataTransfer.setData('text', id); }
    function allowDrop(e) { e.preventDefault(); }
    function dropTask(e, targetCol) {
      e.preventDefault();
      const task = tasks.find(t => t.id === draggedId);
      if (task) {
        task.col = targetCol;
        save();
      }
    }
    render();
  </script>
</body>
</html>`,
    chart: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>דשבורד ותרשימים אינטראקטיביים</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Assistant', sans-serif; background-color: #0b0f19; }</style>
</head>
<body class="p-6 text-slate-100 min-h-screen">
  <div class="max-w-5xl mx-auto space-y-6">
    <header class="flex items-center justify-between pb-4 border-b border-slate-800">
      <div>
        <h1 class="text-2xl font-black text-white">📊 דשבורד ויזואליזציה</h1>
        <p class="text-xs text-slate-400">הזן נתונים בטבלה וצפה בעדכון הגרפים בזמן אמת</p>
      </div>
      <button onclick="addRow()" class="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold transition shadow-lg shadow-purple-500/20">
        + הוסף שורה לטבלה
      </button>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 class="font-bold text-sm text-purple-400">התפלגות לפי קטגוריה (עמודות)</h3>
        <div class="h-64"><canvas id="barChart"></canvas></div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 class="font-bold text-sm text-blue-400">אחוזים יחסיים (עוגה)</h3>
        <div class="h-64 flex items-center justify-center"><canvas id="pieChart"></canvas></div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <h3 class="font-bold text-sm text-slate-200">טבלת נתונים לעריכה</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs text-slate-300">
          <thead class="border-b border-slate-800 text-slate-400">
            <tr>
              <th class="p-2.5">קטגוריה</th>
              <th class="p-2.5">ערך / כמות</th>
              <th class="p-2.5 w-16">פעולה</th>
            </tr>
          </thead>
          <tbody id="dataTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    let chartData = [
      { label: 'עיבוד שפה טבעית', val: 85 },
      { label: 'כתיבת קוד ואלגוריתמים', val: 92 },
      { label: 'סיכום מסמכים', val: 78 },
      { label: 'מענה קולי מקומי', val: 88 }
    ];

    let barChart, pieChart;

    function initCharts() {
      const ctxBar = document.getElementById('barChart').getContext('2d');
      barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: chartData.map(d => d.label),
          datasets: [{
            label: 'ביצועים (%)',
            data: chartData.map(d => d.val),
            backgroundColor: 'rgba(147, 51, 234, 0.6)',
            borderColor: 'rgb(168, 85, 247)',
            borderWidth: 1.5,
            borderRadius: 8
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } }, scales: { y: { ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } } }
      });

      const ctxPie = document.getElementById('pieChart').getContext('2d');
      pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: chartData.map(d => d.label),
          datasets: [{
            data: chartData.map(d => d.val),
            backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } } }
      });
      renderTable();
    }

    function renderTable() {
      const tbody = document.getElementById('dataTableBody');
      tbody.innerHTML = chartData.map((d, i) => \`
        <tr class="border-b border-slate-800/50 hover:bg-slate-800/40">
          <td class="p-2.5"><input type="text" value="\${d.label}" onchange="updateData(\${i}, 'label', this.value)" class="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs w-full text-white"></td>
          <td class="p-2.5"><input type="number" value="\${d.val}" onchange="updateData(\${i}, 'val', Number(this.value))" class="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs w-32 text-white"></td>
          <td class="p-2.5"><button onclick="deleteRow(\${i})" class="text-rose-400 hover:text-rose-300 text-xs">✕ מחק</button></td>
        </tr>
      \`).join('');
    }

    function updateData(i, key, val) {
      chartData[i][key] = val;
      updateCharts();
    }

    function addRow() {
      chartData.push({ label: 'קטגוריה חדשה', val: 50 });
      renderTable();
      updateCharts();
    }

    function deleteRow(i) {
      chartData.splice(i, 1);
      renderTable();
      updateCharts();
    }

    function updateCharts() {
      barChart.data.labels = chartData.map(d => d.label);
      barChart.data.datasets[0].data = chartData.map(d => d.val);
      barChart.update();

      pieChart.data.labels = chartData.map(d => d.label);
      pieChart.data.datasets[0].data = chartData.map(d => d.val);
      pieChart.update();
    }

    window.onload = initCharts;
  </script>
</body>
</html>`,
    finance: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>מחשבון פיננסי והלוואות</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Assistant', sans-serif; background-color: #06111e; }</style>
</head>
<body class="p-6 text-slate-100 min-h-screen">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="pb-4 border-b border-slate-800">
      <h1 class="text-2xl font-black text-white flex items-center gap-2">💰 מחשבון הלוואה וריבית דריבית</h1>
      <p class="text-xs text-slate-400 mt-1">חישוב החזר חודשי מדויק, סך ריביות ופריסת לוח סילוקין</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
        <span class="text-xs text-emerald-400 font-bold">החזר חודשי משוער:</span>
        <div id="resMonthly" class="text-2xl font-black text-emerald-300 font-mono">₪0</div>
      </div>
      <div class="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-1">
        <span class="text-xs text-blue-400 font-bold">סך כל ההחזר:</span>
        <div id="resTotal" class="text-2xl font-black text-blue-300 font-mono">₪0</div>
      </div>
      <div class="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-1">
        <span class="text-xs text-amber-400 font-bold">סך הריבית לתשלום:</span>
        <div id="resInterest" class="text-2xl font-black text-amber-300 font-mono">₪0</div>
      </div>
    </div>

    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div class="space-y-2">
        <div class="flex justify-between text-xs font-bold text-slate-300">
          <span>סכום ההלוואה:</span>
          <span id="valAmount" class="text-emerald-400 font-mono">₪100,000</span>
        </div>
        <input type="range" id="inpAmount" min="10000" max="2000000" step="5000" value="100000" class="w-full accent-emerald-500 cursor-pointer" oninput="calculate()">
      </div>

      <div class="space-y-2">
        <div class="flex justify-between text-xs font-bold text-slate-300">
          <span>ריבית שנתית (%):</span>
          <span id="valRate" class="text-blue-400 font-mono">4.5%</span>
        </div>
        <input type="range" id="inpRate" min="0.5" max="15.0" step="0.1" value="4.5" class="w-full accent-blue-500 cursor-pointer" oninput="calculate()">
      </div>

      <div class="space-y-2">
        <div class="flex justify-between text-xs font-bold text-slate-300">
          <span>תקופה (שנים):</span>
          <span id="valYears" class="text-purple-400 font-mono">10 שנים</span>
        </div>
        <input type="range" id="inpYears" min="1" max="30" step="1" value="10" class="w-full accent-purple-500 cursor-pointer" oninput="calculate()">
      </div>
    </div>
  </div>

  <script>
    function calculate() {
      const P = Number(document.getElementById('inpAmount').value);
      const annualRate = Number(document.getElementById('inpRate').value);
      const years = Number(document.getElementById('inpYears').value);

      document.getElementById('valAmount').textContent = '₪' + P.toLocaleString();
      document.getElementById('valRate').textContent = annualRate.toFixed(1) + '%';
      document.getElementById('valYears').textContent = years + ' שנים';

      const r = (annualRate / 100) / 12;
      const n = years * 12;

      let monthly = 0;
      if (r === 0) {
        monthly = P / n;
      } else {
        monthly = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }

      const total = monthly * n;
      const interest = total - P;

      document.getElementById('resMonthly').textContent = '₪' + Math.round(monthly).toLocaleString();
      document.getElementById('resTotal').textContent = '₪' + Math.round(total).toLocaleString();
      document.getElementById('resInterest').textContent = '₪' + Math.round(interest).toLocaleString();
    }
    calculate();
  </script>
</body>
</html>`,
    game: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Retro Space Arcade</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>canvas { background: radial-gradient(circle, #101426 0%, #050711 100%); }</style>
</head>
<body class="bg-slate-950 flex flex-col items-center justify-center min-h-screen text-slate-100 p-4 select-none">
  <div class="max-w-xl w-full space-y-3 text-center">
    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
      <h2 class="text-base font-bold text-amber-400">👾 Retro Space Canvas</h2>
      <div class="text-xs font-mono">ניקוד: <span id="score" class="text-emerald-400 font-bold">0</span></div>
    </div>
    <canvas id="gameCanvas" width="540" height="380" class="rounded-2xl border border-slate-800 shadow-2xl mx-auto"></canvas>
    <p class="text-[11px] text-slate-400">שליטה: מקשי חיצים ⬅️ ➡️ או מקשי A/D • ירייה: מקש רווח (Space)</p>
  </div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let score = 0;
    let gameOver = false;

    const player = { x: canvas.width / 2 - 15, y: canvas.height - 35, w: 30, h: 18, speed: 6 };
    const bullets = [];
    const enemies = [];
    const keys = {};

    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.key === ' ' && !gameOver) {
        bullets.push({ x: player.x + player.w/2 - 2, y: player.y, w: 4, h: 10, speed: 7 });
      }
      if (gameOver && e.key === 'r') restart();
    });
    window.addEventListener('keyup', e => keys[e.key] = false);

    function spawnEnemy() {
      if (enemies.length < 7 && Math.random() < 0.04) {
        enemies.push({ x: Math.random() * (canvas.width - 30), y: -20, w: 24, h: 20, speed: 1.5 + Math.random() * 1.5 });
      }
    }

    function update() {
      if (gameOver) return;
      if (keys['ArrowLeft'] || keys['a']) player.x = Math.max(0, player.x - player.speed);
      if (keys['ArrowRight'] || keys['d']) player.x = Math.min(canvas.width - player.w, player.x + player.speed);

      bullets.forEach((b, bi) => {
        b.y -= b.speed;
        if (b.y < -10) bullets.splice(bi, 1);
      });

      enemies.forEach((en, ei) => {
        en.y += en.speed;
        if (en.y > canvas.height) enemies.splice(ei, 1);

        bullets.forEach((b, bi) => {
          if (b.x < en.x + en.w && b.x + b.w > en.x && b.y < en.y + en.h && b.y + b.h > en.y) {
            enemies.splice(ei, 1);
            bullets.splice(bi, 1);
            score += 10;
            document.getElementById('score').textContent = score;
          }
        });

        if (en.x < player.x + player.w && en.x + en.w > player.x && en.y < player.y + player.h && en.y + en.h > player.y) {
          gameOver = true;
        }
      });
      spawnEnemy();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Player Ship
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(player.x + player.w/2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h);
      ctx.lineTo(player.x, player.y + player.h);
      ctx.fill();

      // Bullets
      ctx.fillStyle = '#facc15';
      bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

      // Enemies
      ctx.fillStyle = '#f43f5e';
      enemies.forEach(en => ctx.fillRect(en.x, en.y, en.w, en.h));

      if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('המשחק נגמר!', canvas.width/2, canvas.height/2 - 10);
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('לחץ R להתחלה מחדש', canvas.width/2, canvas.height/2 + 20);
      }
    }

    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }
    function restart() {
      gameOver = false;
      score = 0;
      enemies.length = 0;
      bullets.length = 0;
      document.getElementById('score').textContent = '0';
    }
    loop();
  </script>
</body>
</html>`
};
