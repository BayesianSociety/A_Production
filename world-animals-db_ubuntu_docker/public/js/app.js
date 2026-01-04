// public/js/app.js
import { getAnimals, getRandomQuestion } from "./data-service.js";


const $animals = document.getElementById("animals");
const $lang = document.getElementById("lang");
const $group = document.getElementById("group");
const $load = document.getElementById("load");
const $questionBtn = document.getElementById("questionBtn");
const $question = document.getElementById("question");


async function renderAnimals() {
const lang = $lang.value; const group = parseInt($group.value || "1");
const animals = await getAnimals({ lang, group });
$animals.innerHTML = animals.map(a => `
<div class="card">
${a.mini ? `<img src="${a.mini}" alt="${a.name}"/>` : ''}
<h3>${a.name}</h3>
${a.fact ? `<p class="muted">${a.fact}</p>` : ''}
<p class="muted">Continents: ${a.continents.join(', ')}</p>
</div>
`).join("");
}


async function renderQuestion() {
const lang = $lang.value; const group = parseInt($group.value || "1");
try {
const q = await getRandomQuestion({ lang, group });
$question.textContent = q.prompt || "";
} catch (e) {
$question.textContent = "No question available.";
}
}


$load.addEventListener("click", renderAnimals);
$questionBtn.addEventListener("click", renderQuestion);


// initial load
renderAnimals();