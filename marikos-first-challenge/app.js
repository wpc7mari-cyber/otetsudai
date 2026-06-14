const CHORES = [
  { id: "bath", name: "お風呂掃除", amount: 10, emoji: "🛁" },
  { id: "laundry", name: "洗濯物畳む", amount: 10, emoji: "👕" },
  { id: "koko", name: "ここちゃんのお世話", amount: 10, emoji: "🐥" },
  { id: "cooking", name: "ご飯作り", amount: 10, emoji: "🍳" },
  { id: "other", name: "その他", amount: 0, emoji: "⭐", isVariable: true }, // ★基本の金額も「0円」に修正しました！
];

const STORAGE_KEY = "marikos-first-challenge-data";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { records: {}, settlements: [] };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatMonthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatDisplayDate(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = WEEKDAYS[date.getDay()];
  return `${y}年${m}月${d}日（${w}）`;
}

function formatMonthLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function getDayRecord(data, dateKey) {
  return data.records[dateKey] || {};
}

function getDayTotal(data, dateKey) {
  const record = getDayRecord(data, dateKey);
  return CHORES.reduce((sum, chore) => {
    if (record[chore.id]) {
      const amount = (record[`${chore.id}_amount`] !== undefined) ? record[`${chore.id}_amount`] : chore.amount;
      return sum + amount;
    }
    return sum;
  }, 0);
}

function isMonthSettled(data, monthKey) {
  return data.settlements.some((s) => s.month === monthKey);
}

function getMonthTotal(data, year, month) {
  let total = 0;
  let days = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayTotal = getDayTotal(data, dateKey);
    if (dayTotal > 0) {
      total += dayTotal;
      days += 1;
    }
  }

  return { total, days };
}

const data = loadData();

let selectedDate = new Date();
let selectedDateKey = formatDateKey(selectedDate);
let currentMonthKey = formatMonthKey(selectedDate);

const todayDateEl = document.getElementById("today-date");
const choreListEl = document.getElementById("chore-list");
const todayTotalEl = document.getElementById("today-total");
const monthLabelEl = document.getElementById("month-label");
const monthAmountEl = document.getElementById("month-amount");
const monthDaysEl = document.getElementById("month-days");
const calendarEl = document.getElementById("calendar");
const settleBtn = document.getElementById("settle-btn");
const settleNoteEl = document.getElementById("settle-note");
const historyEl = document.getElementById("history");
const toastEl = document.getElementById("toast");

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2500);
}

function changeDate(newDate) {
  selectedDate = newDate;
  selectedDateKey = formatDateKey(selectedDate);
  currentMonthKey = formatMonthKey(selectedDate);
  renderToday();
  renderMonth();
}

function renderToday() {
  todayDateEl.textContent = formatDisplayDate(selectedDate);
  const record = getDayRecord(data, selectedDateKey);

  choreListEl.innerHTML = CHORES.map((chore) => {
    const done = !!record[chore.id];
    const displayAmount = (done && record[`${chore.id}_amount`] !== undefined) ? record[`${chore.id}_amount`] : chore.amount;
    
    let amountHtml = `<div class="chore-amount">${displayAmount}円</div>`;
    if (chore.isVariable && done) {
      amountHtml = `
        <div class="chore-amount" style="display: flex; align-items: center; gap: 4px;">
          <input type="number" class="inline-amount-input" value="${displayAmount}" 
                 style="width: 60px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 4px; text-align: right; font-size: 14px;" 
                 onclick="event.stopPropagation();">円
        </div>`;
    }

    return `
      <li class="chore-item ${done ? "done" : ""}" data-id="${chore.id}">
        <div class="chore-check">${done ? "✓" : ""}</div>
        <div class="chore-info">
          <div class="chore-name">${chore.name}</div>
          ${amountHtml}
        </div>
        <div class="chore-emoji">${chore.emoji}</div>
      </li>
    `;
  }).join("");

  todayTotalEl.textContent = `${getDayTotal(data, selectedDateKey)}円`;

  choreListEl.querySelectorAll(".chore-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("inline-amount-input")) return;

      const id = item.dataset.id;
      const chore = CHORES.find((c) => c.id === id);
      
      if (!data.records[selectedDateKey]) data.records[selectedDateKey] = {};
      const isCurrentlyDone = !!data.records[selectedDateKey][id];

      if (isCurrentlyDone) {
        data.records[selectedDateKey][id] = false;
        delete data.records[selectedDateKey][`${id}_amount`];
      } else {
        data.records[selectedDateKey][id] = true;
        if (chore.isVariable) {
          data.records[selectedDateKey][`${id}_amount`] = 0;
        }
      }
      
      saveData(data);
      renderToday();
      renderMonth();
    });
  });

  const inputEl = choreListEl.querySelector(".inline-amount-input");
  if (inputEl) {
    const saveInlineAmount = () => {
      let val = parseInt(inputEl.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      
      if (!data.records[selectedDateKey]) data.records[selectedDateKey] = {};
      data.records[selectedDateKey]["other_amount"] = val;
      
      saveData(data);
      todayTotalEl.textContent = `${getDayTotal(data, selectedDateKey)}円`;
      
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const { total, days } = getMonthTotal(data, year, month);
      monthAmountEl.textContent = `${total}円`;
      
      const dayEl = calendarEl.querySelector(`.cal-day[data-day="${selectedDate.getDate()}"]`);
      if (dayEl) {
        const amtEl = dayEl.querySelector(".day-amt");
        const dayTotal = getDayTotal(data, selectedDateKey);
        if (amtEl) {
          amtEl.textContent = `${dayTotal}円`;
        } else if (dayTotal > 0) {
          dayEl.classList.add("has-work");
          const numEl = dayEl.querySelector(".day-num");
          if (numEl) numEl.insertAdjacentHTML("afterend", `<span class="day-amt">${dayTotal}円</span>`);
        }
      }
    };

    inputEl.addEventListener("input", saveInlineAmount);
    inputEl.addEventListener("blur", () => {
      renderToday();
      renderMonth();
    });
  }
}

