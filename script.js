/* =====================================
   1. HTML要素を取得する
   ===================================== */

const timerDisplay = document.getElementById("timer-display");
const timerStatus = document.getElementById("timer-status");
const roundDisplay = document.getElementById("round-display");

const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");

const workInput = document.getElementById("work-duration");
const restInput = document.getElementById("rest-duration");
const roundInput = document.getElementById("round-count");

const saveSettingsBtn = document.getElementById("save-settings-btn");
const themeToggle = document.getElementById("theme-toggle");
const languageSelect = document.getElementById("language-select");
const volumeControl = document.getElementById("volume-control");
const soundEnabled = document.getElementById("sound-enabled");

const historyList = document.getElementById("history-list");


/* =====================================
   2. 保存データを読み込む
   ===================================== */

// localStorageからJSONデータを読み込む。
// データが壊れている場合などは空のデータを返す。
function loadStoredData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch (error) {
    console.error(`${key}の読み込みに失敗しました:`, error);
    return fallback;
  }
}

// 数値が指定範囲内の整数か確認する
function validSavedNumber(value, min, max, fallback) {
  return Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

const savedSettings = loadStoredData("timerSettings", {});
const savedHistory = loadStoredData("timerHistory", []);

let initialWorkSeconds = validSavedNumber(
  savedSettings.workSeconds, 1, 3600, 60
);

let initialRestSeconds = validSavedNumber(
  savedSettings.restSeconds, 0, 3600, 15
);

let totalRounds = validSavedNumber(
  savedSettings.totalRounds, 1, 100, 10
);

let currentLanguage =
  savedSettings.language === "en" ? "en" : "ja";

let currentTheme =
  savedSettings.theme === "light" ? "light" : "dark";

let volume = validSavedNumber(
  savedSettings.volume, 0, 100, 60
);

let soundsAreEnabled =
  typeof savedSettings.soundsEnabled === "boolean"
    ? savedSettings.soundsEnabled
    : true;

// 履歴は配列として保存・管理する
let workoutHistory = Array.isArray(savedHistory)
  ? savedHistory.filter((item) =>
      item &&
      typeof item.date === "string" &&
      Number.isInteger(item.totalRounds) &&
      item.totalRounds > 0
    ).slice(0, 50)
  : [];


/* =====================================
   3. タイマーの状態を管理する
   ===================================== */

let remainingSeconds = initialWorkSeconds;
let currentRound = 1;

let isRunning = false;
let timerInterval = null;

// phase: READY / WORK / REST / FINISHED
let phase = "READY";

// 画面に表示する状態
let statusKey = "ready";

// トレーニングの開始時刻
let workoutStartedAt = null;


/* =====================================
   4. 日本語・英語の翻訳データ
   ===================================== */

const translations = {
  ja: {
    appTitle: "ワークアウトタイマー",
    themeToggle: "テーマ切替",
    start: "開始 / 再開",
    pause: "一時停止",
    reset: "リセット",
    settings: "トレーニング設定",
    workDuration: "ワーク時間（秒）",
    restDuration: "休憩時間（秒）",
    roundCount: "ラウンド数",
    saveSettings: "設定を保存",
    preferences: "環境設定",
    language: "言語",
    volume: "音量",
    enableSounds: "サウンドを有効にする",
    history: "トレーニング履歴",
    noHistory: "完了したトレーニングはありません。",
    ready: "開始前",
    work: "ワーク",
    rest: "休憩",
    paused: "一時停止中",
    finished: "完了",
    round: "ラウンド",
    of: "/",
    settingsSaved: "設定を保存しました。",
    invalidSettings: "設定値を確認してください。",
    stopBeforeSettings: "設定を変更するには、リセットしてください。",
    historyDate: "日時",
    historyRounds: "ラウンド",
    historyWork: "ワーク",
    historyRest: "休憩",
    historyDuration: "所要時間",
    seconds: "秒",
    minutes: "分",
    secondsShort: "秒"
  },

  en: {
    appTitle: "Workout Timer",
    themeToggle: "Toggle Theme",
    start: "Start / Resume",
    pause: "Pause",
    reset: "Reset",
    settings: "Workout Settings",
    workDuration: "Work Duration (seconds)",
    restDuration: "Rest Duration (seconds)",
    roundCount: "Number of Rounds",
    saveSettings: "Save Settings",
    preferences: "Preferences",
    language: "Language",
    volume: "Sound Volume",
    enableSounds: "Enable Sounds",
    history: "Workout History",
    noHistory: "No completed workouts yet.",
    ready: "Ready",
    work: "Work",
    rest: "Rest",
    paused: "Paused",
    finished: "Finished",
    round: "Round",
    of: "/",
    settingsSaved: "Settings saved.",
    invalidSettings: "Please check your settings.",
    stopBeforeSettings: "Reset the timer before changing settings.",
    historyDate: "Date",
    historyRounds: "Rounds",
    historyWork: "Work",
    historyRest: "Rest",
    historyDuration: "Duration",
    seconds: "sec",
    minutes: "min",
    secondsShort: "sec"
  }
};

// 指定されたキーに対応する翻訳を取得する
function t(key) {
  return translations[currentLanguage][key]
    ?? translations.en[key]
    ?? key;
}


/* =====================================
   5. 設定を保存する
   ===================================== */

function persistSettings() {
  const settings = {
    workSeconds: initialWorkSeconds,
    restSeconds: initialRestSeconds,
    totalRounds: totalRounds,
    language: currentLanguage,
    theme: currentTheme,
    volume: volume,
    soundsEnabled: soundsAreEnabled
  };

  try {
    localStorage.setItem("timerSettings", JSON.stringify(settings));
  } catch (error) {
    console.error("設定の保存に失敗しました:", error);
  }
}


/* =====================================
   6. 履歴を保存・表示する
   ===================================== */

// 履歴をlocalStorageに保存する
function persistHistory() {
  try {
    localStorage.setItem("timerHistory", JSON.stringify(workoutHistory));
  } catch (error) {
    console.error("履歴の保存に失敗しました:", error);
  }
}

// 秒数を「分・秒」の形式に変換する
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes === 0) {
    return `${secs} ${t("seconds")}`;
  }

  if (secs === 0) {
    return `${minutes} ${t("minutes")}`;
  }

  return `${minutes} ${t("minutes")} ${secs} ${t("seconds")}`;
}

