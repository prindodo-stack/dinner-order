const SUPABASE_URL = "https://zyuybhszykxuafzriksn.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_3h3_2LRYgdyeXdoDO6XZMA_4jQrQTtV";
const API_URL = `${SUPABASE_URL}/functions/v1/meal-api`;

const $ = (s) => document.querySelector(s);
const state = { restaurants: [], menus: [], day: null, orders: [], selectedMenuId: null, willEat: true, loading: false };

function koreaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function displayDate() {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date());
}
function money(n) { return Number(n || 0).toLocaleString("ko-KR") + "원"; }
function toast(msg) {
  const el = $("#notice"); el.textContent = msg; el.style.display = "block";
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.style.display = "none", 2200);
}
function tokenFor(name) {
  const key = `meal-token:${koreaDate()}:${name}`;
  let token = localStorage.getItem(key);
  if (!token) { token = crypto.randomUUID(); localStorage.setItem(key, token); }
  return token;
}
async function api(path = "", options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: { "apikey": PUBLISHABLE_KEY, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const e = new Error(data.error || `HTTP ${response.status}`); e.status = response.status; throw e; }
  return data;
}
function currentRestaurant() { return state.restaurants.find(r => r.id === state.day?.restaurant_id) || null; }
function currentMenus() { const r = currentRestaurant(); return r ? state.menus.filter(m => m.restaurant_id === r.id) : []; }
function renderRestaurant() {
  const r = currentRestaurant();
  $("#restaurantName").textContent = r ? r.name : "오늘의 식당 미지정";
  $("#restaurantDesc").textContent = r ? r.description : "밥 당번이 오늘의 식당을 지정해 주세요.";
  $("#cutoffView").textContent = state.day?.cutoff_time?.slice(0,5) || "--:--";

  const grid = $("#menuGrid"); grid.innerHTML = "";
  const menus = currentMenus();
  if (!menus.length) grid.innerHTML = '<div class="empty">선택할 수 있는 메뉴가 없습니다.</div>';
  else menus.forEach(m => {
    const el = document.createElement("div");
    el.className = "menu" + (state.selectedMenuId === m.id ? " selected" : "");
    el.innerHTML = `<div class="name">${escapeHtml(m.name)}</div><div class="price">${money(m.price)}</div>`;
    el.onclick = () => { state.selectedMenuId = m.id; renderRestaurant(); };
    grid.appendChild(el);
  });

  $("#restaurantSelect").innerHTML = state.restaurants.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join("");
  if (state.day?.restaurant_id) $("#restaurantSelect").value = state.day.restaurant_id;
  if (state.day?.cutoff_time) $("#cutoffInput").value = state.day.cutoff_time.slice(0,5);
  $("#restaurantTabs").innerHTML = state.restaurants.map(r => `<span class="rtab ${r.id === state.day?.restaurant_id ? "active" : ""}">${escapeHtml(r.name)}</span>`).join("");
}
function renderOrders() {
  const menuMap = new Map(state.menus.map(m => [m.id, m]));
  const eaters = state.orders.filter(o => o.will_eat), skippers = state.orders.filter(o => !o.will_eat);
  $("#respondCount").textContent = `${state.orders.length}명 응답`;
  $("#eatCount").textContent = eaters.length; $("#skipCount").textContent = skippers.length;
  const counts = {};
  eaters.forEach(o => { const m = menuMap.get(o.menu_id); const key = m?.name || "메뉴"; counts[key] = (counts[key] || 0) + 1; });
  $("#menuKinds").textContent = Object.keys(counts).length;
  $("#menuSummary").innerHTML = Object.entries(counts).map(([name, count]) => `<span class="menu-chip">${escapeHtml(name)} × ${count}</span>`).join("");
  $("#totalPrice").textContent = money(eaters.reduce((sum, o) => sum + (menuMap.get(o.menu_id)?.price || 0), 0));

  const wrap = $("#orders"); wrap.innerHTML = "";
  if (!state.orders.length) { wrap.innerHTML = '<div class="empty">아직 주문이 없습니다.</div>'; return; }
  state.orders.forEach(o => {
    const menu = menuMap.get(o.menu_id), row = document.createElement("div");
    row.className = "order";
    row.innerHTML = `
      <div class="avatar">${escapeHtml(o.member_name.slice(0,1))}</div>
      <div class="person">${escapeHtml(o.member_name)}</div>
      <div>${o.will_eat ? `<div class="dish">${escapeHtml(menu?.name || "메뉴")}</div>${o.note ? `<div class="note">${escapeHtml(o.note)}</div>` : ""}` : '<div class="dish" style="color:#d54c4c">오늘은 안 먹음</div>'}</div>
      <div class="state ${o.will_eat ? "eat" : "skip"}">${o.will_eat ? "주문" : "미식사"}</div>`;
    wrap.appendChild(row);
  });
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
async function refresh(silent = false) {
  try {
    const data = await api(`?date=${encodeURIComponent(koreaDate())}`);
    state.restaurants = data.restaurants || []; state.menus = data.menus || []; state.day = data.day || null; state.orders = data.orders || [];
    renderRestaurant(); renderOrders(); $("#connectionBanner").classList.add("hidden");
  } catch (e) {
    $("#connectionBanner").textContent = `데이터 연결 오류: ${e.message}`;
    $("#connectionBanner").classList.remove("hidden");
    if (!silent) toast("Supabase 연결을 확인해 주세요.");
  }
}
$("#eatBtn").onclick = () => { state.willEat = true; $("#eatBtn").classList.add("active"); $("#skipBtn").classList.remove("active"); $("#menuArea").classList.remove("hidden"); };
$("#skipBtn").onclick = () => { state.willEat = false; $("#skipBtn").classList.add("active"); $("#eatBtn").classList.remove("active"); $("#menuArea").classList.add("hidden"); };
$("#saveBtn").onclick = async () => {
  if (state.loading) return;
  const name = $("#nameInput").value.trim();
  if (!name) return toast("이름을 입력해 주세요.");
  if (!state.day) return toast("오늘의 식당이 아직 지정되지 않았습니다.");
  if (state.willEat && !state.selectedMenuId) return toast("메뉴를 선택해 주세요.");
  const btn = $("#saveBtn"); state.loading = true; btn.disabled = true; btn.textContent = "저장 중...";
  try {
    await api("", { method: "POST", body: JSON.stringify({ action: "submit_order", date: koreaDate(), name, will_eat: state.willEat, menu_id: state.willEat ? state.selectedMenuId : null, note: $("#noteInput").value.trim(), token: tokenFor(name) }) });
    localStorage.setItem("meal-last-name", name); $("#myState").textContent = "저장됨"; toast("주문이 저장되었습니다."); await refresh(true);
  } catch (e) {
    toast((e.status === 409 || e.message === "name_already_used") ? "같은 이름으로 이미 다른 기기에서 주문했습니다." : `저장 실패: ${e.message}`);
  } finally { state.loading = false; btn.disabled = false; btn.textContent = "주문 저장하기"; }
};
$("#adminToggle").onclick = () => $("#adminPanel").classList.toggle("hidden");
$("#applyBtn").onclick = async () => {
  const restaurantId = $("#restaurantSelect").value, cutoff = $("#cutoffInput").value || "17:40", pin = $("#pinInput").value.trim();
  if (!pin) return toast("관리자 PIN을 입력해 주세요.");
  const btn = $("#applyBtn"); btn.disabled = true; btn.textContent = "적용 중...";
  try {
    await api("", { method: "POST", body: JSON.stringify({ action: "admin_set_day", date: koreaDate(), restaurant_id: restaurantId, cutoff_time: cutoff, pin }) });
    $("#pinInput").value = ""; state.selectedMenuId = null; toast("오늘의 식당을 변경했습니다."); await refresh(true);
  } catch (e) { toast(e.message === "invalid_admin_pin" ? "관리자 PIN이 올바르지 않습니다." : `적용 실패: ${e.message}`); }
  finally { btn.disabled = false; btn.textContent = "오늘 식당 적용"; }
};

$("#dateText").textContent = displayDate();
const lastName = localStorage.getItem("meal-last-name"); if (lastName) $("#nameInput").value = lastName;
await refresh();
setInterval(() => refresh(true), 5000);
