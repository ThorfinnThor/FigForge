const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress");
const caseSelect = document.querySelector("#case-select");
const queryTitle = document.querySelector("#query-title");
const caseMeta = document.querySelector("#case-meta");
const caseProgress = document.querySelector("#case-progress");
const candidates = document.querySelector("#candidates");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const nextUnansweredButton = document.querySelector("#next-unanswered");
const exportLink = document.querySelector("#export");
const reportLink = document.querySelector("#report");
const status = document.querySelector("#status");
let state;
let currentCaseIndex = 0;

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const caseIsComplete = (reviewCase) => reviewCase.candidates.every(({ relevance }) => relevance !== null);

function renderNavigation() {
  caseSelect.innerHTML = state.cases.map((reviewCase, index) => {
    const marker = caseIsComplete(reviewCase) ? "✓" : "○";
    return `<option value="${index}">${marker} ${index + 1}. ${escapeHtml(reviewCase.query)}</option>`;
  }).join("");
  caseSelect.value = String(currentCaseIndex);
  previousButton.disabled = currentCaseIndex === 0;
  nextButton.disabled = currentCaseIndex === state.cases.length - 1;
}
function renderProgress() {
  progressBar.max = state.totalCandidates;
  progressBar.value = state.ratedCandidates;
  progressLabel.textContent = `${state.ratedCandidates} von ${state.totalCandidates} Treffern bewertet`;
  for (const [link, href] of [[exportLink, "/api/export"], [reportLink, "/api/report"]]) {
    link.classList.toggle("disabled", !state.complete);
    link.setAttribute("aria-disabled", String(!state.complete));
    link.href = state.complete ? href : "";
  }
}
function renderCase() {
  const reviewCase = state.cases[currentCaseIndex];
  caseMeta.textContent = `${reviewCase.language.toUpperCase()} · ${reviewCase.role} · Anfrage ${currentCaseIndex + 1} von ${state.totalCases}`;
  queryTitle.textContent = reviewCase.query;
  const rated = reviewCase.candidates.filter(({ relevance }) => relevance !== null).length;
  caseProgress.textContent = `${rated} von ${reviewCase.candidates.length} Treffern bewertet`;
  candidates.innerHTML = reviewCase.candidates.map((candidate) => `
    <article class="candidate">
      <img src="${escapeHtml(candidate.thumbnailUrl)}" alt="" loading="lazy" />
      <div class="candidate-copy">
        <h3>${escapeHtml(candidate.originalName)}</h3>
        <p class="metadata"><span>Teil ${escapeHtml(candidate.rebrickablePartNum)}</span><span>${escapeHtml(candidate.colorNames.join(", ") || "Farbe unbekannt")}</span></p>
      </div>
      <div class="rating" role="group" aria-label="Relevanz für ${escapeHtml(candidate.originalName)}">
        ${[0, 1, 2].map((rating) => `<button type="button" data-key="${escapeHtml(candidate.candidateKey)}" data-rating="${rating}" aria-pressed="${String(candidate.relevance === String(rating))}">${rating}</button>`).join("")}
      </div>
    </article>
  `).join("");
  renderNavigation();
}
function render() { renderProgress(); renderCase(); }
async function loadState() {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Bewertungsstand konnte nicht geladen werden.");
  state = await response.json();
  render();
}
async function saveRating(candidateKey, relevance) {
  status.textContent = "Speichere …";
  const response = await fetch("/api/rating", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateKey, relevance }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Bewertung konnte nicht gespeichert werden.");
  state = result;
  status.textContent = "Lokal gespeichert.";
  render();
}
candidates.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;
  saveRating(button.dataset.key, button.dataset.rating).catch((error) => { status.textContent = error.message; });
});
caseSelect.addEventListener("change", () => { currentCaseIndex = Number.parseInt(caseSelect.value, 10); renderCase(); });
previousButton.addEventListener("click", () => { currentCaseIndex -= 1; renderCase(); window.scrollTo({ top: 0 }); });
nextButton.addEventListener("click", () => { currentCaseIndex += 1; renderCase(); window.scrollTo({ top: 0 }); });
nextUnansweredButton.addEventListener("click", () => {
  const open = state.cases.findIndex((reviewCase, index) => index > currentCaseIndex && !caseIsComplete(reviewCase));
  const wrapped = state.cases.findIndex((reviewCase) => !caseIsComplete(reviewCase));
  currentCaseIndex = open >= 0 ? open : wrapped >= 0 ? wrapped : currentCaseIndex;
  renderCase();
  window.scrollTo({ top: 0 });
});
loadState().catch((error) => { status.textContent = error.message; });

