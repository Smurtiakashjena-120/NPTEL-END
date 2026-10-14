# Psychology of Learning — Quiz Practice

A local, responsive quiz-practice app built with plain HTML, CSS, and JavaScript. It uses the supplied question bank directly. No backend, API key, build step, external library, or internet connection is needed for normal use.

## Project files

Keep these six files together in the same folder:

```text
psychology-learning-quiz/
├── index.html
├── styles.css
├── app.js
├── README.md
├── psychology_learning_quiz_bank.json
└── psychology_learning_quiz_bank_README.txt
```

The JSON data file and its original data README are included alongside the app. Do not rename the JSON unless you also update `QUESTION_BANK_PATH` in `app.js`. The expected relative path is `./psychology_learning_quiz_bank.json`.

## Run with VS Code Live Server (recommended)

1. Extract `psychology-learning-quiz.zip` into a folder.
2. Open that folder in Visual Studio Code.
3. Install the **Live Server** extension if it is not already installed.
4. In VS Code, right-click `index.html` and choose **Open with Live Server**.
5. The site opens in your browser. The app loads the JSON from the same folder.

## Run with Python's built-in static server

Python 3 is sufficient; no packages need to be installed.

1. Extract the ZIP and open a terminal in the extracted project folder (the folder containing `index.html` and the JSON file).
2. Run:

   ```bash
   python -m http.server 8000
   ```

   On some systems, use `python3 -m http.server 8000` instead.
3. Open <http://localhost:8000> in your browser.
4. Stop the server with `Ctrl+C` in the terminal when finished.

Opening `index.html` directly as a `file://` URL may prevent the browser from loading the JSON with `fetch()`. Use Live Server or the Python server instead.

## Choose a quiz mode

- **Weekly Test** — choose a year and one of that year's available weeks. Every question in that week appears on one page. You may change answers until you submit. The app does not display correctness, correct answers, or answer feedback until **Submit Test** is pressed. Unanswered questions trigger a confirmation and are still allowed. After submission, the score and each question's result/correct answer appear beneath the corresponding question.
- **Practice One Year** — choose a year to practice all valid questions assigned to that year. Each question is shown individually and is graded immediately when a single-choice answer is selected. A `multiple_select` question, if present in the bank, waits for **Check Answer**. An evaluated question is locked for that attempt, but you can revisit it to review the result.
- **All Years Mixed Practice** — uses questions from every available year in one pool and provides the same instant-practice behavior.

**Shuffle questions** and **Shuffle answer options** are on by default. Turn either off if you prefer source order. The available years and weeks are read from the JSON; they are not hardcoded. Week 0 is treated as a valid numeric week. The app uses the actual number of records available in a week rather than assuming every week contains ten questions.

**Exclude flagged questions** is optional and off by default. When enabled, records with non-empty `qualityFlags` are excluded from the new session. Otherwise, flagged questions remain available and carry a **Review Source** disclosure containing the source notes and available PDF/page information.

## How option shuffling and scoring work

Each question ID identifies the question, and each option ID stays attached to its option even when choices are shuffled. The letters shown beside the choices represent their current display positions; they are not used for grading.

- A `single_choice` response earns a point only when the selected option ID matches the sole ID in the question's `answer` array.
- A `multiple_select` response earns a point only when the selected option-ID set exactly matches the correct set. Selection order does not matter, and selecting extra or missing options is incorrect.
- Correct answers are never inferred from displayed letters or answer text. The app uses `answer` for grading and uses `answerText` to display the answer when available, falling back to the matching option text if necessary.
- Session selections are kept in memory only. Starting or retrying a session creates a fresh set of answers so previous selections and feedback are not carried into the new attempt.
- The score percentage is calculated as `correct / total questions × 100`. Unanswered questions are shown separately and do not earn a point.

## Source data and validation

The supplied data README records known extraction and source-review notes, including the 2024 Week 0 case where only nine question-answer pairs were present, plus OCR/source issues. This app does not add questions or rewrite the supplied question bank. At startup, it validates essential fields and answer-option IDs, reports and skips malformed or duplicate question records, and lists validation diagnostics in an expandable section. A JSON loading failure produces an on-screen message and a diagnostic detail instead of a blank page.

The application derives years/weeks and question counts from valid records in the JSON. If a year or week has no available questions after the optional flagged-record filter is applied, the app displays a message rather than starting an empty session.

## Troubleshooting

**“Could not load the question bank”**

- Confirm that `psychology_learning_quiz_bank.json` is in the same folder as `index.html`.
- Confirm the filename matches exactly, including underscores and the `.json` extension.
- Start the site using Live Server or `python -m http.server 8000`; do not double-click `index.html` to open a `file://` URL.
- Refresh the page after restoring the file.

**“The question bank is not valid JSON”**

- Make sure the JSON file was not edited or truncated. The included question bank is copied from the supplied source file.
- Open the browser developer tools' Network tab and check the request for `psychology_learning_quiz_bank.json` if the error persists. The expandable diagnostics area shows a concise error message.

**A record is missing from the app**

- Expand **Data diagnostics** in the setup panel. Records with missing essential fields, duplicate IDs, invalid answer IDs, or unsupported question types are skipped so the app does not silently mark them incorrectly.
- Check the corresponding record and source details in the question bank and its accompanying data README before changing any source data.

**A week is not listed**

- Weeks are listed only when at least one valid question exists for that year/week in the JSON. Change the year selector to refresh the available weeks. Week 0 will be shown if it is present.

## Notes

- Built using HTML5, CSS3, and vanilla JavaScript.
- All quiz behavior runs in the browser. The local web server serves files only; it does not process or store answers.
- Responsive layout and native form controls support mouse, touch, and keyboard use.