// 履歴をHTMLに表示する
function renderHistory() {
  // 以前の表示をいったん空にする
  historyList.replaceChildren();

  // 履歴がなければ案内文を表示する
  if (workoutHistory.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = t("noHistory");
    historyList.appendChild(emptyMessage);
    return;
  }

  // 新しい履歴から順に表示する
  workoutHistory.forEach((workout) => {
    const item = document.createElement("li");

    const date = document.createElement("p");
    date.textContent =
      `${t("historyDate")}: ` +
      new Date(workout.date).toLocaleString(
        currentLanguage === "ja" ? "ja-JP" : "en-US"
      );

    const rounds = document.createElement("p");
    rounds.textContent =
      `${t("historyRounds")}: ${workout.totalRounds}`;

    const work = document.createElement("p");
    work.textContent =
      `${t("historyWork")}: ${workout.workSeconds} ${t("seconds")}`;

    const rest = document.createElement("p");
    rest.textContent =
      `${t("historyRest")}: ${workout.restSeconds} ${t("seconds")}`;

    const duration = document.createElement("p");
    duration.textContent =
      `${t("historyDuration")}: ${formatDuration(workout.durationSeconds)}`;

    item.append(date, rounds, work, rest, duration);
    historyList.appendChild(item);
  });
}

// 完了したトレーニングを履歴に追加する
function saveWorkoutHistory() {
  // 開始時刻がない場合は履歴を作らない
  if (workoutStartedAt === null) return;

  const finishedAt = Date.now();

  const record = {
    date: new Date(finishedAt).toISOString(),
    workSeconds: initialWorkSeconds,
    restSeconds: initialRestSeconds,
    totalRounds: totalRounds,
    durationSeconds: Math.max(
      0,
      Math.round((finishedAt - workoutStartedAt) / 1000)
    )
  };

  // 新しい履歴を先頭に追加する
  workoutHistory.unshift(record);

  // 保存する履歴は最大50件までにする
  workoutHistory = workoutHistory.slice(0, 50);

  persistHistory();
  renderHistory();

  // 同じトレーニングを二重保存しないようにする
  workoutStartedAt = null;
}


