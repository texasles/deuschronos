// ========== STATE ==========
let segments = []; 
let currentIndex = -1;
let timerInterval = null;
let remainingSeconds = 0;

// ========== DOM ELEMENTS ==========
const form = document.getElementById('segment-form');
const segmentNameInput = document.getElementById('segment-name');
const segmentDurationInput = document.getElementById('segment-duration');
const segmentListEl = document.getElementById('segment-list');

const currentNameEl = document.getElementById('current-name');
const currentTimeEl = document.getElementById('current-time');
const nextNameEl = document.getElementById('next-name');
const totalTimeEl = document.getElementById('total-time');

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const resetBtn = document.getElementById('reset-btn');

const speakerNoteInput = document.getElementById('speaker-note');
const sendNoteBtn = document.getElementById('send-note-btn');

// ========== UTILITIES ==========
function parseDuration(str) {
  // Expect "MM:SS" or "M:SS" or just "SS"
  const parts = str.split(':').map(Number);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatTime(totalSec) {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}`;
}

function calculateTotalRemaining(startIdx = 0, offsetSeconds = 0) {
  // Sum durations of segments from startIdx onward,
  // then subtract offsetSeconds from the first segment's total.
  let sum = 0;
  for (let i = startIdx; i < segments.length; i++) {
    sum += segments[i].durationSeconds;
  }
  sum -= offsetSeconds;
  return Math.max(sum, 0);
}

// Write the current timer state into localStorage as JSON.
function writeStateToLocalStorage() {
  if (currentIndex < 0 || currentIndex >= segments.length) {
    // No active segment
    const payload = {
      currentSegment: null,
      remainingSeconds: 0,
      nextSegment: null,
      totalRemaining: 0,
    };
    localStorage.setItem('stageTimerState', JSON.stringify(payload));
    return;
  }

  const currSeg = segments[currentIndex];
  const nextSegName = (currentIndex + 1 < segments.length)
    ? segments[currentIndex + 1].name
    : null;
  const totalRem = calculateTotalRemaining(
    currentIndex,
    currSeg.durationSeconds - remainingSeconds
  );

  const payload = {
    currentSegment: currSeg.name,
    remainingSeconds: remainingSeconds,
    nextSegment: nextSegName,
    totalRemaining: totalRem,
  };

  localStorage.setItem('stageTimerState', JSON.stringify(payload));
}

// ========== RENDERING ==========
function renderSegmentList() {
  segmentListEl.innerHTML = '';
  segments.forEach((seg, idx) => {
    const li = document.createElement('li');
    li.textContent = `${seg.name} — ${formatTime(seg.durationSeconds)}`;
    // Gray out or bold depending on state
    if (idx < currentIndex) {
      li.style.opacity = '0.5';
    } else if (idx === currentIndex) {
      li.style.fontWeight = 'bold';
    }
    segmentListEl.appendChild(li);
  });
}

function updateTimerDisplay() {
  // If no active segment, show placeholders
  if (currentIndex < 0 || currentIndex >= segments.length) {
    currentNameEl.textContent = '—';
    currentTimeEl.textContent = '00:00';
    nextNameEl.textContent = '—';
    totalTimeEl.textContent = '00:00';

    writeStateToLocalStorage();
    return;
  }

  const currSeg = segments[currentIndex];
  currentNameEl.textContent = currSeg.name;
  currentTimeEl.textContent = formatTime(remainingSeconds);

  if (currentIndex + 1 < segments.length) {
    nextNameEl.textContent = segments[currentIndex + 1].name;
  } else {
    nextNameEl.textContent = '—';
  }

  const totalRem = calculateTotalRemaining(
    currentIndex,
    currSeg.durationSeconds - remainingSeconds
  );
  totalTimeEl.textContent = formatTime(totalRem);

  renderSegmentList();
  writeStateToLocalStorage();
}

// ========== TIMER LOGIC ==========
function startTimer() {
  if (currentIndex === -1) {
    // Just beginning
    if (segments.length === 0) {
      alert('Add at least one segment before starting the timer.');
      return;
    }
    currentIndex = 0;
    remainingSeconds = segments[0].durationSeconds;
  }

  // Disable/Enable appropriate buttons
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  segmentNameInput.disabled = true;
  segmentDurationInput.disabled = true;

  // Kick off the interval
  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateTimerDisplay();
    } else {
      // Move to next segment
      clearInterval(timerInterval);
      if (currentIndex + 1 < segments.length) {
        currentIndex++;
        remainingSeconds = segments[currentIndex].durationSeconds;
        startTimer(); // Recursively start next segment
      } else {
        // All done
        updateTimerDisplay();
        alert('All segments completed.');
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        resetBtn.disabled = false;
      }
    }
  }, 1000);

  updateTimerDisplay();
}

function pauseTimer() {
  clearInterval(timerInterval);
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
}

function resumeTimer() {
  if (remainingSeconds <= 0) return;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  timerInterval = setInterval(() => {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      if (currentIndex + 1 < segments.length) {
        currentIndex++;
        remainingSeconds = segments[currentIndex].durationSeconds;
        startTimer();
      } else {
        updateTimerDisplay();
        alert('All segments completed.');
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        resetBtn.disabled = false;
      }
    }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  currentIndex = -1;
  remainingSeconds = 0;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  resetBtn.disabled = true;
  segmentNameInput.disabled = false;
  segmentDurationInput.disabled = false;
  updateTimerDisplay();
}

// ========== EVENT LISTENERS ==========

// 1) Add new segment
form.addEventListener('submit', (evt) => {
  evt.preventDefault();
  const name = segmentNameInput.value.trim();
  const dur = segmentDurationInput.value.trim();

  const secs = parseDuration(dur);
  if (isNaN(secs) || secs <= 0) {
    alert('Please enter a valid duration in MM:SS format.');
    return;
  }

  segments.push({ name, durationSeconds: secs });
  segmentNameInput.value = '';
  segmentDurationInput.value = '';
  renderSegmentList();

  // Update totalRemaining (nothing is running yet)
  totalTimeEl.textContent = formatTime(calculateTotalRemaining());
  writeStateToLocalStorage();
});

// 2) Start
startBtn.addEventListener('click', () => startTimer());

// 3) Pause
pauseBtn.addEventListener('click', () => pauseTimer());

// 4) Resume
resumeBtn.addEventListener('click', () => resumeTimer());

// 5) Reset
resetBtn.addEventListener('click', () => resetTimer());

// 6) Send Speaker Note
sendNoteBtn.addEventListener('click', () => {
  const note = speakerNoteInput.value.trim();
  localStorage.setItem('stageTimerNote', note || '');
  speakerNoteInput.value = '';
});

// Initial render
updateTimerDisplay();