function renderMonth() {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const { total, days } = getMonthTotal(data, year, month);
  const settled = isMonthSettled(data, currentMonthKey);

  monthLabelEl.textContent = formatMonthLabel(selectedDate);
  monthAmountEl.textContent = `${total}円`;
  monthDaysEl.textContent = `お手伝い ${days}日`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let calHtml = WEEKDAYS.map((w) => `<div class="cal-header">${w}</div>`).join("");

  for (let i = 0; i < firstDay; i++) {
    calHtml += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayTotal = getDayTotal(data, dateKey);
    
    const realToday = new Date();
    const isToday = d === realToday.getDate() && month === realToday.getMonth() && year === realToday.getFullYear();
    const isSelected = d === selectedDate.getDate();

    const classes = ["cal-day"];
    if (dayTotal > 0) classes.push("has-work");
    if (isToday) classes.push("today");
    if (isSelected) classes.push("selected");

    calHtml += `
      <div class="${classes.join(" ")}" data-day="${d}">
        <span class="day-num">${d}</span>
        ${dayTotal > 0 ? `<span class="day-amt">${dayTotal}円</span>` : ""}
      </div>
    `;
  }

  calendarEl.innerHTML = calHtml;

  calendarEl.querySelectorAll(".cal-day:not(.empty)").forEach((dayEl) => {
    dayEl.addEventListener("click", () => {
      const day = parseInt(dayEl.dataset.day, 10);
      const clickedDate = new Date(year, month, day);
      
      changeDate(clickedDate);
      
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      const todayTab = document.querySelector('[data-tab="today"]');
      if (todayTab) todayTab.classList.add("active");
      document.getElementById("today").classList.add("active");
    });
  });

  if (settled) {
    const settlement = data.settlements.find((s) => s.month === currentMonthKey);
    settleBtn.disabled = true;
    settleBtn.textContent = "清算済み ✅";
    settleNoteEl.textContent = `${settlement.amount}円を清算しました（${settlement.date}）`;
  } else {
    settleBtn.disabled = total === 0;
    settleBtn.textContent = "今月を清算する 💰";
    settleNoteEl.textContent = total > 0
      ? "月末にボタンを押してお小遣いを清算しましょう"
      : "まだお手伝いの記録がありません";
  }

  renderHistory();
}

function renderHistory() {
  if (data.settlements.length === 0) {
    historyEl.innerHTML = `
      <h2>清算のきろく</h2>
      <p class="history-empty">まだ清算の記録はありません</p>
    `;
    return;
  }

  const items = data.settlements
    .map((s, index) => {
      const [y, m] = s.month.split("-");
      return `
        <div class="history-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span>${y}年${Number(m)}月 : <strong>${s.amount}円</strong></span>
          <button class="delete-btn" data-index="${index}" style="background-color: #ffdde1; color: #c62828; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">とりけし</button>
        </div>
      `;
    })
    .reverse()
    .join("");

  historyEl.innerHTML = `<h2>清算のきろく</h2>${items}`;

  historyEl.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index, 10);
      const targetMonth = data.settlements[index].month;
      const [y, m] = targetMonth.split("-");
      
      const ok = confirm(`${y}年${Number(m)}月の清算を取り消して、未清算に戻しますか？`);
      if (!ok) return;

      data.settlements.splice(index, 1);
      saveData(data);
      renderMonth();
      showToast("清算を取り消しました。");
    });
  });
}

settleBtn.addEventListener("click", () => {
  const { total } = getMonthTotal(data, selectedDate.getFullYear(), selectedDate.getMonth());
  if (total === 0 || isMonthSettled(data, currentMonthKey)) return;

  const label = formatMonthLabel(selectedDate);
  const ok = confirm(`${label}のお小遣い ${total}円 を清算しますか？`);
  if (!ok) return;

  data.settlements.push({
    month: currentMonthKey,
    amount: total,
    date: formatDisplayDate(new Date()),
  });
  saveData(data);
  renderMonth();
  showToast(`${total}円を清算しました！おつかれさま 🎉`);
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

renderToday();
renderMonth();