// public/js/data-service.js
const API = "/api";


export async function getAnimals({ lang = "en", group = 1 } = {}) {
const url = new URL(`${API}/animals`, location.origin);
url.searchParams.set("lang", lang);
url.searchParams.set("group", group);
const res = await fetch(url);
if (!res.ok) throw new Error("Failed to fetch animals");
return res.json();
}


export async function getRandomQuestion({ lang = "en", group, difficulty } = {}) {
const url = new URL(`${API}/questions/random`, location.origin);
url.searchParams.set("lang", lang);
if (group) url.searchParams.set("group", group);
if (difficulty) url.searchParams.set("difficulty", difficulty);
const res = await fetch(url);
if (!res.ok) throw new Error("No question available");
return res.json();
}


export async function getContinents({ lang = "en" } = {}) {
const url = new URL(`${API}/continents`, location.origin);
url.searchParams.set("lang", lang);
const res = await fetch(url);
if (!res.ok) throw new Error("Failed to fetch continents");
return res.json();
}


export async function getUIStrings({ lang = "en" } = {}) {
const url = new URL(`${API}/ui`, location.origin);
url.searchParams.set("lang", lang);
const res = await fetch(url);
if (!res.ok) return {};
return res.json();
}