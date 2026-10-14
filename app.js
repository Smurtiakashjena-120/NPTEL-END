'use strict';

(() => {
  const QUESTION_BANK_PATH = './psychology_learning_quiz_bank.json';
  const ALLOWED_TYPES = new Set(['single_choice', 'multiple_select']);

  const $ = (id) => document.getElementById(id);
  const dom = {
    statusBanner: $('statusBanner'),
    statusMessage: $('statusMessage'),
    setupPanel: $('setupPanel'),
    setupMessage: $('setupMessage'),
    dataInfo: $('dataInfo'),
    modeSelect: $('modeSelect'),
    modeDescription: $('modeDescription'),
    yearField: $('yearField'),
    yearSelect: $('yearSelect'),
    weekField: $('weekField'),
    weekSelect: $('weekSelect'),
    shuffleQuestions: $('shuffleQuestions'),
    shuffleOptions: $('shuffleOptions'),
    excludeFlagged: $('excludeFlagged'),
    startButton: $('startButton'),
    diagnosticsDetails: $('diagnosticsDetails'),
    diagnosticsSummary: $('diagnosticsSummary'),
    diagnosticsList: $('diagnosticsList'),
    quizPanel: $('quizPanel'),
    sessionModeLabel: $('sessionModeLabel'),
    sessionTitle: $('sessionTitle'),
    sessionSubline: $('sessionSubline'),
    changeSetupButton: $('changeSetupButton'),
    weeklyResultSummary: $('weeklyResultSummary'),
    weeklyArea: $('weeklyArea'),
    weeklyQuestionList: $('weeklyQuestionList'),
    submitWeeklyButton: $('submitWeeklyButton'),
    unansweredHint: $('unansweredHint'),
    weeklyPostActions: $('weeklyPostActions'),
    retryWeeklyButton: $('retryWeeklyButton'),
    chooseAnotherWeekButton: $('chooseAnotherWeekButton'),
    reviewWeeklyButton: $('reviewWeeklyButton'),
    instantArea: $('instantArea'),
    instantProgressText: $('instantProgressText'),
    instantProgressPercent: $('instantProgressPercent'),
    instantProgressBar: $('instantProgressBar'),
    instantProgressFill: $('instantProgressFill'),
    instantLiveStats: $('instantLiveStats'),
    instantQuestion: $('instantQuestion'),
    previousQuestionButton: $('previousQuestionButton'),
    nextQuestionButton: $('nextQuestionButton'),
    finishPracticeButton: $('finishPracticeButton'),
    resultsPanel: $('resultsPanel'),
    resultsHeading: $('resultsHeading'),
    resultsContext: $('resultsContext'),
    finalSummary: $('finalSummary'),
    reviewAllButton: $('reviewAllButton'),
    retrySessionButton: $('retrySessionButton'),
    returnSetupButton: $('returnSetupButton'),
    reviewList: $('reviewList'),
  };

  const state = {
    bank: [],
    years: [],
    diagnostics: [],
    session: null,
    lastConfig: null,
    loaded: false,
  };

  function makeElement(tag, className = '', text = undefined) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function setStatus(message, kind = 'loading') {
    dom.statusBanner.className = `status-banner status-${kind}`;
    const symbol = dom.statusBanner.querySelector('.status-symbol');
    symbol.textContent = kind === 'success' ? '✓' : kind === 'error' ? '!' : '…';
    dom.statusMessage.textContent = message;
  }

  function setSetupMessage(message = '') {
    dom.setupMessage.textContent = message;
    dom.setupMessage.classList.toggle('hidden', !message);
  }

  function formatIssue(issue) {
    return issue && typeof issue === 'object' ? JSON.stringify(issue) : String(issue);
  }

  function questionIssues(question, index) {
    const issues = [];
    const location = `record ${index + 1}${question && typeof question.id === 'string' ? ` (${question.id})` : ''}`;
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      return [`${location}: expected a question object.`];
    }
    if (typeof question.id !== 'string' || !question.id.trim()) issues.push(`${location}: missing a non-empty string id.`);
    if (typeof question.question !== 'string' || !question.question.trim()) issues.push(`${location}: missing question text.`);
    if (!Array.isArray(question.options) || question.options.length < 2) {
      issues.push(`${location}: options must contain at least two choices.`);
    } else {
      const optionIds = new Set();
      question.options.forEach((option, optionIndex) => {
        if (!option || typeof option !== 'object' || Array.isArray(option)) {
          issues.push(`${location}: option ${optionIndex + 1} is not an object.`);
          return;
        }
        if (typeof option.id !== 'string' || !option.id.trim()) {
          issues.push(`${location}: option ${optionIndex + 1} has no valid id.`);
        } else if (optionIds.has(option.id)) {
          issues.push(`${location}: duplicate option id "${option.id}".`);
        } else {
          optionIds.add(option.id);
        }
        if (typeof option.text !== 'string' || !option.text.trim()) {
          issues.push(`${location}: option ${optionIndex + 1} has no option text.`);
        }
      });
      if (Array.isArray(question.answer)) {
        const optionIdsForAnswer = new Set(question.options.filter(Boolean).map((option) => option.id));
        const seenAnswers = new Set();
        question.answer.forEach((answerId) => {
          if (typeof answerId !== 'string' || !optionIdsForAnswer.has(answerId)) {
            issues.push(`${location}: answer contains an option id that does not exist (${formatIssue(answerId)}).`);
          }
          if (seenAnswers.has(answerId)) issues.push(`${location}: answer contains duplicate option id "${answerId}".`);
          seenAnswers.add(answerId);
        });
      }
    }
    if (!Array.isArray(question.answer) || question.answer.length === 0) {
      issues.push(`${location}: answer must be a non-empty array of option ids.`);
    }
    if (!ALLOWED_TYPES.has(question.type)) {
      issues.push(`${location}: unsupported question type "${formatIssue(question.type)}".`);
    } else if (question.type === 'single_choice' && Array.isArray(question.answer) && question.answer.length !== 1) {
      issues.push(`${location}: single_choice questions must have exactly one correct option id.`);
    }
    if (!Number.isInteger(question.year)) issues.push(`${location}: year must be an integer.`);
    if (!Number.isInteger(question.week) || question.week < 0) issues.push(`${location}: week must be a non-negative integer (Week 0 is valid).`);
    if (Array.isArray(question.options) && Array.isArray(question.answer)) {
      const ids = new Set(question.options.filter((option) => option && typeof option.id === 'string').map((option) => option.id));
      if (question.answer.some((answerId) => !ids.has(answerId))) {
        // The specific invalid IDs are reported above; this keeps validation intent explicit.
      }
    }
    return issues;
  }

  function cloneQuestion(question) {
    return {
      ...question,
      options: question.options.map((option) => ({ ...option })),
      answer: [...question.answer],
      qualityFlags: Array.isArray(question.qualityFlags) ? [...question.qualityFlags] : [],
    };
  }

  function validateBank(parsed) {
    if (!Array.isArray(parsed)) throw new Error('The JSON root must be an array of question records.');
    if (parsed.length === 0) throw new Error('The question bank is an empty array.');

    const accepted = [];
    const usedIds = new Set();
    const issues = [];
    parsed.forEach((question, index) => {
      const recordIssues = questionIssues(question, index);
      if (recordIssues.length === 0 && usedIds.has(question.id)) {
        recordIssues.push(`record ${index + 1} (${question.id}): duplicate question id; this duplicate record was skipped.`);
      }
      if (recordIssues.length > 0) {
        issues.push(...recordIssues);
        return;
      }
      usedIds.add(question.id);
      accepted.push(cloneQuestion(question));
    });
    if (accepted.length === 0) throw new Error(`No valid question records were found. ${issues.slice(0, 4).join(' ')}`);
    return { accepted, issues, totalRecords: parsed.length };
  }

  async function loadBank() {
    try {
      const response = await fetch(QUESTION_BANK_PATH, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`The browser returned HTTP ${response.status} for ${QUESTION_BANK_PATH}.`);
      }
      let parsed;
      try {
        parsed = await response.json();
      } catch (error) {
        throw new Error(`The question bank is not valid JSON. ${error instanceof Error ? error.message : ''}`.trim());
      }

      const validated = validateBank(parsed);
      state.bank = validated.accepted;
      state.diagnostics = validated.issues;
      state.years = [...new Set(state.bank.map((question) => question.year))].sort((a, b) => a - b);
      state.loaded = true;
      setupSelectors();
      renderDataDiagnostics(validated.totalRecords);
      enableSetupControls(true);
      const flagged = state.bank.filter(hasQualityFlags).length;
      const skipped = validated.totalRecords - state.bank.length;
      dom.dataInfo.textContent = `${state.bank.length} questions · ${state.years.length} years · ${flagged} flagged`;
      setStatus(`Question bank ready: ${state.bank.length} valid questions loaded${skipped ? `; ${skipped} record${skipped === 1 ? '' : 's'} skipped after validation` : ''}.`, 'success');
    } catch (error) {
      state.loaded = false;
      enableSetupControls(false);
      dom.dataInfo.textContent = 'Question bank not loaded';
      setStatus('Could not load the question bank. Check the file location and run this site through a local static server.', 'error');
      setSetupMessage('The quiz could not start because its JSON data is unavailable or invalid. Check that psychology_learning_quiz_bank.json is beside index.html, then follow the local-server instructions in README.md.');
      dom.diagnosticsDetails.classList.remove('hidden');
      dom.diagnosticsSummary.textContent = 'Loading diagnostic details';
      dom.diagnosticsList.replaceChildren();
      const item = makeElement('li', '', error instanceof Error ? error.message : String(error));
      dom.diagnosticsList.append(item);
    }
  }

  function enableSetupControls(enabled) {
    [dom.modeSelect, dom.yearSelect, dom.weekSelect, dom.shuffleQuestions, dom.shuffleOptions, dom.excludeFlagged].forEach((control) => {
      control.disabled = !enabled;
    });
    dom.startButton.disabled = !enabled;
  }

  function setupSelectors() {
    dom.yearSelect.replaceChildren();
    state.years.forEach((year) => dom.yearSelect.append(new Option(String(year), String(year))));
    if (!state.years.includes(2026)) dom.yearSelect.selectedIndex = 0;
    else dom.yearSelect.value = '2026';
    updateWeekOptions();
    updateModeControls();
  }

  function updateWeekOptions() {
    const year = Number(dom.yearSelect.value);
    const weeks = [...new Set(state.bank.filter((question) => question.year === year).map((question) => question.week))].sort((a, b) => a - b);
    const previousValue = dom.weekSelect.value;
    dom.weekSelect.replaceChildren();
    weeks.forEach((week) => dom.weekSelect.append(new Option(`Week ${week}`, String(week))));
    if (weeks.includes(Number(previousValue))) dom.weekSelect.value = previousValue;
    else if (weeks.length) dom.weekSelect.value = String(weeks[0]);
    dom.weekSelect.disabled = !state.loaded || weeks.length === 0 || dom.modeSelect.value !== 'weekly';
    return weeks;
  }

  function updateModeControls() {
    const mode = dom.modeSelect.value;
    dom.weekField.classList.toggle('hidden', mode !== 'weekly');
    dom.yearField.classList.toggle('hidden', mode === 'all');
    dom.yearSelect.disabled = !state.loaded || mode === 'all';
    dom.weekSelect.disabled = !state.loaded || mode !== 'weekly' || dom.weekSelect.options.length === 0;
    const descriptions = {
      weekly: 'Answer the whole week first. Correct answers and feedback appear only after you submit.',
      year: 'Move through every available question from the selected year and get feedback as you answer.',
      all: 'Mix questions from every year in the bank into one practice session with instant feedback.',
    };
    dom.modeDescription.textContent = descriptions[mode] || descriptions.weekly;
    setSetupMessage('');
  }

  function renderDataDiagnostics(totalRecords) {
    if (state.diagnostics.length === 0) {
      dom.diagnosticsDetails.classList.add('hidden');
      return;
    }
    dom.diagnosticsDetails.classList.remove('hidden');
    dom.diagnosticsSummary.textContent = `${totalRecords - state.bank.length} record(s) skipped · ${state.diagnostics.length} validation note(s)`;
    dom.diagnosticsList.replaceChildren();
    state.diagnostics.slice(0, 30).forEach((issue) => dom.diagnosticsList.append(makeElement('li', '', issue)));
    if (state.diagnostics.length > 30) {
      dom.diagnosticsList.append(makeElement('li', '', `…and ${state.diagnostics.length - 30} additional diagnostic note(s).`));
    }
  }

  function hasQualityFlags(question) {
    return Array.isArray(question.qualityFlags) && question.qualityFlags.length > 0;
  }

  function shuffleCopy(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function setsEqual(left, right) {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return new Set(left).size === left.length && left.every((item) => rightSet.has(item));
  }

  function isCorrect(question, selectedIds) {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) return false;
    return setsEqual(selectedIds, question.answer);
  }

  function displayedAnswerText(question) {
    if (typeof question.answerText === 'string' && question.answerText.trim()) return question.answerText.trim();
    const correctOptions = question.options.filter((option) => question.answer.includes(option.id));
    return correctOptions.map((option) => option.text).join('; ') || 'Answer text is unavailable in the source record.';
  }

  function correctOptionText(question) {
    const correctOptions = question.options.filter((option) => question.answer.includes(option.id));
    return correctOptions.map((option) => option.text).join('; ') || displayedAnswerText(question);
  }

  function selectedOptionText(question, selectedIds) {
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) return 'Not answered';
    return question.options.filter((option) => selectedIds.includes(option.id)).map((option) => option.text).join('; ') || 'Selection is unavailable';
  }

  function appendSourceReview(card, question) {
    if (!hasQualityFlags(question)) return;
    const details = makeElement('details', 'source-review');
    const summary = makeElement('summary');
    summary.append(makeElement('span', 'source-badge', 'Review Source'));
    summary.append(document.createTextNode(' View source notes'));
    details.append(summary);
    const source = question.sourceFile ? `Source: ${question.sourceFile}` : 'Source file not recorded.';
    const page = Number.isInteger(question.sourcePage) ? ` · PDF page ${question.sourcePage}` : '';
    details.append(makeElement('p', '', `${source}${page}`));
    const list = makeElement('ul');
    question.qualityFlags.forEach((flag) => list.append(makeElement('li', '', formatIssue(flag))));
    details.append(list);
    card.append(details);
  }

  function createQuestionCard(question, index, total, options = {}) {
    const card = makeElement('article', 'question-card');
    card.dataset.questionId = question.id;
    const topline = makeElement('div', 'question-topline');
    topline.append(makeElement('span', 'question-number', `Question ${index + 1} of ${total}`));
    topline.append(makeElement('span', 'question-meta', `Year ${question.year} · Week ${question.week} · Source Q${Number.isInteger(question.questionNumber) ? question.questionNumber : '?'}`));
    card.append(topline);
    card.append(makeElement('h3', 'question-text', question.question));

    const optionList = makeElement('div', 'options-list');
    const selection = options.selectedIds || [];
    const disabled = Boolean(options.disabled);
    const name = `${options.namePrefix || 'question'}-${index}`;
    question.options.forEach((option, optionIndex) => {
      const label = makeElement('label', 'option-label');
      const input = makeElement('input');
      input.type = question.type === 'multiple_select' ? 'checkbox' : 'radio';
      input.name = name;
      input.value = option.id;
      input.dataset.questionId = question.id;
      input.dataset.optionId = option.id;
      input.checked = selection.includes(option.id);
      input.disabled = disabled;
      const letter = makeElement('span', 'option-letter', positionLetter(optionIndex));
      const text = makeElement('span', 'option-text', option.text);
      label.append(input, letter, text);
      optionList.append(label);
    });
    card.append(optionList);
    appendSourceReview(card, question);
    return card;
  }

  function positionLetter(index) {
    let number = index;
    let result = '';
    do {
      result = String.fromCharCode(65 + (number % 26)) + result;
      number = Math.floor(number / 26) - 1;
    } while (number >= 0);
    return result;
  }

  function appendFeedback(card, question, selectedIds, correct) {
    const feedback = makeElement('div', `answer-feedback ${selectedIds.length === 0 ? 'is-unanswered' : correct ? 'is-correct' : 'is-incorrect'}`);
    const statusText = selectedIds.length === 0 ? 'Unanswered' : correct ? 'Correct' : 'Incorrect';
    feedback.append(makeElement('span', 'feedback-status', `Status: ${statusText}`));
    if (selectedIds.length > 0) {
      feedback.append(makeElement('p', '', `Your answer: ${selectedOptionText(question, selectedIds)}`));
    }
    feedback.append(makeElement('p', '', `Correct answer: ${displayedAnswerText(question)}`));
    const canonical = correctOptionText(question);
    if (canonical && canonical !== displayedAnswerText(question)) {
      feedback.append(makeElement('p', '', `Correct option text: ${canonical}`));
    }
    card.append(feedback);
  }

  function calculateStats(questions, answerMap, isWeekly = false) {
    let answered = 0;
    let correct = 0;
    questions.forEach((question) => {
      const entry = answerMap.get(question.id);
      const selectedIds = isWeekly ? (Array.isArray(entry) ? entry : []) : (entry && entry.evaluated ? entry.selectedIds : []);
      if (selectedIds.length > 0 && (!isWeekly || selectedIds.length > 0)) {
        if (isWeekly || (entry && entry.evaluated)) {
          answered += 1;
          if (isCorrect(question, selectedIds)) correct += 1;
        }
      }
    });
    const total = questions.length;
    const incorrect = answered - correct;
    const unanswered = total - answered;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, answered, correct, incorrect, unanswered, percentage };
  }

  function summaryMetric(value, label) {
    const metric = makeElement('div', 'summary-metric');
    metric.append(makeElement('strong', 'summary-value', value));
    metric.append(makeElement('span', 'summary-label', label));
    return metric;
  }

  function renderSummary(target, stats) {
    target.replaceChildren();
    target.append(
      summaryMetric(stats.total, 'Total questions'),
      summaryMetric(stats.answered, 'Attempted'),
      summaryMetric(stats.correct, 'Correct'),
      summaryMetric(stats.incorrect, 'Incorrect'),
      summaryMetric(stats.unanswered, 'Unanswered'),
      summaryMetric(`${stats.percentage}%`, 'Score'),
    );
    target.classList.remove('hidden');
  }

  function getSessionPool(mode) {
    let pool;
    if (mode === 'weekly') {
      const year = Number(dom.yearSelect.value);
      const week = Number(dom.weekSelect.value);
      pool = state.bank.filter((question) => question.year === year && question.week === week);
    } else if (mode === 'year') {
      const year = Number(dom.yearSelect.value);
      pool = state.bank.filter((question) => question.year === year);
    } else {
      pool = [...state.bank];
    }
    if (dom.excludeFlagged.checked) pool = pool.filter((question) => !hasQualityFlags(question));
    return pool.map(cloneQuestion);
  }

  function buildConfigFromSetup() {
    const mode = dom.modeSelect.value;
    return {
      mode,
      year: mode === 'all' ? null : Number(dom.yearSelect.value),
      week: mode === 'weekly' ? Number(dom.weekSelect.value) : null,
      shuffleQuestions: dom.shuffleQuestions.checked,
      shuffleOptions: dom.shuffleOptions.checked,
      excludeFlagged: dom.excludeFlagged.checked,
      pool: getSessionPool(mode),
    };
  }

  function startFromSetup() {
    if (!state.loaded) return;
    const config = buildConfigFromSetup();
    if (!config.pool.length) {
      const focusLabel = config.mode === 'weekly' ? `Week ${config.week} of ${config.year}` : config.mode === 'year' ? `year ${config.year}` : 'the selected pool';
      setSetupMessage(`No questions are available for ${focusLabel}${config.excludeFlagged ? ' after excluding flagged records' : ''}. Choose another year/week or turn off the exclusion setting.`);
      return;
    }
    setSetupMessage('');
    startSession(config);
  }

  function startSession(config) {
    const pool = (config.pool || []).map(cloneQuestion);
    let questions = pool.map((question) => ({
      ...question,
      options: config.shuffleOptions ? shuffleCopy(question.options) : [...question.options],
    }));
    if (config.shuffleQuestions) questions = shuffleCopy(questions);
    state.lastConfig = {
      ...config,
      pool: pool.map(cloneQuestion),
    };
    state.session = {
      ...config,
      pool: pool.map(cloneQuestion),
      questions,
      answers: new Map(),
      selections: new Map(),
      currentIndex: 0,
      submitted: false,
      finished: false,
      stats: null,
    };
    dom.setupPanel.classList.add('hidden');
    dom.resultsPanel.classList.add('hidden');
    dom.quizPanel.classList.remove('hidden');
    dom.weeklyResultSummary.classList.add('hidden');
    dom.weeklyPostActions.classList.add('hidden');
    dom.submitWeeklyButton.classList.remove('hidden');
    dom.reviewList.classList.add('hidden');
    dom.reviewList.replaceChildren();
    dom.weeklyQuestionList.replaceChildren();

    const current = state.session;
    const title = current.mode === 'weekly' ? `Week ${current.week} · ${current.year}` : current.mode === 'year' ? `${current.year} Practice` : 'All Years Mixed Practice';
    dom.sessionTitle.textContent = title;
    dom.sessionModeLabel.textContent = current.mode === 'weekly' ? 'WEEKLY TEST' : 'INSTANT PRACTICE';
    const countText = `${current.questions.length} question${current.questions.length === 1 ? '' : 's'}`;
    const sourceText = current.excludeFlagged ? 'Flagged source records excluded' : 'All valid records included';
    dom.sessionSubline.textContent = `${countText} · ${sourceText}`;
    dom.weeklyArea.classList.toggle('hidden', current.mode !== 'weekly');
    dom.instantArea.classList.toggle('hidden', current.mode === 'weekly');

    if (current.mode === 'weekly') {
      renderWeeklyQuestions();
      dom.unansweredHint.textContent = `This test has ${current.questions.length} question${current.questions.length === 1 ? '' : 's'}. You can submit with unanswered questions; they will be counted separately.`;
    } else {
      renderInstantQuestion();
      renderInstantStats();
    }
    dom.quizPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderWeeklyQuestions() {
    const session = state.session;
    dom.weeklyQuestionList.replaceChildren();
    session.questions.forEach((question, index) => {
      const selectedIds = session.selections.get(question.id) || [];
      const card = createQuestionCard(question, index, session.questions.length, {
        namePrefix: 'weekly',
        selectedIds,
        disabled: session.submitted,
      });
      if (session.submitted) appendFeedback(card, question, selectedIds, isCorrect(question, selectedIds));
      dom.weeklyQuestionList.append(card);
    });
    if (session.submitted) {
      dom.submitWeeklyButton.classList.add('hidden');
      dom.weeklyPostActions.classList.remove('hidden');
      renderSummary(dom.weeklyResultSummary, session.stats);
    }
  }

  function submitWeeklyTest() {
    const session = state.session;
    if (!session || session.mode !== 'weekly' || session.submitted) return;
    const unanswered = session.questions.filter((question) => !(session.selections.get(question.id) || []).length).length;
    if (unanswered > 0) {
      const message = `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered. Submit anyway? Unanswered questions will be included in the results.`;
      if (!window.confirm(message)) return;
    }
    session.submitted = true;
    session.stats = calculateStats(session.questions, session.selections, true);
    renderWeeklyQuestions();
    dom.weeklyResultSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function currentInstantQuestion() {
    if (!state.session || state.session.mode === 'weekly') return null;
    return state.session.questions[state.session.currentIndex] || null;
  }

  function ensureInstantEntry(question) {
    const session = state.session;
    if (!session.answers.has(question.id)) session.answers.set(question.id, { selectedIds: [], evaluated: false, correct: false });
    return session.answers.get(question.id);
  }

  function renderInstantQuestion(focusOptionId = null) {
    const session = state.session;
    if (!session || session.mode === 'weekly' || session.questions.length === 0) return;
    const question = currentInstantQuestion();
    const index = session.currentIndex;
    const entry = ensureInstantEntry(question);
    dom.instantQuestion.replaceChildren();
    const card = createQuestionCard(question, index, session.questions.length, {
      namePrefix: 'instant',
      selectedIds: entry.selectedIds,
      disabled: entry.evaluated,
    });

    if (question.type === 'multiple_select' && !entry.evaluated) {
      const actions = makeElement('div', 'multiple-select-actions');
      actions.append(makeElement('p', '', 'Select every correct option, then check your answer.'));
      const checkButton = makeElement('button', 'button button-primary', 'Check Answer');
      checkButton.type = 'button';
      checkButton.dataset.action = 'check-multiple';
      checkButton.disabled = entry.selectedIds.length === 0;
      actions.append(checkButton);
      card.append(actions);
    }
    if (entry.evaluated) appendFeedback(card, question, entry.selectedIds, entry.correct);
    dom.instantQuestion.append(card);

    const progress = Math.round(((index + 1) / session.questions.length) * 100);
    dom.instantProgressText.textContent = `Question ${index + 1} of ${session.questions.length}`;
    dom.instantProgressPercent.textContent = `${progress}%`;
    dom.instantProgressFill.style.width = `${progress}%`;
    dom.instantProgressBar.setAttribute('aria-valuenow', String(progress));
    dom.previousQuestionButton.disabled = index === 0;
    dom.nextQuestionButton.disabled = index >= session.questions.length - 1;
    renderInstantStats();
    if (focusOptionId) {
      const input = [...dom.instantQuestion.querySelectorAll('input[data-option-id]')].find((item) => item.dataset.optionId === focusOptionId);
      if (input) input.focus({ preventScroll: true });
    }
  }

  function renderInstantStats() {
    const session = state.session;
    if (!session || session.mode === 'weekly') return;
    const stats = calculateStats(session.questions, session.answers, false);
    dom.instantLiveStats.replaceChildren();
    dom.instantLiveStats.append(
      statChip('Answered', stats.answered),
      statChip('Correct', stats.correct),
      statChip('Incorrect', stats.incorrect),
    );
  }

  function statChip(label, value) {
    const chip = makeElement('span', 'stat-chip');
    chip.append(document.createTextNode(`${label} `), makeElement('strong', '', value));
    return chip;
  }

  function handleWeeklyChange(event) {
    const session = state.session;
    if (!session || session.mode !== 'weekly' || session.submitted) return;
    const input = event.target.closest('input[data-question-id][data-option-id]');
    if (!input) return;
    const question = session.questions.find((item) => item.id === input.dataset.questionId);
    if (!question) return;
    const card = input.closest('.question-card');
    const selectedIds = [...card.querySelectorAll('input[data-option-id]:checked')].map((item) => item.dataset.optionId);
    session.selections.set(question.id, selectedIds);
  }

  function handleInstantChange(event) {
    const session = state.session;
    if (!session || session.mode === 'weekly' || session.finished) return;
    const input = event.target.closest('input[data-question-id][data-option-id]');
    if (!input) return;
    const question = currentInstantQuestion();
    if (!question || question.id !== input.dataset.questionId) return;
    const entry = ensureInstantEntry(question);
    if (entry.evaluated) return;

    if (question.type === 'single_choice') {
      entry.selectedIds = [input.dataset.optionId];
      entry.evaluated = true;
      entry.correct = isCorrect(question, entry.selectedIds);
      renderInstantQuestion(input.dataset.optionId);
      return;
    }

    entry.selectedIds = [...dom.instantQuestion.querySelectorAll('input[data-option-id]:checked')].map((item) => item.dataset.optionId);
    const checkButton = dom.instantQuestion.querySelector('[data-action="check-multiple"]');
    if (checkButton) checkButton.disabled = entry.selectedIds.length === 0;
  }

  function checkMultipleAnswer() {
    const session = state.session;
    if (!session || session.mode === 'weekly' || session.finished) return;
    const question = currentInstantQuestion();
    if (!question || question.type !== 'multiple_select') return;
    const entry = ensureInstantEntry(question);
    if (entry.evaluated || entry.selectedIds.length === 0) return;
    entry.evaluated = true;
    entry.correct = isCorrect(question, entry.selectedIds);
    renderInstantQuestion();
  }

  function moveInstantQuestion(offset) {
    const session = state.session;
    if (!session || session.mode === 'weekly' || session.finished) return;
    const nextIndex = session.currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= session.questions.length) return;
    session.currentIndex = nextIndex;
    renderInstantQuestion();
    dom.instantQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function finishPractice() {
    const session = state.session;
    if (!session || session.mode === 'weekly') return;
    session.finished = true;
    session.stats = calculateStats(session.questions, session.answers, false);
    dom.quizPanel.classList.add('hidden');
    dom.resultsPanel.classList.remove('hidden');
    dom.resultsHeading.textContent = 'Your practice results';
    dom.resultsContext.textContent = `${session.questions.length} questions · ${session.mode === 'year' ? `Year ${session.year}` : 'All available years'} · Feedback was provided as you answered.`;
    renderSummary(dom.finalSummary, session.stats);
    dom.reviewList.replaceChildren();
    dom.reviewList.classList.add('hidden');
    dom.reviewAllButton.textContent = 'Review All Answers';
    dom.resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderReviewList() {
    const session = state.session;
    dom.reviewList.replaceChildren();
    session.questions.forEach((question, index) => {
      const entry = session.mode === 'weekly'
        ? { selectedIds: session.selections.get(question.id) || [], evaluated: session.submitted }
        : (session.answers.get(question.id) || { selectedIds: [], evaluated: false });
      const selectedIds = entry.selectedIds || [];
      const correct = selectedIds.length > 0 && isCorrect(question, selectedIds);
      const status = selectedIds.length === 0 ? 'Unanswered' : correct ? 'Correct' : 'Incorrect';
      const statusClass = selectedIds.length === 0 ? 'is-unanswered' : correct ? 'is-correct' : 'is-incorrect';
      const card = makeElement('article', 'review-card');
      card.append(makeElement('div', 'question-number', `Question ${index + 1} of ${session.questions.length}`));
      card.append(makeElement('h3', 'question-text', question.question));
      card.append(makeElement('span', `review-status ${statusClass}`, status));
      card.append(makeReviewLine('Your answer', selectedOptionText(question, selectedIds)));
      card.append(makeReviewLine('Correct answer', displayedAnswerText(question)));
      const correctText = correctOptionText(question);
      if (correctText !== displayedAnswerText(question)) card.append(makeReviewLine('Correct option text', correctText));
      appendSourceReview(card, question);
      dom.reviewList.append(card);
    });
  }

  function makeReviewLine(label, value) {
    const line = makeElement('p', 'review-line');
    line.append(makeElement('strong', '', `${label}: `), document.createTextNode(value));
    return line;
  }

  function toggleReviewAll() {
    const shouldShow = dom.reviewList.classList.contains('hidden');
    if (shouldShow) {
      renderReviewList();
      dom.reviewList.classList.remove('hidden');
      dom.reviewAllButton.textContent = 'Hide Answer Review';
      dom.reviewList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      dom.reviewList.classList.add('hidden');
      dom.reviewAllButton.textContent = 'Review All Answers';
    }
  }

  function retryCurrentSession() {
    if (!state.lastConfig) return;
    const config = {
      ...state.lastConfig,
      pool: state.lastConfig.pool.map(cloneQuestion),
    };
    startSession(config);
  }

  function goToSetup() {
    state.session = null;
    dom.quizPanel.classList.add('hidden');
    dom.resultsPanel.classList.add('hidden');
    dom.setupPanel.classList.remove('hidden');
    setSetupMessage('');
    dom.setupPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    dom.startButton.focus({ preventScroll: true });
  }

  function reviewWeeklyAnswers() {
    if (!state.session || !state.session.submitted) return;
    const firstFeedback = dom.weeklyQuestionList.querySelector('.answer-feedback');
    if (firstFeedback) firstFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else dom.weeklyResultSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function wireEvents() {
    dom.modeSelect.addEventListener('change', updateModeControls);
    dom.yearSelect.addEventListener('change', () => {
      updateWeekOptions();
      setSetupMessage('');
    });
    dom.weekSelect.addEventListener('change', () => setSetupMessage(''));
    dom.excludeFlagged.addEventListener('change', () => setSetupMessage(''));
    dom.startButton.addEventListener('click', startFromSetup);
    dom.changeSetupButton.addEventListener('click', goToSetup);
    dom.weeklyQuestionList.addEventListener('change', handleWeeklyChange);
    dom.submitWeeklyButton.addEventListener('click', submitWeeklyTest);
    dom.retryWeeklyButton.addEventListener('click', retryCurrentSession);
    dom.chooseAnotherWeekButton.addEventListener('click', goToSetup);
    dom.reviewWeeklyButton.addEventListener('click', reviewWeeklyAnswers);
    dom.instantQuestion.addEventListener('change', handleInstantChange);
    dom.instantQuestion.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="check-multiple"]')) checkMultipleAnswer();
    });
    dom.previousQuestionButton.addEventListener('click', () => moveInstantQuestion(-1));
    dom.nextQuestionButton.addEventListener('click', () => moveInstantQuestion(1));
    dom.finishPracticeButton.addEventListener('click', finishPractice);
    dom.reviewAllButton.addEventListener('click', toggleReviewAll);
    dom.retrySessionButton.addEventListener('click', retryCurrentSession);
    dom.returnSetupButton.addEventListener('click', goToSetup);
  }

  wireEvents();
  loadBank();
})();