/* =====================================
   7. 言語を切り替える
   ===================================== */

function updateLanguage() {
  // data-i18n属性がある要素の文章を翻訳する
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  languageSelect.value = currentLanguage;

  updateDisplay();
  renderHistory();
}


/* =====================================
   8. テーマを切り替える
   ===================================== */

function applyTheme() {
  document.body.classList.toggle(
    "light-theme",
    currentTheme === "light"
  );
}


/* =====================================
   9. タイマー表示を更新する
   ===================================== */

// 秒数を「分:秒」の形式に変換する
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );
}

// タイマーの数字・状態・ラウンド数を更新する
function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);

  roundDisplay.textContent =
    `${t("round")} ${currentRound} ${t("of")} ${totalRounds}`;

  timerStatus.textContent = t(statusKey);
}


/* =====================================
   10. 音声機能
   ===================================== */

let audioContext = null;

// ブラウザの音声機能を準備する
function prepareAudio() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  if (audioContext === null) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch((error) => {
      console.error("音声を開始できませんでした:", error);
    });
  }
}

// 周波数と長さを指定して音を鳴らす
function playTone(frequency, duration, delay = 0) {
  if (
    !soundsAreEnabled ||
    volume === 0 ||
    audioContext === null ||
    audioContext.state !== "running"
  ) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";

  const peakVolume = 0.15 * (volume / 100);
  const startAt = audioContext.currentTime + delay;
  const endAt = startAt + duration;

  gainNode.gain.setValueAtTime(0.001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(
    peakVolume,
    startAt + 0.01
  );
  gainNode.gain.exponentialRampToValueAtTime(0.001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt + 0.01);
}

// 毎秒鳴る短い音
function playTickSound() {
  playTone(1000, 0.04);
}

// ワークと休憩の切り替え音
function playTransitionSound() {
  playTone(600, 0.08);
  playTone(900, 0.1, 0.1);
}

// トレーニング終了音
function playFinishSound() {
  playTone(660, 0.12);
  playTone(880, 0.12, 0.14);
  playTone(1100, 0.2, 0.28);
}


/* =====================================
   11. タイマーを停止する
   ===================================== */

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  isRunning = false;
}


/* =====================================
   12. トレーニングを終了する
   ===================================== */

function finishWorkout() {
  stopTimer();

  phase = "FINISHED";
  statusKey = "finished";

  // 完了した場合だけ履歴を保存する
  saveWorkoutHistory();

  // 終了音を鳴らす
  playFinishSound();

  updateDisplay();
}


/* =====================================
   13. ワークと休憩を切り替える
   ===================================== */

function switchPhase() {
  // ワークが終わった場合
  if (phase === "WORK") {
    // 最終ラウンドなら休憩せず終了
    if (currentRound >= totalRounds) {
      finishWorkout();
      return;
    }

    // 休憩時間が0秒なら次のワークへ進む
    if (initialRestSeconds === 0) {
      currentRound += 1;
      phase = "WORK";
      remainingSeconds = initialWorkSeconds;
    } else {
      phase = "REST";
      remainingSeconds = initialRestSeconds;
    }

  // 休憩が終わった場合
  } else if (phase === "REST") {
    currentRound += 1;
    phase = "WORK";
    remainingSeconds = initialWorkSeconds;
  }

  statusKey = phase.toLowerCase();

  playTransitionSound();
  updateDisplay();
}


/* =====================================
   14. 1秒ごとのカウントダウン
   ===================================== */

