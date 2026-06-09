// Mini LeetCode Application Logic
// Exposes window.LeetApp controller

(function() {
  // Load Confetti Library dynamically from CDN
  const confettiScript = document.createElement('script');
  confettiScript.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
  document.head.appendChild(confettiScript);

  // Application State
  const State = {
    problems: [],
    customProblems: [],
    submissions: [],
    activeProblemId: null,
    activeLanguage: 'javascript', // 'javascript' | 'python'
    activeTab: 'description',     // 'description' | 'submissions'
    activeConsoleTab: 'testcases', // 'testcases' | 'results'
    editor: null,                 // Monaco editor instance
    draftCodes: {},               // Key: problemId_lang, Value: code draft
    streak: 0,
    lastActiveDate: null
  };

  // Helper: Get active problem object
  function getActiveProblem() {
    return State.problems.find(p => p.id === State.activeProblemId);
  }

  // Helper: Deep compare JSON values for output verification
  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a && b && typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        // LeetCode allows arrays to be matched elements-wise
        // But for ordering (like Two Sum), we match element-wise order
        for (let i = 0; i < a.length; i++) {
          if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
      }
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }

  // Core App Object
  window.LeetApp = {
    init: function() {
      // 1. Load data from localStorage
      try {
        const storedCustom = localStorage.getItem('mini_leetcode_custom_problems');
        if (storedCustom) State.customProblems = JSON.parse(storedCustom);

        const storedSubmissions = localStorage.getItem('mini_leetcode_submissions');
        if (storedSubmissions) State.submissions = JSON.parse(storedSubmissions);

        const storedDrafts = localStorage.getItem('mini_leetcode_drafts');
        if (storedDrafts) State.draftCodes = JSON.parse(storedDrafts);

        // Load Streak info
        const streakCount = localStorage.getItem('mini_leetcode_streak') || 0;
        const lastActive = localStorage.getItem('mini_leetcode_last_active');
        State.streak = parseInt(streakCount);
        State.lastActiveDate = lastActive;
      } catch (err) {
        console.error("Error loading localStorage data", err);
      }

      // Merge default and custom problems
      State.problems = [...window.defaultProblems, ...State.customProblems];

      // Update Streak badge on startup
      this.checkAndIncrementStreak();

      // 2. Setup Event Listeners
      this.setupNavigation();
      this.setupFilters();
      this.setupWorkspaceTabs();
      this.setupConsoleTabs();
      this.setupExecutionButtons();
      this.setupCreatorForm();

      // 3. Render Initial Dashboard
      this.renderProblemsList();
      this.updateGlobalStats();

      // 4. Initialize Monaco Editor
      this.loadMonaco();

      // 5. Initialize Lucide Icons
      if (window.lucide) {
        window.lucide.createIcons();
      }
    },

    // Streak Logic: Increments if active on a new calendar day
    checkAndIncrementStreak: function() {
      const today = new Date().toDateString();
      if (State.lastActiveDate !== today) {
        // If yesterday was active, increment. If older, reset to 1. If none, start 1.
        if (State.lastActiveDate) {
          const lastDate = new Date(State.lastActiveDate);
          const diffTime = Math.abs(new Date(today) - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            State.streak += 1;
          } else {
            State.streak = 1;
          }
        } else {
          State.streak = 1;
        }
        
        State.lastActiveDate = today;
        localStorage.setItem('mini_leetcode_streak', State.streak);
        localStorage.setItem('mini_leetcode_last_active', today);
      }
      
      document.getElementById('streak-count').textContent = State.streak;
    },

    // Navigation and Routing
    setupNavigation: function() {
      const self = this;
      
      document.getElementById('nav-logo-btn').addEventListener('click', () => {
        self.showView('view-dashboard');
      });
      document.getElementById('nav-problems-btn').addEventListener('click', () => {
        self.showView('view-dashboard');
      });
      document.getElementById('nav-creator-btn').addEventListener('click', () => {
        self.showView('view-creator');
      });
      document.getElementById('nav-analytics-btn').addEventListener('click', () => {
        self.showView('view-analytics');
        self.renderAnalytics();
      });
      document.getElementById('btn-cancel-creator').addEventListener('click', () => {
        self.showView('view-dashboard');
      });
      document.getElementById('btn-modal-close').addEventListener('click', () => {
        document.getElementById('success-modal').classList.add('hidden');
        self.showView('view-dashboard');
      });
    },

    showView: function(viewId) {
      // Hide all views
      document.querySelectorAll('.content-view').forEach(view => {
        view.classList.add('hidden');
      });

      // Show target view
      document.getElementById(viewId).classList.remove('hidden');

      // Update active nav button
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
      });

      if (viewId === 'view-dashboard') {
        document.getElementById('nav-problems-btn').classList.add('active');
        this.renderProblemsList();
        this.updateGlobalStats();
      } else if (viewId === 'view-creator') {
        document.getElementById('nav-creator-btn').classList.add('active');
      } else if (viewId === 'view-analytics') {
        document.getElementById('nav-analytics-btn').classList.add('active');
      }

      // Re-trigger Monaco Editor layout recalculation on visibility change
      if (viewId === 'view-workspace' && State.editor) {
        setTimeout(() => State.editor.layout(), 50);
      }

      if (window.lucide) window.lucide.createIcons();
    },

    // Problems List Rendering & Filtering
    setupFilters: function() {
      const search = document.getElementById('search-problems-input');
      const diff = document.getElementById('filter-difficulty');
      const cat = document.getElementById('filter-category');
      const status = document.getElementById('filter-status');

      const handleFilterChange = () => {
        this.renderProblemsList(
          search.value,
          diff.value,
          cat.value,
          status.value
        );
      };

      search.addEventListener('input', handleFilterChange);
      diff.addEventListener('change', handleFilterChange);
      cat.addEventListener('change', handleFilterChange);
      status.addEventListener('change', handleFilterChange);
    },

    renderProblemsList: function(search = '', diff = '', cat = '', status = '') {
      const body = document.getElementById('problems-list-body');
      body.innerHTML = '';

      const filtered = State.problems.filter(p => {
        // Match Search Query
        const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                            p.category.toLowerCase().includes(search.toLowerCase());
        
        // Match Difficulty
        const matchDiff = diff === '' || p.difficulty === diff;

        // Match Category
        const matchCat = cat === '' || p.category === cat;

        // Match Status
        let matchStatus = true;
        const problemSubmissions = State.submissions.filter(s => s.problemId === p.id);
        const isSolved = problemSubmissions.some(s => s.status === 'Accepted');
        const isAttempted = problemSubmissions.length > 0 && !isSolved;

        if (status === 'Solved') {
          matchStatus = isSolved;
        } else if (status === 'Attempted') {
          matchStatus = isAttempted;
        } else if (status === 'Unsolved') {
          matchStatus = !isSolved && !isAttempted;
        }

        return matchSearch && matchDiff && matchCat && matchStatus;
      });

      if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">No problems found matching filters.</td></tr>`;
        return;
      }

      filtered.forEach(p => {
        const tr = document.createElement('tr');

        // Status Column
        const problemSubmissions = State.submissions.filter(s => s.problemId === p.id);
        const isSolved = problemSubmissions.some(s => s.status === 'Accepted');
        const isAttempted = problemSubmissions.length > 0 && !isSolved;

        let statusHtml = '<i data-lucide="circle" style="color: var(--text-muted); width: 18px; height: 18px;"></i>';
        if (isSolved) {
          statusHtml = '<i data-lucide="check-circle-2" class="status-solved-icon" style="width: 18px; height: 18px;"></i>';
        } else if (isAttempted) {
          statusHtml = '<i data-lucide="help-circle" class="status-attempted-icon" style="width: 18px; height: 18px;"></i>';
        }

        // Difficulty Text class
        let diffClass = 'text-easy';
        if (p.difficulty === 'Medium') diffClass = 'text-medium';
        if (p.difficulty === 'Hard') diffClass = 'text-hard';

        tr.innerHTML = `
          <td style="text-align: center; vertical-align: middle;">${statusHtml}</td>
          <td><span class="problem-title-link" data-id="${p.id}">${p.title}</span></td>
          <td><span class="category-badge">${p.category}</span></td>
          <td><span class="difficulty-badge ${p.difficulty.toLowerCase()}">${p.difficulty}</span></td>
          <td><button class="btn btn-secondary btn-sm solve-btn" data-id="${p.id}">Solve</button></td>
        `;

        // Click actions
        tr.querySelector('.problem-title-link').addEventListener('click', () => this.loadProblem(p.id));
        tr.querySelector('.solve-btn').addEventListener('click', () => this.loadProblem(p.id));

        body.appendChild(tr);
      });

      if (window.lucide) window.lucide.createIcons();
    },

    updateGlobalStats: function() {
      // Total problems count by difficulty
      const totalEasy = State.problems.filter(p => p.difficulty === 'Easy').length;
      const totalMed = State.problems.filter(p => p.difficulty === 'Medium').length;
      const totalHard = State.problems.filter(p => p.difficulty === 'Hard').length;
      const totalAll = State.problems.length;

      // Unique solved count by difficulty
      const solvedIds = [...new Set(State.submissions.filter(s => s.status === 'Accepted').map(s => s.problemId))];
      const solvedEasy = State.problems.filter(p => p.difficulty === 'Easy' && solvedIds.includes(p.id)).length;
      const solvedMed = State.problems.filter(p => p.difficulty === 'Medium' && solvedIds.includes(p.id)).length;
      const solvedHard = State.problems.filter(p => p.difficulty === 'Hard' && solvedIds.includes(p.id)).length;
      const solvedAll = solvedIds.length;

      // Percent
      const percentAll = totalAll > 0 ? Math.round((solvedAll / totalAll) * 100) : 0;
      const pctEasy = totalEasy > 0 ? Math.round((solvedEasy / totalEasy) * 100) : 0;
      const pctMed = totalMed > 0 ? Math.round((solvedMed / totalMed) * 100) : 0;
      const pctHard = totalHard > 0 ? Math.round((solvedHard / totalHard) * 100) : 0;

      // Update DOM Text
      document.getElementById('global-solved-percent').textContent = `${percentAll}%`;
      document.getElementById('global-solved-count').textContent = `${solvedAll}/${totalAll} Solved`;
      
      document.getElementById('easy-count-text').textContent = `${solvedEasy}/${totalEasy}`;
      document.getElementById('medium-count-text').textContent = `${solvedMed}/${totalMed}`;
      document.getElementById('hard-count-text').textContent = `${solvedHard}/${totalHard}`;

      // Update DOM Bars
      document.getElementById('easy-progress-bar').style.width = `${pctEasy}%`;
      document.getElementById('medium-progress-bar').style.width = `${pctMed}%`;
      document.getElementById('hard-progress-bar').style.width = `${pctHard}%`;

      // Animate SVG Ring
      // dasharray = 314.16. Offset is 314.16 - (314.16 * pct / 100)
      const ring = document.getElementById('global-progress-bar');
      const offset = 314.16 - (314.16 * percentAll / 100);
      ring.style.strokeDashoffset = offset;
    },

    // Workspace Pane Tabs Navigation
    setupWorkspaceTabs: function() {
      const tabDesc = document.getElementById('w-tab-description');
      const tabSubs = document.getElementById('w-tab-submissions');
      const paneDesc = document.getElementById('w-content-description');
      const paneSubs = document.getElementById('w-content-submissions');

      tabDesc.addEventListener('click', () => {
        tabDesc.classList.add('active');
        tabSubs.classList.remove('active');
        paneDesc.classList.remove('hidden');
        paneSubs.classList.add('hidden');
      });

      tabSubs.addEventListener('click', () => {
        tabSubs.classList.add('active');
        tabDesc.classList.remove('active');
        paneSubs.classList.remove('hidden');
        paneDesc.classList.add('hidden');
        this.renderProblemSubmissions();
      });
    },

    setupConsoleTabs: function() {
      const tabTC = document.getElementById('c-tab-testcases');
      const tabRes = document.getElementById('c-tab-results');
      const paneTC = document.getElementById('c-content-testcases');
      const paneRes = document.getElementById('c-content-results');

      tabTC.addEventListener('click', () => {
        tabTC.classList.add('active');
        tabRes.classList.remove('active');
        paneTC.classList.remove('hidden');
        paneRes.classList.add('hidden');
        State.activeConsoleTab = 'testcases';
      });

      tabRes.addEventListener('click', () => {
        tabRes.classList.add('active');
        tabTC.classList.remove('active');
        paneRes.classList.remove('hidden');
        paneTC.classList.add('hidden');
        State.activeConsoleTab = 'results';
      });

      // Expand/Collapse header click
      const consolePane = document.getElementById('console-pane');
      const arrowIcon = document.getElementById('console-arrow-icon');
      
      document.getElementById('console-header-drag').addEventListener('click', (e) => {
        // Prevent click when clicking active tab buttons
        if (e.target.classList.contains('c-tab') || e.target.closest('.console-actions')) return;
        
        if (consolePane.classList.contains('collapsed')) {
          consolePane.classList.remove('collapsed');
          consolePane.classList.add('expanded');
          arrowIcon.setAttribute('data-lucide', 'chevron-down');
        } else {
          consolePane.classList.remove('expanded');
          consolePane.classList.add('collapsed');
          arrowIcon.setAttribute('data-lucide', 'chevron-up');
        }
        if (window.lucide) window.lucide.createIcons();
        
        // Re-layout monaco editor because height changed
        setTimeout(() => { if (State.editor) State.editor.layout(); }, 150);
      });

      document.getElementById('btn-toggle-console').addEventListener('click', () => {
        if (consolePane.classList.contains('collapsed')) {
          consolePane.classList.remove('collapsed');
          consolePane.classList.add('expanded');
          arrowIcon.setAttribute('data-lucide', 'chevron-down');
        } else {
          consolePane.classList.remove('expanded');
          consolePane.classList.add('collapsed');
          arrowIcon.setAttribute('data-lucide', 'chevron-up');
        }
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => { if (State.editor) State.editor.layout(); }, 150);
      });
    },

    // Load Monaco Editor using require.js
    loadMonaco: function() {
      const self = this;
      require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }});
      
      require(['vs/editor/editor.main'], function() {
        const container = document.getElementById('editor-container');
        container.innerHTML = ''; // clear loading placeholder

        State.editor = monaco.editor.create(container, {
          value: '// Select a problem to start coding!',
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          minimap: { enabled: false },
          roundedSelection: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 }
        });

        // Event listener: Save draft on change
        State.editor.onDidChangeModelContent(() => {
          if (State.activeProblemId) {
            const code = State.editor.getValue();
            const key = `${State.activeProblemId}_${State.activeLanguage}`;
            State.draftCodes[key] = code;
            localStorage.setItem('mini_leetcode_drafts', JSON.stringify(State.draftCodes));
          }
        });

        // Trigger updates if problem already selected
        if (State.activeProblemId) {
          self.loadProblemCode();
        }
      });
    },

    // Load problem details into UI
    loadProblem: function(id) {
      State.activeProblemId = id;
      const p = getActiveProblem();
      if (!p) return;

      // Update text details
      document.getElementById('prob-title').textContent = p.title;
      
      const diffBadge = document.getElementById('prob-difficulty');
      diffBadge.textContent = p.difficulty;
      diffBadge.className = `difficulty-badge ${p.difficulty.toLowerCase()}`;
      
      document.getElementById('prob-category').textContent = p.category;
      document.getElementById('prob-description').innerHTML = p.description;

      // Render examples
      const exContainer = document.getElementById('prob-examples');
      exContainer.innerHTML = '';
      p.examples.forEach((ex, idx) => {
        const div = document.createElement('div');
        div.className = 'example-item';
        let explHtml = ex.explanation ? `<div class="example-explanation"><strong>Explanation:</strong> ${ex.explanation}</div>` : '';
        div.innerHTML = `
          <h4>Example ${idx + 1}:</h4>
          <pre><strong>Input:</strong> ${ex.input}\n<strong>Output:</strong> ${ex.output}${explHtml ? '\n' + explHtml : ''}</pre>
        `;
        exContainer.appendChild(div);
      });

      // Render constraints
      const conList = document.getElementById('prob-constraints');
      conList.innerHTML = '';
      p.constraints.forEach(c => {
        const li = document.createElement('li');
        li.textContent = c;
        conList.appendChild(li);
      });

      // Clear execution results
      document.getElementById('results-empty-state').classList.remove('hidden');
      document.getElementById('results-success-state').classList.add('hidden');
      document.getElementById('results-error-state').classList.add('hidden');
      document.getElementById('results-running-state').classList.add('hidden');

      // Populate console Testcases inputs
      this.populateTestcaseInputs(p);

      // Submissions count badge
      const submissionsCount = State.submissions.filter(s => s.problemId === p.id).length;
      document.getElementById('submissions-count').textContent = submissionsCount;

      // Set active workspace tab back to Description
      document.getElementById('w-tab-description').click();

      // Show View
      this.showView('view-workspace');

      // Switch language dropdown and load code
      document.getElementById('editor-lang-select').value = State.activeLanguage;
      this.loadProblemCode();

      // Monitor Pyodide status if language is python
      this.updatePyodideStatusDisplay();
    },

    // Populate console inputs with parameter fields
    populateTestcaseInputs: function(problem) {
      const wrapper = document.getElementById('testcases-inputs-wrapper');
      wrapper.innerHTML = '';

      // Default inputs are from the first testcase
      const defaultCase = problem.testCases[0];
      
      problem.paramNames.forEach((paramName, idx) => {
        const val = defaultCase ? JSON.stringify(defaultCase.input[idx]) : '';
        const row = document.createElement('div');
        row.className = 'tc-param-row';
        row.innerHTML = `
          <label for="input-param-${paramName}">${paramName} =</label>
          <input type="text" id="input-param-${paramName}" class="custom-tc-input-field" data-index="${idx}" value='${val}'>
        `;
        wrapper.appendChild(row);
      });
    },

    // Load saved draft or starter code
    loadProblemCode: function() {
      if (!State.editor || !State.activeProblemId) return;

      const p = getActiveProblem();
      const key = `${State.activeProblemId}_${State.activeLanguage}`;
      const saved = State.draftCodes[key];

      if (saved) {
        State.editor.setValue(saved);
      } else {
        const starter = p.starterCode[State.activeLanguage];
        State.editor.setValue(starter);
      }

      // Update Monaco Language Model
      const model = State.editor.getModel();
      monaco.editor.setModelLanguage(model, State.activeLanguage);
    },

    updatePyodideStatusDisplay: function() {
      const badge = document.getElementById('pyodide-status');
      if (State.activeLanguage === 'python') {
        badge.classList.remove('hidden');
        window.CodeRunner.onPythonStatusChange((status) => {
          if (status === 'loading') {
            badge.innerHTML = '<span class="spinner-small"></span> Loading Python WebAssembly Engine...';
            badge.style.color = 'var(--medium)';
          } else if (status === 'ready') {
            badge.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;"></i> Python Engine Ready';
            badge.style.color = 'var(--easy)';
            if (window.lucide) window.lucide.createIcons();
          } else {
            badge.classList.add('hidden');
          }
        });
      } else {
        badge.classList.add('hidden');
      }
    },

    // Workspace event listeners for Language dropdown & Code runner
    setupExecutionButtons: function() {
      const self = this;
      
      // Language selector
      const langSelect = document.getElementById('editor-lang-select');
      langSelect.addEventListener('change', (e) => {
        State.activeLanguage = e.target.value;
        self.loadProblemCode();
        self.updatePyodideStatusDisplay();
      });

      // Reset code
      document.getElementById('btn-reset-code').addEventListener('click', () => {
        const p = getActiveProblem();
        if (!p) return;
        if (confirm("Are you sure you want to reset your code to the default starter template? This will erase your current code.")) {
          const key = `${State.activeProblemId}_${State.activeLanguage}`;
          delete State.draftCodes[key];
          localStorage.setItem('mini_leetcode_drafts', JSON.stringify(State.draftCodes));
          self.loadProblemCode();
        }
      });

      // Run Code
      document.getElementById('btn-run-code').addEventListener('click', () => {
        self.runExecution(false);
      });

      // Submit Code
      document.getElementById('btn-submit-code').addEventListener('click', () => {
        self.runExecution(true);
      });
    },

    // Run Code / Submit Code execution
    runExecution: async function(isSubmit = false) {
      if (!State.editor || !State.activeProblemId) return;

      const p = getActiveProblem();
      const code = State.editor.getValue();
      const lang = State.activeLanguage;

      // UI: Expand console and switch tab to results
      const consolePane = document.getElementById('console-pane');
      if (consolePane.classList.contains('collapsed')) {
        consolePane.classList.remove('collapsed');
        consolePane.classList.add('expanded');
        document.getElementById('console-arrow-icon').setAttribute('data-lucide', 'chevron-down');
        if (window.lucide) window.lucide.createIcons();
      }

      document.getElementById('c-tab-results').click();
      
      // Toggle states
      document.getElementById('results-empty-state').classList.add('hidden');
      document.getElementById('results-success-state').classList.add('hidden');
      document.getElementById('results-error-state').classList.add('hidden');
      
      const runningState = document.getElementById('results-running-state');
      runningState.classList.remove('hidden');
      document.getElementById('run-status-text').textContent = isSubmit ? "Running all test cases (Submit)..." : "Running test cases...";

      // Gather target test cases
      let casesToRun = [];
      
      if (isSubmit) {
        casesToRun = [...p.testCases, ...p.validationCases];
      } else {
        // Run code on user custom inputs from the Console inputs!
        const inputFields = document.querySelectorAll('.custom-tc-input-field');
        const customArgs = [];
        let parseError = false;
        
        inputFields.forEach(input => {
          try {
            customArgs.push(JSON.parse(input.value));
          } catch (err) {
            parseError = true;
            alert(`Error parsing input parameter value for "${input.id.replace('input-param-', '')}": Must be valid JSON!`);
          }
        });

        if (parseError) {
          runningState.classList.add('hidden');
          document.getElementById('results-empty-state').classList.remove('removed');
          return;
        }

        // Run on the user's custom testcase
        casesToRun = [
          { input: customArgs, expected: p.testCases[0] ? p.testCases[0].expected : null }
        ];
      }

      // Execute cases sequentially
      const results = [];
      let overallSuccess = true;
      let compilationError = null;

      for (let i = 0; i < casesToRun.length; i++) {
        const tc = casesToRun[i];
        
        // Show status progress
        document.getElementById('run-status-text').textContent = `Running test case ${i + 1}/${casesToRun.length}...`;

        const res = await window.CodeRunner.run(lang, code, p.functionName, tc.input);
        
        if (!res.success && !res.logs) {
          // Worker crashed or syntax error without code evaluation
          overallSuccess = false;
          compilationError = res.error;
          break;
        }

        const isCorrect = res.success && deepEqual(res.result, tc.expected);
        if (!isCorrect) overallSuccess = false;

        results.push({
          input: tc.input,
          expected: tc.expected,
          actual: res.result,
          success: res.success,
          error: res.error,
          logs: res.logs || [],
          runtime: res.runtime || "0.00",
          isCorrect: isCorrect
        });
      }

      runningState.classList.add('hidden');

      // Check for compilation/syntax execution errors
      if (compilationError) {
        document.getElementById('results-error-state').classList.remove('hidden');
        document.getElementById('results-error-details').textContent = compilationError;
        return;
      }

      // Otherwise, render successful executions detailed pane
      document.getElementById('results-success-state').classList.remove('hidden');

      // Populate Case Buttons Tabs
      const caseSelectorBar = document.getElementById('result-case-tabs');
      caseSelectorBar.innerHTML = '';

      results.forEach((res, idx) => {
        const btn = document.createElement('button');
        btn.className = `result-case-btn ${idx === 0 ? 'active' : ''}`;
        
        const dotColor = res.isCorrect ? 'pass' : 'fail';
        btn.innerHTML = `<span class="case-status-dot ${dotColor}"></span> Case ${idx + 1}`;
        
        btn.addEventListener('click', () => {
          document.querySelectorAll('.result-case-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.renderCaseResultDetails(res, p.paramNames);
        });

        caseSelectorBar.appendChild(btn);
      });

      // Display the first case detail by default
      if (results[0]) {
        this.renderCaseResultDetails(results[0], p.paramNames);
      }

      // If it is SUBMIT: save to submission history!
      if (isSubmit) {
        const status = overallSuccess ? 'Accepted' : (results.some(r => r.error && r.error.includes("Time Limit")) ? 'Time Limit Exceeded' : (results.some(r => r.error) ? 'Runtime Error' : 'Wrong Answer'));
        const avgRuntime = results.length > 0 ? (results.reduce((acc, curr) => acc + parseFloat(curr.runtime), 0) / results.length).toFixed(2) : "0.00";
        
        const subData = {
          id: 'sub_' + Date.now(),
          problemId: p.id,
          problemTitle: p.title,
          language: lang,
          status: status,
          runtime: avgRuntime + " ms",
          code: code,
          timestamp: new Date().toLocaleString()
        };

        State.submissions.unshift(subData); // add to top
        localStorage.setItem('mini_leetcode_submissions', JSON.stringify(State.submissions));

        // Increment stats on dashboard
        this.updateGlobalStats();

        // Increment submissions count on workspace tab header
        const submissionsCount = State.submissions.filter(s => s.problemId === p.id).length;
        document.getElementById('submissions-count').textContent = submissionsCount;

        // If overall success: celebrate!
        if (overallSuccess) {
          this.triggerConfetti();
          this.showSuccessModal(avgRuntime);
        }
      }
    },

    // Renders the details card for a specific executed testcase
    renderCaseResultDetails: function(res, paramNames) {
      const detailsContainer = document.getElementById('case-result-details');
      detailsContainer.innerHTML = '';

      // Create parameters row
      let inputsHtml = '';
      paramNames.forEach((name, idx) => {
        inputsHtml += `<div class="case-row">
          <span class="case-row-label">${name} =</span>
          <div class="case-row-val">${JSON.stringify(res.input[idx])}</div>
        </div>`;
      });

      // Output values and verification
      const expectedStr = JSON.stringify(res.expected);
      const actualStr = res.success ? JSON.stringify(res.actual) : `[Execution Error: ${res.error}]`;
      const valClass = res.isCorrect ? 'pass' : 'fail';
      
      let logsHtml = '';
      if (res.logs && res.logs.length > 0) {
        logsHtml = `
          <div class="case-row" style="margin-top: 6px;">
            <span class="case-row-label">Stdout logs:</span>
            <pre class="case-stdout-console">${res.logs.join('\n')}</pre>
          </div>
        `;
      }

      detailsContainer.innerHTML = `
        ${inputsHtml}
        <div class="case-row">
          <span class="case-row-label">Your Output:</span>
          <div class="case-row-val ${valClass}">${actualStr}</div>
        </div>
        <div class="case-row">
          <span class="case-row-label">Expected Output:</span>
          <div class="case-row-val">${expectedStr}</div>
        </div>
        ${logsHtml}
      `;
    },

    // Canvas Confetti Celebration
    triggerConfetti: function() {
      if (window.confetti) {
        // Run standard fireworks/congrats confetti burst
        const duration = 2.5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1100 };

        function randomInRange(min, max) {
          return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          // since particles fall down, animate a bit higher than random
          window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
          window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
      }
    },

    showSuccessModal: function(runtime) {
      document.getElementById('modal-runtime').textContent = `${runtime} ms`;
      const modal = document.getElementById('success-modal');
      modal.classList.remove('hidden');
    },

    // Renders submissions log list inside problem Workspace Pane
    renderProblemSubmissions: function() {
      const container = document.getElementById('submissions-list-container');
      container.innerHTML = '';

      const filtered = State.submissions.filter(s => s.problemId === State.activeProblemId);

      if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9em; padding: 20px 0;">No submissions yet. Write code and hit "Submit"!</p>`;
        return;
      }

      filtered.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'submission-item';
        
        let statusColorClass = 'text-hard';
        if (sub.status === 'Accepted') statusColorClass = 'text-easy';
        else if (sub.status === 'Time Limit Exceeded') statusColorClass = 'text-medium';

        div.innerHTML = `
          <div class="sub-meta-left">
            <div class="sub-status-line">
              <span class="sub-status-txt ${statusColorClass}">${sub.status}</span>
              <span class="sub-time">${sub.timestamp}</span>
            </div>
            <span class="sub-details-txt">Language: ${sub.language} | Runtime: ${sub.runtime}</span>
          </div>
          <button class="btn btn-secondary btn-sm btn-restore-code" data-sub-id="${sub.id}">Restore Code</button>
        `;

        // Restore code button click
        div.querySelector('.btn-restore-code').addEventListener('click', () => {
          if (confirm("Do you want to restore this code into your editor? Your current code draft will be replaced.")) {
            State.editor.setValue(sub.code);
            // also switch editor language if needed
            if (State.activeLanguage !== sub.language) {
              State.activeLanguage = sub.language;
              document.getElementById('editor-lang-select').value = sub.language;
              const model = State.editor.getModel();
              monaco.editor.setModelLanguage(model, sub.language);
              this.updatePyodideStatusDisplay();
            }
            // notification alert
            alert("Code draft successfully restored into editor!");
          }
        });

        container.appendChild(div);
      });
    },

    // Problem Creator form setup
    setupCreatorForm: function() {
      const form = document.getElementById('problem-creator-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('c-title').value;
        const difficulty = document.getElementById('c-difficulty').value;
        const category = document.getElementById('c-category').value;
        const description = document.getElementById('c-description').value.replace(/\n/g, '<br>');
        const functionName = document.getElementById('c-functionName').value;
        const paramNamesStr = document.getElementById('c-paramNames').value;
        const jsTemplate = document.getElementById('c-jsTemplate').value;
        const pyTemplate = document.getElementById('c-pyTemplate').value;

        // Parse params
        const paramNames = paramNamesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

        // Gather test cases
        const tcInputs = document.querySelectorAll('.c-tc-input');
        const tcExpecteds = document.querySelectorAll('.c-tc-expected');
        
        const testCases = [];
        let parseError = false;

        tcInputs.forEach((inputEl, idx) => {
          const expectedEl = tcExpecteds[idx];
          try {
            const inputVal = JSON.parse(inputEl.value);
            const expectedVal = JSON.parse(expectedEl.value);

            if (!Array.isArray(inputVal)) {
              alert(`Error: Arguments List in row ${idx + 1} must be formatted as a JSON array e.g., [2, [3, 4]] where each item corresponds to the argument parameter!`);
              parseError = true;
              return;
            }

            testCases.push({
              input: inputVal,
              expected: expectedVal
            });
          } catch (err) {
            alert(`Error parsing Test Case JSON values in row ${idx + 1}. Check format!`);
            parseError = true;
          }
        });

        if (parseError) return;

        // Construct custom problem object
        const slugId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        // Ensure ID is unique
        const existing = State.problems.find(p => p.id === slugId);
        const finalId = existing ? slugId + '_' + Date.now() : slugId;

        const newProblem = {
          id: finalId,
          title: title,
          difficulty: difficulty,
          category: category,
          description: description,
          constraints: ["Time complexity limit of O(N)", "Memory limit of 256MB"],
          examples: [
            {
              input: testCases[0] ? paramNames.map((name, i) => `${name} = ${JSON.stringify(testCases[0].input[i])}`).join(', ') : '',
              output: testCases[0] ? JSON.stringify(testCases[0].expected) : ''
            }
          ],
          starterCode: {
            javascript: jsTemplate,
            python: pyTemplate
          },
          functionName: functionName,
          paramNames: paramNames,
          testCases: testCases, // Public
          validationCases: []   // No hidden validation cases needed for custom local problems (runs on same public cases on Submit)
        };

        // Save
        State.customProblems.push(newProblem);
        localStorage.setItem('mini_leetcode_custom_problems', JSON.stringify(State.customProblems));

        // Re-merge
        State.problems = [...window.defaultProblems, ...State.customProblems];

        // Reset and redirect
        form.reset();
        alert("Problem successfully created and added to database!");
        this.showView('view-dashboard');
      });
    },

    // Renders Stats & Submissions Logs in Analytics View
    renderAnalytics: function() {
      // Total statistics
      const solvedIds = [...new Set(State.submissions.filter(s => s.status === 'Accepted').map(s => s.problemId))];
      const solvedEasy = State.problems.filter(p => p.difficulty === 'Easy' && solvedIds.includes(p.id)).length;
      const solvedMed = State.problems.filter(p => p.difficulty === 'Medium' && solvedIds.includes(p.id)).length;
      const solvedHard = State.problems.filter(p => p.difficulty === 'Hard' && solvedIds.includes(p.id)).length;
      const solvedAll = solvedIds.length;

      document.getElementById('an-total-solved').textContent = solvedAll;
      document.getElementById('an-easy-solved').textContent = solvedEasy;
      document.getElementById('an-med-solved').textContent = solvedMed;
      document.getElementById('an-hard-solved').textContent = solvedHard;

      // Accepted submissions ratio
      const totalSubsCount = State.submissions.length;
      const acceptedSubsCount = State.submissions.filter(s => s.status === 'Accepted').length;
      const ratioPct = totalSubsCount > 0 ? Math.round((acceptedSubsCount / totalSubsCount) * 100) : 0;

      document.getElementById('an-ratio-percentage').textContent = `${ratioPct}%`;
      document.getElementById('an-ratio-fraction').textContent = `${acceptedSubsCount}/${totalSubsCount} Submissions Accepted`;
      document.getElementById('an-ratio-fill').style.width = `${ratioPct}%`;

      // Submission Log table entries
      const tableBody = document.getElementById('analytics-submissions-list');
      tableBody.innerHTML = '';

      if (totalSubsCount === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No submissions history found.</td></tr>`;
        return;
      }

      State.submissions.forEach(sub => {
        const tr = document.createElement('tr');
        
        let statusColorClass = 'text-hard';
        if (sub.status === 'Accepted') statusColorClass = 'text-easy';
        else if (sub.status === 'Time Limit Exceeded') statusColorClass = 'text-medium';

        tr.innerHTML = `
          <td>${sub.timestamp}</td>
          <td><span class="problem-title-link" data-id="${sub.problemId}">${sub.problemTitle}</span></td>
          <td><span class="category-badge">${sub.language}</span></td>
          <td><span class="sub-status-txt ${statusColorClass}" style="font-weight:600;">${sub.status}</span></td>
          <td>${sub.runtime}</td>
          <td><button class="btn btn-secondary btn-sm btn-view-code" data-sub-id="${sub.id}">View Code</button></td>
        `;

        // Bind clicks
        tr.querySelector('.problem-title-link').addEventListener('click', () => this.loadProblem(sub.problemId));
        tr.querySelector('.btn-view-code').addEventListener('click', () => {
          // Open Modal/Alert or restore code
          alert(`Code for ${sub.problemTitle} (${sub.language}):\n\n${sub.code}`);
        });

        tableBody.appendChild(tr);
      });

      if (window.lucide) window.lucide.createIcons();
    }
  };

  // Run initializations on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    window.LeetApp.init();
  });

})();
