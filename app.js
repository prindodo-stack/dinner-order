const SUPABASE_URL = "https://zyuybhszykxuafzriksn.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_3h3_2LRYgdyeXdoDO6XZMA_4jQrQTtV";
const API_URL = `${SUPABASE_URL}/functions/v1/meal-api`;

const $ = s => document.querySelector(s);
const state = { restaurants: [], menus: [], day: null, orders: [], selectedMenuId: null, willEat: true, loading: false };

function koreaDate(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=t=>parts.find(p=>p.type===t)?.value; return `${get("year")}-${get("month")}-${get("day")}`;
}
function displayDate(){return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"long",day:"numeric",weekday:"long"}).format(new Date())}
function money(n){return Number(n||0).toLocaleString("ko-KR")+"원"}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const el=$("#notice");el.textContent=msg;el.style.display="block";clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.style.display="none",2300)}
function adminPin(){return $("#pinInput").value.trim()}
function tokenFor(name){const key=`meal-token:${koreaDate()}:${name}`;let t=localStorage.getItem(key);if(!t){t=crypto.randomUUID();localStorage.setItem(key,t)}return t}
async function api(path="",options={}){
  const res=await fetch(API_URL+path,{...options,headers:{"apikey":PUBLISHABLE_KEY,"Content-Type":"application/json",...(options.headers||{})}});
  const data=await res.json().catch(()=>({})); if(!res.ok){const e=new Error(data.error||`HTTP ${res.status}`);e.status=res.status;throw e} return data;
}
function activeRestaurants(){return state.restaurants.filter(r=>r.active!==false)}
function activeMenus(){return state.menus.filter(m=>m.active!==false)}
function currentRestaurant(){return state.restaurants.find(r=>r.id===state.day?.restaurant_id)||null}
function currentMenus(){const r=currentRestaurant();return r?activeMenus().filter(m=>m.restaurant_id===r.id):[]}

