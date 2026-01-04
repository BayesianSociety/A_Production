import { api } from './data-service.js';

const sceneEl = document.getElementById('scene');
const feedbackEl = document.getElementById('feedback');
const kidId = getKidId();
let currentModule = 'anatomy';

function getKidId() {
  const existing = localStorage.getItem('kidId');
  if (existing) return existing;
  const generated = crypto.randomUUID();
  localStorage.setItem('kidId', generated);
  return generated;
}

function setFeedback(message = '') {
  feedbackEl.textContent = message;
}

for (const button of document.querySelectorAll('nav button')) {
  button.addEventListener('click', () => {
    currentModule = button.dataset.module;
    loadModule(currentModule);
  });
}

loadModule(currentModule);

async function loadModule(topic) {
  setFeedback('');
  sceneEl.innerHTML = '<p>Loading…</p>';

  let questions = [];
  try {
    questions = await api.getQuestions({ topic, limit: 12 });
  } catch (error) {
    console.error('API error', error);
    sceneEl.innerHTML = `<p>Could not reach the BioKids server. ${error.message}</p>`;
    return;
  }

  if (!questions.length) {
    sceneEl.innerHTML = `<p>No content for <b>${topic}</b>. Run <code>npm run seed</code> to load demo data.</p>`;
    return;
  }

  let index = 0;
  renderQuestion(questions[index]);

  function renderQuestion(question) {
    const started = performance.now();

    switch (question.type) {
      case 'mcq':
        renderMCQ(question, done);
        break;
      case 'drag-label':
        renderDragLabel(question, done);
        break;
      case 'sort':
        renderSort(question, done);
        break;
      case 'sequence':
        renderSequence(question, done);
        break;
      default:
        sceneEl.innerHTML = `<p>Unsupported question type: ${question.type}</p>`;
    }

    async function done(result = {}) {
      const msToFirst = Math.round(performance.now() - started);
      try {
        await api.saveAttempt({
          questionId: question.id,
          kidId,
          msToFirst,
          correct: !!result.correct,
          tries: result.tries ?? 1,
          details: result.details ?? null,
        });
      } catch (error) {
        console.warn('Unable to record attempt', error);
      }

      index = (index + 1) % questions.length;
      setTimeout(() => renderQuestion(questions[index]), 450);
    }
  }
}

function renderMCQ(question, done) {
  sceneEl.innerHTML = '';
  setFeedback('');

  const wrapper = document.createElement('div');
  const prompt = document.createElement('h2');
  prompt.textContent = question.prompt;
  wrapper.appendChild(prompt);

  const list = document.createElement('div');
  list.setAttribute('role', 'group');
  wrapper.appendChild(list);

  let tries = 0;
  let resolved = false;

  for (const answer of question.answers) {
    const button = document.createElement('button');
    button.className = 'tile';
    button.textContent = answer.text;
    button.type = 'button';
    button.addEventListener('click', () => {
      if (resolved) return;
      tries += 1;
      const correct = !!answer.correct;
      if (correct) {
        resolved = true;
        button.classList.add('correct');
        setFeedback('Great job!');
        for (const b of list.querySelectorAll('button')) b.disabled = true;
        done({ correct: true, tries, details: { selected: answer.text } });
      } else {
        button.classList.add('incorrect');
        setFeedback('Not quite, try another.');
        setTimeout(() => button.classList.remove('incorrect'), 700);
      }
    });
    list.appendChild(button);
  }

  sceneEl.appendChild(wrapper);
}

