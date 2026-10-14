PSYCHOLOGY OF LEARNING — QUIZ BANK
==================================

FILES
-----
1. psychology_learning_quiz_bank.txt
   UTF-8 JSON Lines (JSONL): one complete question object per line. This is the requested .txt file and is directly parseable line-by-line.

2. psychology_learning_quiz_bank.json
   A standard JSON array of all question objects. This is the easiest format to import into most JavaScript/web applications.

3. psychology_learning_quiz_bank.jsonl
   Same data as the .txt file, with the conventional .jsonl extension.

4. quiz_import_example.js
   Small vanilla-JavaScript example for loading the bank, shuffling questions/options, and checking selected option IDs.

RECORD FORMAT
-------------
Each item has these fields in this order:

id            Stable unique ID, for example "2026-week00-q01".
question      Question stem.
options       Array of choices, each with a stable option ID (A, B, C...) and text.
answer        Array of correct option IDs, for example ["D"]. It is an array so the schema can support multi-select questions later.
type          "single_choice" or "multiple_select". All currently answered questions in the source set are single-choice.
answerText    Human-readable text of the correct answer.
year          Year assigned from the uploaded PDF filename.
week          Numeric week number. Week 0 is written as "week00" in the ID.
questionNumber Question number within that assignment.
sourceFile    Original uploaded PDF filename.
sourcePage    PDF page number (1-based), useful for checking the source.
qualityFlags  List of extraction or source-review notes. An empty list means no known issue was flagged for that record.

ID CONVENTION
-------------
YYYY-weekWW-qQQ
Example: 2026-week02-q07 = year 2026, Week 2, Question 7.
The zero-padded week and question numbers keep IDs stable and lexicographically sortable.

SHUFFLING SAFELY
----------------
- Shuffle the array of question objects to shuffle question order.
- Shuffle each question's options array to shuffle answer choices.
- Keep each option's id unchanged. The displayed letter/position can change, but the internal ID must not.
- Grade a response using the selected option ID(s) compared with the question's answer array. Do not grade by displayed position or option text.

SOURCE / QUALITY NOTES
----------------------
- 349 question records were extracted from the three uploaded PDFs.
- The 2024 PDF's Week 0 says it has 10 questions, but only 9 question-answer pairs are present in the document. No invented tenth question was added.
- The PDF named "Psychology-of-learning-assignment-2025(1).pdf" contains internally inconsistent or OCR-corrupted year headings. IDs use 2025 because that is the uploaded filename; verify the intended year if it matters to your publication.
- The PDF named "Psychology ln 2026(1).pdf" has a Week 7 heading that says 2025. IDs use 2026 because that is the uploaded filename.
- A small number of source answer labels appear to conflict with the answer wording; these are flagged and the answer was mapped by its matching option text where possible.
- 2025-week08-q09's answer was restored from the scanned page image (answer C, "four").
- 2025-week09-q09 has one distractor that remains illegible in the scan; its text is explicitly marked and the record has a quality flag. Review or replace this distractor before publishing that question.
- The `sourcePage` field points to the PDF page number, not the lecture slide number mentioned in some source solution notes.

RECOMMENDED FRONTEND FLOW
-------------------------
1. Load the JSON array (or parse each non-empty line from the JSONL file).
2. Filter `qualityFlags` if you want to hide records needing review.
3. Shuffle a copy of the question list and shuffle a copy of each options list for a quiz session.
4. Store the selected option IDs in UI state.
5. On submit, compare the selected IDs against `answer`; reveal `answerText` and optionally the source PDF/page.

No question has an unresolved answer key in this export. The `qualityFlags` field is still important because it records source scan issues and answer-label mismatches that deserve review.