function renderRestaurant(){
  const r=currentRestaurant();
  $("#restaurantName").textContent=r?r.name:"오늘의 식당 미지정";
  $("#restaurantDesc").textContent=r?r.description:"밥 당번이 오늘의 식당을 지정해 주세요.";
  $("#cutoffView").textContent=state.day?.cutoff_time?.slice(0,5)||"--:--";
  const grid=$("#menuGrid");grid.innerHTML="";
  const menus=currentMenus();
  if(!menus.length) grid.innerHTML='<div class="empty">선택할 수 있는 메뉴가 없습니다.</div>';
  else menus.forEach(m=>{const el=document.createElement("div");el.className="menu"+(state.selectedMenuId===m.id?" selected":"");el.innerHTML=`<div class="name">${escapeHtml(m.name)}</div><div class="price">${money(m.price)}</div>`;el.onclick=()=>{state.selectedMenuId=m.id;renderRestaurant()};grid.appendChild(el)});
  $("#restaurantSelect").innerHTML=activeRestaurants().map(r=>`<option value="${r.id}">${escapeHtml(r.name)}</option>`).join("");
  if(state.day?.restaurant_id) $("#restaurantSelect").value=state.day.restaurant_id;
  if(state.day?.cutoff_time) $("#cutoffInput").value=state.day.cutoff_time.slice(0,5);
}
function renderOrders(){
  const map=new Map(state.menus.map(m=>[m.id,m])),eaters=state.orders.filter(o=>o.will_eat),skippers=state.orders.filter(o=>!o.will_eat);
  $("#respondCount").textContent=`${state.orders.length}명 응답`;$("#eatCount").textContent=eaters.length;$("#skipCount").textContent=skippers.length;
  const counts={};eaters.forEach(o=>{const n=map.get(o.menu_id)?.name||"메뉴";counts[n]=(counts[n]||0)+1});$("#menuKinds").textContent=Object.keys(counts).length;
  $("#menuSummary").innerHTML=Object.entries(counts).map(([n,c])=>`<span class="menu-chip">${escapeHtml(n)} × ${c}</span>`).join("");
  $("#totalPrice").textContent=money(eaters.reduce((s,o)=>s+(map.get(o.menu_id)?.price||0),0));
  const wrap=$("#orders");wrap.innerHTML="";
  if(!state.orders.length){wrap.innerHTML='<div class="empty">아직 주문이 없습니다.</div>';return}
  state.orders.forEach(o=>{const menu=map.get(o.menu_id),row=document.createElement("div");row.className="order";row.innerHTML=`<div class="avatar">${escapeHtml(o.member_name.slice(0,1))}</div><div class="person">${escapeHtml(o.member_name)}</div><div>${o.will_eat?`<div class="dish">${escapeHtml(menu?.name||"메뉴")}</div>${o.note?`<div class="note">${escapeHtml(o.note)}</div>`:""}`:'<div class="dish" style="color:#d54c4c">오늘은 안 먹음</div>'}</div><div class="state ${o.will_eat?"eat":"skip"}">${o.will_eat?"주문":"미식사"}</div>`;wrap.appendChild(row)});
}
function renderEditor(){
  const wrap=$("#restaurantEditor");
  if(!wrap) return;
  wrap.innerHTML="";
  activeRestaurants().forEach(r=>{
    const menus=activeMenus().filter(m=>m.restaurant_id===r.id);
    const box=document.createElement("div");box.className="restaurant-block";
    box.innerHTML=`
      <div class="restaurant-row">
        <input class="restaurant-name" data-rname="${r.id}" value="${escapeHtml(r.name)}" placeholder="식당 이름">
        <input data-rdesc="${r.id}" value="${escapeHtml(r.description||"")}" placeholder="식당 설명">
        <button class="mini-btn save" data-rsave="${r.id}">저장</button>
        <button class="mini-btn danger" data-rdelete="${r.id}">삭제</button>
      </div>
      <div class="menu-editor">
        ${menus.map(m=>`<div class="menu-edit-row">
          <input data-mname="${m.id}" value="${escapeHtml(m.name)}" placeholder="메뉴명">
          <input data-mprice="${m.id}" type="number" min="0" step="500" value="${m.price}" placeholder="가격">
          <button class="mini-btn save" data-msave="${m.id}">저장</button>
          <button class="mini-btn danger" data-mdelete="${m.id}">삭제</button>
        </div>`).join("")}
      </div>
      <button class="add-menu-btn" data-madd="${r.id}">+ 메뉴 추가</button>`;
    wrap.appendChild(box);
  });
}
async function refresh(silent=false){
  try{const data=await api(`?date=${encodeURIComponent(koreaDate())}`);state.restaurants=data.restaurants||[];state.menus=data.menus||[];state.day=data.day||null;state.orders=data.orders||[];renderRestaurant();renderOrders();renderEditor();$("#connectionBanner").classList.add("hidden")}
  catch(e){$("#connectionBanner").textContent=`데이터 연결 오류: ${e.message}`;$("#connectionBanner").classList.remove("hidden");if(!silent)toast("Supabase 연결을 확인해 주세요.")}
}
async function adminAction(payload,success){
  const pin=adminPin();if(!pin)return toast("관리자 PIN을 입력해 주세요.");
  try{await api("",{method:"POST",body:JSON.stringify({...payload,pin})});toast(success);await refresh(true);return true}
  catch(e){toast(e.message==="invalid_admin_pin"?"관리자 PIN이 올바르지 않습니다.":`처리 실패: ${e.message}`);return false}
}