function renderDragLabel(question, done) {
  sceneEl.innerHTML = '';
  setFeedback('Drag each label onto the matching spot.');

  const wrapper = document.createElement('div');
  const prompt = document.createElement('h2');
  prompt.textContent = question.prompt;
  wrapper.appendChild(prompt);

  const board = document.createElement('div');
  board.className = 'board';

  const outline = document.createElement('img');
  outline.src = question.data?.silhouette || '/img/body-outline.svg';
  outline.alt = 'Body outline';
  outline.draggable = false;
  outline.style.width = '100%';
  outline.style.height = '100%';
  board.appendChild(outline);

  const targets = new Map();
  const labelLookup = new Map();
  let draggedLabel = null;

  const allowDrop = (el) => {
    el.addEventListener('dragover', (event) => event.preventDefault());
    el.addEventListener('drop', (event) => {
      event.preventDefault();
      if (!draggedLabel) return;
      el.appendChild(draggedLabel);
      draggedLabel = null;
    });
  };

  for (const target of question.data.targets || []) {
    const targetEl = document.createElement('div');
    targetEl.className = 'target';
    targetEl.dataset.targetId = target.id;
    targetEl.style.left = `${target.x * 100}%`;
    targetEl.style.top = `${target.y * 100}%`;
    targetEl.style.width = `${target.w * 100}%`;
    targetEl.style.height = `${target.h * 100}%`;
    allowDrop(targetEl);
    board.appendChild(targetEl);
    targets.set(target.id, targetEl);
  }

  wrapper.appendChild(board);

  const trayTitle = document.createElement('p');
  trayTitle.textContent = 'Labels';
  wrapper.appendChild(trayTitle);

  const tray = document.createElement('div');
  wrapper.appendChild(tray);
  allowDrop(tray);

  for (const label of question.data.labels || []) {
    labelLookup.set(label.id, label);
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.draggable = true;
    tile.textContent = label.text;
    tile.dataset.labelId = label.id;
    tile.addEventListener('dragstart', (event) => {
      draggedLabel = tile;
      event.dataTransfer?.setData('text/plain', label.id);
    });
    tile.addEventListener('dragend', () => {
      draggedLabel = null;
    });
    tray.appendChild(tile);
  }

  const checkButton = document.createElement('button');
  checkButton.className = 'btn';
  checkButton.textContent = 'Check placements';
  wrapper.appendChild(checkButton);

  let tries = 0;
  checkButton.addEventListener('click', () => {
    tries += 1;
    let correct = true;
    const details = [];

    for (const target of question.data.targets || []) {
      const element = targets.get(target.id);
      if (!element) continue;
      element.classList.remove('correct', 'incorrect');
      const tile = element.querySelector('.tile');
      const labelId = tile?.dataset.labelId || null;
      const label = labelLookup.get(labelId);
      const match = !!(label && label.bodyPartId === target.bodyPartId);
      if (match) {
        element.classList.add('correct');
      } else {
        element.classList.add('incorrect');
        correct = false;
      }
      details.push({ targetId: target.id, labelId });
    }

    if (correct) {
      setFeedback('Excellent placement!');
      checkButton.disabled = true;
      done({ correct: true, tries, details });
    } else {
      setFeedback('Some labels are not matched yet.');
    }
  });

  sceneEl.appendChild(wrapper);
}

