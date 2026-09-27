const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress");
const instructions = document.querySelector("#instructions");
const blockedSummary = document.querySelector("#blocked-summary");
const caseSelect = document.querySelector("#case-select");
const caseMeta = document.querySelector("#case-meta");
const caseTitle = document.querySelector("#case-title");
const components = document.querySelector("#components");
const slot = document.querySelector("#slot");
const referenceFiles = document.querySelector("#reference-files");
const requiredChecks = document.querySelector("#required-checks");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const nextOpenButton = document.querySelector("#next-open");
const form = document.querySelector("#review-form");
const reviewerInput = document.querySelector("#reviewer-id");
const evidenceType = document.querySelector("#evidence-type");
const evidenceReference = document.querySelector("#evidence-reference");
const notes = document.querySelector("#notes");
const resultButtons = [...document.querySelectorAll("button[data-result]")];
const exportLink = document.querySelector("#export");
const status = document.querySelector("#status");

let state;
let currentCaseIndex = 0;
let selectedResult = null;
let reviewerDraft = "";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const kindLabels = {
  "head-on-reference-torso": "Kopf auf Referenz-Torso",
  "headwear-on-head": "Kopfbedeckung auf Kopf",
  "accessory-in-reference-hand": "Zubehör in Referenzhand",
};

function renderNavigation() {
  caseSelect.innerHTML = state.cases.map((reviewCase, index) => {
    const marker = reviewCase.decision ? "✓" : "○";
    const parts = reviewCase.components.map(({ rebrickablePartNum }) => rebrickablePartNum).join(" + ");
    return `<option value="${index}">${marker} ${index + 1}. ${escapeHtml(parts)} · ${escapeHtml(reviewCase.slot)}</option>`;
  }).join("");
  caseSelect.value = String(currentCaseIndex);
  previousButton.disabled = currentCaseIndex === 0;
  nextButton.disabled = currentCaseIndex === state.cases.length - 1;
}

function renderProgress() {
  progressBar.max = state.totalCases;
  progressBar.value = state.reviewedCaseCount;
  progressLabel.textContent = `${state.reviewedCaseCount} von ${state.totalCases} Prüffällen dokumentiert`;
  exportLink.classList.toggle("disabled", !state.complete);
  exportLink.setAttribute("aria-disabled", String(!state.complete));
  exportLink.href = state.complete ? "/api/export" : "";
}

function renderBlockedSummary() {
  const blocked = state.blockedCases[0];
  blockedSummary.innerHTML = blocked
    ? `<h2>Vorab blockiert</h2><p><strong>${escapeHtml(blocked.componentIds.join(" + "))}</strong>: unvollständige Torso-Baugruppe; dieser Fall kann in der Oberfläche nicht freigegeben werden.</p>`
    : "";
}

function updateResultButtons() {
  for (const button of resultButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.result === selectedResult));
  }
}

function renderCase() {
  const reviewCase = state.cases[currentCaseIndex];
  const decision = reviewCase.decision;
  caseMeta.textContent = `Prüffall ${currentCaseIndex + 1} von ${state.totalCases}`;
  caseTitle.textContent = kindLabels[reviewCase.kind] ?? reviewCase.kind;
  components.innerHTML = reviewCase.components.map((component) => `
    <article class="component">
      ${component.thumbnailUrl
        ? `<img src="${escapeHtml(component.thumbnailUrl)}" alt="LDraw-Vorschau für ${escapeHtml(component.rebrickablePartNum)}" />`
        : ""}
      <div>
        <h3>${escapeHtml(component.rebrickablePartNum)}</h3>
        <p>${escapeHtml(component.role)} · ${escapeHtml(component.ldrawFile)}</p>
      </div>
    </article>
  `).join("");
  slot.textContent = reviewCase.slot;
  referenceFiles.textContent = reviewCase.referenceFiles.join(", ");
  requiredChecks.innerHTML = reviewCase.requiredChecks.map((check) => `<li>${escapeHtml(check)}</li>`).join("");

  selectedResult = decision?.result ?? null;
  reviewerInput.value = decision?.reviewerId ?? reviewerDraft;
  evidenceType.value = decision?.evidenceType ?? "";
  evidenceReference.value = decision?.evidenceReference ?? "";
  notes.value = decision?.notes ?? "";
  updateResultButtons();
  renderNavigation();
}

function render() {
  instructions.textContent = state.instructions;
  renderProgress();
  renderBlockedSummary();
  renderCase();
}

async function loadState() {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Passform-Prüfstand konnte nicht geladen werden.");
  }
  state = await response.json();
  render();
}

async function saveReview(event) {
  event.preventDefault();
  if (!selectedResult) {
    status.textContent = "Bitte zuerst ein Ergebnis auswählen.";
    return;
  }
  if (!form.reportValidity()) {
    return;
  }
  const reviewCase = state.cases[currentCaseIndex];
  reviewerDraft = reviewerInput.value.trim();
  status.textContent = "Speichere lokal …";
  const response = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caseId: reviewCase.caseId,
      result: selectedResult,
      reviewerId: reviewerDraft,
      evidenceType: evidenceType.value,
      evidenceReference: evidenceReference.value.trim(),
      notes: notes.value.trim(),
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? "Prüffall konnte nicht gespeichert werden.");
  }
  state = result;
  status.textContent = "Lokal gespeichert; keine Kompatibilitätsfreigabe ausgelöst.";
  render();
}

for (const button of resultButtons) {
  button.addEventListener("click", () => {
    selectedResult = button.dataset.result;
    updateResultButtons();
  });
}
reviewerInput.addEventListener("input", () => { reviewerDraft = reviewerInput.value; });
form.addEventListener("submit", (event) => {
  saveReview(event).catch((error) => { status.textContent = error.message; });
});
caseSelect.addEventListener("change", () => {
  currentCaseIndex = Number.parseInt(caseSelect.value, 10);
  renderCase();
});
previousButton.addEventListener("click", () => {
  currentCaseIndex -= 1;
  renderCase();
  window.scrollTo({ top: 0 });
});
nextButton.addEventListener("click", () => {
  currentCaseIndex += 1;
  renderCase();
  window.scrollTo({ top: 0 });
});
nextOpenButton.addEventListener("click", () => {
  const nextOpen = state.cases.findIndex((reviewCase, index) => index > currentCaseIndex && !reviewCase.decision);
  const wrappedOpen = state.cases.findIndex((reviewCase) => !reviewCase.decision);
  currentCaseIndex = nextOpen >= 0 ? nextOpen : wrappedOpen >= 0 ? wrappedOpen : currentCaseIndex;
  renderCase();
  window.scrollTo({ top: 0 });
});

loadState().catch((error) => { status.textContent = error.message; });