$("#eatBtn").onclick=()=>{state.willEat=true;$("#eatBtn").classList.add("active");$("#skipBtn").classList.remove("active");$("#menuArea").classList.remove("hidden")};
$("#skipBtn").onclick=()=>{state.willEat=false;$("#skipBtn").classList.add("active");$("#eatBtn").classList.remove("active");$("#menuArea").classList.add("hidden")};
$("#saveBtn").onclick=async()=>{
  if(state.loading)return;const name=$("#nameInput").value.trim();if(!name)return toast("이름을 입력해 주세요.");if(!state.day)return toast("오늘의 식당이 아직 지정되지 않았습니다.");if(state.willEat&&!state.selectedMenuId)return toast("메뉴를 선택해 주세요.");
  const btn=$("#saveBtn");state.loading=true;btn.disabled=true;btn.textContent="저장 중...";
  try{await api("",{method:"POST",body:JSON.stringify({action:"submit_order",date:koreaDate(),name,will_eat:state.willEat,menu_id:state.willEat?state.selectedMenuId:null,note:$("#noteInput").value.trim(),token:tokenFor(name)})});localStorage.setItem("meal-last-name",name);$("#myState").textContent="저장됨";toast("주문이 저장되었습니다.");await refresh(true)}
  catch(e){toast((e.status===409||e.message==="name_already_used")?"같은 이름으로 이미 다른 기기에서 주문했습니다.":`저장 실패: ${e.message}`)}
  finally{state.loading=false;btn.disabled=false;btn.textContent="주문 저장하기"}
};
if($("#adminToggle")) $("#adminToggle").onclick=()=>$("#adminPanel")?.classList.toggle("hidden");
if($("#applyBtn")) $("#applyBtn").onclick=async()=>{const ok=await adminAction({action:"admin_set_day",date:koreaDate(),restaurant_id:$("#restaurantSelect").value,cutoff_time:$("#cutoffInput").value||"17:40"},"오늘의 식당을 변경했습니다.");if(ok)state.selectedMenuId=null};
if($("#addRestaurantBtn")) $("#addRestaurantBtn").onclick=async()=>{const name=prompt("추가할 식당 이름을 입력하세요.");if(!name)return;const desc=prompt("식당 설명을 입력하세요. (선택)")||"";await adminAction({action:"admin_add_restaurant",name,description:desc},"식당을 추가했습니다.")};

if($("#restaurantEditor")) $("#restaurantEditor").addEventListener("click",async e=>{
  const t=e.target;
  if(t.dataset.rsave){const id=t.dataset.rsave;const name=document.querySelector(`[data-rname="${id}"]`).value.trim();const description=document.querySelector(`[data-rdesc="${id}"]`).value.trim();await adminAction({action:"admin_update_restaurant",id,name,description},"식당 정보를 저장했습니다.")}
  if(t.dataset.rdelete){if(!confirm("이 식당을 삭제할까요? 과거 주문에 사용된 식당은 비활성화됩니다."))return;await adminAction({action:"admin_delete_restaurant",id:t.dataset.rdelete},"식당을 삭제했습니다.")}
  if(t.dataset.msave){const id=t.dataset.msave;const name=document.querySelector(`[data-mname="${id}"]`).value.trim();const price=Number(document.querySelector(`[data-mprice="${id}"]`).value||0);await adminAction({action:"admin_update_menu",id,name,price},"메뉴를 저장했습니다.")}
  if(t.dataset.mdelete){if(!confirm("이 메뉴를 삭제할까요? 과거 주문에 사용된 메뉴는 비활성화됩니다."))return;await adminAction({action:"admin_delete_menu",id:t.dataset.mdelete},"메뉴를 삭제했습니다.")}
  if(t.dataset.madd){const name=prompt("추가할 메뉴 이름을 입력하세요.");if(!name)return;const price=Number(prompt("가격을 숫자로 입력하세요.","9000")||0);await adminAction({action:"admin_add_menu",restaurant_id:t.dataset.madd,name,price},"메뉴를 추가했습니다.")}
});

$("#dateText").textContent=displayDate();const lastName=localStorage.getItem("meal-last-name");if(lastName)$("#nameInput").value=lastName;
await refresh();setInterval(()=>refresh(true),5000);