function renderSort(question, done) {
  sceneEl.innerHTML = '';
  setFeedback('Drag each card to the correct bucket.');

  const wrapper = document.createElement('div');
  const prompt = document.createElement('h2');
  prompt.textContent = question.prompt;
  wrapper.appendChild(prompt);

  const bucketsRow = document.createElement('div');
  bucketsRow.style.display = 'flex';
  bucketsRow.style.gap = '16px';
  wrapper.appendChild(bucketsRow);

  const buckets = new Map();
  const allowDrop = (element) => {
    element.addEventListener('dragover', (event) => event.preventDefault());
    element.addEventListener('drop', (event) => {
      event.preventDefault();
      if (!draggedCard) return;
      element.appendChild(draggedCard);
      draggedCard = null;
    });
  };

  for (const [key, label] of Object.entries(question.data || {})) {
    const bucket = document.createElement('div');
    bucket.className = 'target';
    bucket.style.flex = '1';
    bucket.style.minHeight = '160px';
    bucket.dataset.bucketKey = key;
    const heading = document.createElement('h3');
    heading.textContent = `${key}: ${label}`;
    bucket.appendChild(heading);
    bucketsRow.appendChild(bucket);
    buckets.set(key, bucket);
    allowDrop(bucket);
  }

  const cardsTrayTitle = document.createElement('p');
  cardsTrayTitle.textContent = 'Cards';
  wrapper.appendChild(cardsTrayTitle);

  const cardsTray = document.createElement('div');
  wrapper.appendChild(cardsTray);
  allowDrop(cardsTray);

  let draggedCard = null;
  for (const card of question.answers) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.draggable = true;
    tile.textContent = card.text;
    tile.dataset.cardId = card.id;
    tile.addEventListener('dragstart', (event) => {
      draggedCard = tile;
      event.dataTransfer?.setData('text/plain', card.id);
    });
    tile.addEventListener('dragend', () => {
      draggedCard = null;
    });
    cardsTray.appendChild(tile);
  }

  const checkButton = document.createElement('button');
  checkButton.className = 'btn';
  checkButton.textContent = 'Check buckets';
  wrapper.appendChild(checkButton);

  let tries = 0;
  checkButton.addEventListener('click', () => {
    tries += 1;
    let correct = true;
    const details = [];
    for (const card of question.answers) {
      const element = wrapper.querySelector(`[data-card-id="${card.id}"]`);
      const parentBucket = element?.parentElement?.dataset.bucketKey || 'tray';
      const expectedBucket = card.correct ? 'B' : 'A';
      const matches = parentBucket === expectedBucket;
      element?.classList.remove('correct', 'incorrect');
      if (matches) {
        element?.classList.add('correct');
      } else {
        element?.classList.add('incorrect');
        correct = false;
      }
      details.push({ cardId: card.id, bucket: parentBucket });
    }

    if (correct) {
      setFeedback('Buckets look perfect!');
      checkButton.disabled = true;
      done({ correct: true, tries, details });
    } else {
      setFeedback('Some cards need to move.');
    }
  });

  sceneEl.appendChild(wrapper);
}

function renderSequence(question, done) {
  sceneEl.innerHTML = '';
  setFeedback('Reorder the steps, then check.');

  const wrapper = document.createElement('div');
  const prompt = document.createElement('h2');
  prompt.textContent = question.prompt;
  wrapper.appendChild(prompt);

  const list = document.createElement('ol');
  list.className = 'seq';
  wrapper.appendChild(list);

  const createItem = (value) => {
    const li = document.createElement('li');
    li.dataset.value = value;
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.textContent = value;

    const controls = document.createElement('div');
    controls.style.display = 'inline-flex';
    controls.style.gap = '4px';
    controls.style.marginLeft = '8px';

    const upButton = document.createElement('button');
    upButton.textContent = '↑';
    upButton.className = 'btn';
    upButton.addEventListener('click', () => moveItem(li, -1));

    const downButton = document.createElement('button');
    downButton.textContent = '↓';
    downButton.className = 'btn';
    downButton.addEventListener('click', () => moveItem(li, 1));

    controls.append(upButton, downButton);
    li.append(tile, controls);
    return li;
  };

  const moveItem = (item, direction) => {
    const siblings = Array.from(list.children);
    const currentIndex = siblings.indexOf(item);
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= siblings.length) return;
    if (direction === -1) {
      list.insertBefore(item, siblings[newIndex]);
    } else {
      list.insertBefore(item, siblings[newIndex].nextSibling);
    }
  };

  for (const value of question.data.items || []) {
    list.appendChild(createItem(value));
  }

  const checkButton = document.createElement('button');
  checkButton.className = 'btn';
  checkButton.textContent = 'Check order';
  wrapper.appendChild(checkButton);

  let tries = 0;
  checkButton.addEventListener('click', () => {
    tries += 1;
    const currentOrder = Array.from(list.children).map((li) => li.dataset.value);
    const correctOrder = question.data.correct || [];
    const correct = currentOrder.length === correctOrder.length &&
      currentOrder.every((value, idx) => value === correctOrder[idx]);

    if (correct) {
      setFeedback('Sequence is correct!');
      checkButton.disabled = true;
      done({ correct: true, tries, details: { order: currentOrder } });
    } else {
      setFeedback('Keep rearranging to match the life cycle.');
    }
  });

  sceneEl.appendChild(wrapper);
}
