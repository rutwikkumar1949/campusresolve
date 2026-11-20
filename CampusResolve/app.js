// CampusResolve application UI and local ticket workflow.
const DEPARTMENTS = window.CampusClassifier.DEPARTMENTS;
let tickets = loadTickets();
let lastAnalysis = null;

function loadTickets(){try{return JSON.parse(localStorage.getItem("cr_tickets")||"[]")}catch{return []}}
function save(){
  try { localStorage.setItem("cr_tickets",JSON.stringify(tickets)); }
  catch (err) { toast("Browser storage is full or unavailable. Export your tickets."); }
  renderAll();
}
function id(){return "CR-"+Date.now().toString().slice(-7)}
function analyse(){
  const text=document.getElementById("complaintText").value.trim();
  if(text.length<5){toast("Please enter a little more detail.");return}
  const start=performance.now(),r=window.CampusClassifier.classify(text),latency=(performance.now()-start).toFixed(2);
  const status=r.needsReview?"Needs review":"Routed";
  const t={id:id(),text,department:r.department,confidence:r.confidence,urgency:r.urgency,location:r.location,status,created:new Date().toISOString(),latency:Number(latency),cost:0,reporter:document.getElementById("reporter").value.trim()};
  tickets.unshift(t);save();lastAnalysis=t;showResult(t);
  document.getElementById("complaintText").value="";document.getElementById("charCount").textContent="0 / 1000";
  toast(status==="Routed"?"Complaint analysed and routed.":"Low confidence: sent to human review.");
}
function showResult(t){
  const el=document.getElementById("analysisResult");el.classList.remove("hidden");
  el.innerHTML=`<div class="result-head"><h3>Analysis complete</h3><span class="pill ${t.status==="Needs review"?"review":"low"}">${esc(t.status)}</span></div>
  <div class="result-grid"><div class="result-metric"><small>Department</small><strong>${esc(t.department)}</strong></div><div class="result-metric"><small>Confidence score</small><strong>${t.confidence}%</strong></div><div class="result-metric"><small>Urgency</small><strong>${esc(t.urgency)}</strong></div><div class="result-metric"><small>Latency</small><strong>${t.latency} ms</strong></div></div>
  <div class="extracted"><b>Extracted location:</b> ${esc(t.location.block)} · ${esc(t.location.floor)} · ${esc(t.location.room)}<br><b>Ticket ID:</b> ${esc(t.id)}<br><b>Estimated processing cost:</b> ₹0.00 (local rules; no paid API used)</div>`;
  el.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderAll(){renderStats();renderRecent();renderBars();renderTickets();renderReview();document.getElementById("reviewNavCount").textContent=tickets.filter(t=>t.status==="Needs review").length}
function renderStats(){
  document.getElementById("totalStat").textContent=tickets.length;
  document.getElementById("routedStat").textContent=tickets.filter(t=>t.status==="Routed"||t.status==="Resolved").length;
  document.getElementById("reviewStat").textContent=tickets.filter(t=>t.status==="Needs review").length;
  document.getElementById("urgentStat").textContent=tickets.filter(t=>t.urgency==="High").length;
}
function row(t){return `<div class="ticket-row"><span class="ticket-id">${esc(t.id)}</span><div class="ticket-info"><strong>${esc(t.text)}</strong><small>${esc(t.department)} · ${esc(t.location.block)} · ${new Date(t.created).toLocaleString()}</small></div><span class="pill ${t.status==="Needs review"?"review":""}">${esc(t.status)}</span></div>`}
function renderRecent(){const list=tickets.slice(0,5);document.getElementById("recentList").className="ticket-list"+(list.length?"":" empty");document.getElementById("recentList").innerHTML=list.length?list.map(row).join(""):"No complaints yet. Submit your first complaint to get started."}
function renderBars(){const counts=DEPARTMENTS.map(d=>[d,tickets.filter(t=>t.department===d).length]);const max=Math.max(1,...counts.map(x=>x[1]));document.getElementById("departmentChart").innerHTML=counts.map(([d,n])=>`<div class="bar-item"><span>${d}</span><div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div><b>${n}</b></div>`).join("")}
function renderTickets(){
 const q=(document.getElementById("ticketSearch")?.value||"").toLowerCase(),d=document.getElementById("deptFilter")?.value||"All",s=document.getElementById("statusFilter")?.value||"All";
 const list=tickets.filter(t=>(d==="All"||t.department===d)&&(s==="All"||t.status===s)&&(`${t.id} ${t.text} ${t.location.block} ${t.location.floor} ${t.location.room}`).toLowerCase().includes(q));
 document.getElementById("ticketTable").innerHTML=list.length?`<table><thead><tr><th>Ticket</th><th>Complaint</th><th>Department</th><th>Urgency</th><th>Confidence</th><th>Status</th></tr></thead><tbody>${list.map(t=>`<tr><td><strong>${esc(t.id)}</strong></td><td>${esc(t.text.slice(0,65))}${t.text.length>65?"…":""}<br><small>${esc(t.location.block)} · ${esc(t.location.floor)} · ${esc(t.location.room)}</small></td><td>${esc(t.department)}</td><td><span class="pill ${t.urgency.toLowerCase()}">${esc(t.urgency)}</span></td><td>${t.confidence}%</td><td><span class="pill ${t.status==="Needs review"?"review":""}">${esc(t.status)}</span></td></tr>`).join("")}</tbody></table>`:`<div class="empty-state">No matching complaints found.</div>`;
}
function renderReview(){
 const list=tickets.filter(t=>t.status==="Needs review");
 document.getElementById("reviewList").innerHTML=list.length?list.map(t=>`<article class="review-card"><div class="result-head"><b>${esc(t.id)} · ${esc(t.department)} suggested</b><span class="pill review">${t.confidence}% confidence</span></div><p>${esc(t.text)}</p><div class="extracted">Location: ${esc(t.location.block)} · ${esc(t.location.floor)} · ${esc(t.location.room)} &nbsp; | &nbsp; Urgency: ${esc(t.urgency)}</div><div class="review-actions" style="margin-top:13px"><select id="dept-${t.id}">${DEPARTMENTS.map(d=>`<option ${d===t.department?"selected":""}>${d}</option>`).join("")}</select><button onclick="approve('${t.id}')">Confirm & route</button></div></article>`).join(""):`<article class="panel empty-state">The review queue is clear. Low-confidence complaints will appear here.</article>`;
}
function approve(ticketId){const t=tickets.find(x=>x.id===ticketId);if(!t)return;t.department=document.getElementById("dept-"+ticketId).value;t.status="Routed";t.confidence=Math.max(t.confidence,60);save();toast("Human review saved. Ticket routed.");}
function exportCSV(){
 const headers=["Ticket ID","Complaint","Department","Urgency","Confidence","Block","Floor","Room","Status","Latency ms","Estimated cost INR","Created"];
 const rows=tickets.map(t=>[t.id,t.text,t.department,t.urgency,t.confidence,t.location.block,t.location.floor,t.location.room,t.status,t.latency,t.cost,t.created]);
 const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="campusresolve-tickets.csv";a.click();URL.revokeObjectURL(a.href);
}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2500)}
function go(page){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===page));document.getElementById("pageTitle").textContent=({dashboard:"Overview",new:"New complaint",tickets:"Ticket queue",review:"Human review"})[page];if(page==="tickets")renderTickets()}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
document.querySelectorAll(".example").forEach(b=>b.addEventListener("click",()=>{const t=document.getElementById("complaintText");t.value=b.dataset.example;document.getElementById("charCount").textContent=t.value.length+" / 1000"}));
document.getElementById("complaintText").addEventListener("input",e=>document.getElementById("charCount").textContent=e.target.value.length+" / 1000");
document.getElementById("analyseBtn").addEventListener("click",analyse);
["ticketSearch","deptFilter","statusFilter"].forEach(id=>document.getElementById(id).addEventListener("input",renderTickets));
document.getElementById("exportBtn").addEventListener("click",exportCSV);
document.getElementById("resetBtn").addEventListener("click",()=>{if(confirm("Delete all locally saved demo tickets?")){tickets=[];save();toast("Demo data cleared.")}});
document.getElementById("today").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short",year:"numeric"});
renderAll();