function tick() {
  remainingSeconds -= 1;

  // 0秒より大きい場合だけカウントダウン音を鳴らす
  if (remainingSeconds > 0) {
    playTickSound();
  }

  if (remainingSeconds <= 0) {
    remainingSeconds = 0;
    updateDisplay();
    switchPhase();
    return;
  }

  updateDisplay();
}


/* =====================================
   15. タイマーを開始・再開する
   ===================================== */

function startTimer() {
  // 二重にタイマーを開始しない
  if (isRunning) return;

  // ユーザー操作をきっかけに音声機能を準備する
  prepareAudio();

  // 完了後にもう一度開始したら最初から始める
  if (phase === "FINISHED") {
    resetTimer();
  }

  // 初回開始時に開始時刻を記録する
  if (phase === "READY") {
    phase = "WORK";
    workoutStartedAt = Date.now();
  }

  statusKey = phase.toLowerCase();
  isRunning = true;

  updateDisplay();

  timerInterval = setInterval(tick, 1000);
}


/* =====================================
   16. 一時停止
   ===================================== */

function pauseTimer() {
  if (!isRunning) return;

  stopTimer();

  statusKey = "paused";
  updateDisplay();
}


/* =====================================
   17. リセット
   ===================================== */

function resetTimer() {
  stopTimer();

  remainingSeconds = initialWorkSeconds;
  currentRound = 1;

  phase = "READY";
  statusKey = "ready";

  // リセットしたトレーニングは履歴に保存しない
  workoutStartedAt = null;

  updateDisplay();
}


/* =====================================
   18. トレーニング設定を保存する
   ===================================== */

function saveSettings() {
  const workValue = Number(workInput.value);
  const restValue = Number(restInput.value);
  const roundsValue = Number(roundInput.value);

  // 入力値が許容範囲内か確認する
  if (
    !Number.isInteger(workValue) ||
    !Number.isInteger(restValue) ||
    !Number.isInteger(roundsValue) ||
    workValue < 1 || workValue > 3600 ||
    restValue < 0 || restValue > 3600 ||
    roundsValue < 1 || roundsValue > 100
  ) {
    alert(t("invalidSettings"));
    return;
  }

  // 実行中や一時停止中の設定変更を防ぐ
  if (
    isRunning ||
    (phase !== "READY" && phase !== "FINISHED")
  ) {
    alert(t("stopBeforeSettings"));
    return;
  }

  initialWorkSeconds = workValue;
  initialRestSeconds = restValue;
  totalRounds = roundsValue;

  persistSettings();
  resetTimer();

  alert(t("settingsSaved"));
}


/* =====================================
   19. 言語設定の変更
   ===================================== */

languageSelect.addEventListener("change", () => {
  currentLanguage = languageSelect.value;

  persistSettings();
  updateLanguage();
});


/* =====================================
   20. テーマ設定の変更
   ===================================== */

themeToggle.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";

  applyTheme();
  persistSettings();
});


/* =====================================
   21. 音量・サウンド設定の変更
   ===================================== */

volumeControl.addEventListener("input", () => {
  volume = Number(volumeControl.value);
  persistSettings();
});

soundEnabled.addEventListener("change", () => {
  soundsAreEnabled = soundEnabled.checked;
  persistSettings();
});


/* =====================================
   22. ボタンの動作を登録する
   ===================================== */

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
saveSettingsBtn.addEventListener("click", saveSettings);


/* =====================================
   23. ページ読み込み時の初期化
   ===================================== */

// 保存されていた設定を入力欄に反映する
workInput.value = initialWorkSeconds;
restInput.value = initialRestSeconds;
roundInput.value = totalRounds;

volumeControl.value = volume;
soundEnabled.checked = soundsAreEnabled;

// 保存されたテーマ・言語・履歴を画面に反映する
applyTheme();
updateLanguage();
renderHistory();

// タイマーを開始前の状態にする
remainingSeconds = initialWorkSeconds;
updateDisplay();