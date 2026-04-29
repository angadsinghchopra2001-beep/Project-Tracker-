/* ============================================
   PASSIONTRACK — DASHBOARD SCRIPT
   ============================================ */

'use strict';

// ─── DATA MODEL ─────────────────────────────
const SESSION_TEMPLATES = [
  { num: 1,  phase: 'Initiation',      name: 'Introduction to the Project; Understanding the Goal' },
  { num: 2,  phase: 'Initiation',      name: 'Defining Project Objectives and Scope' },
  { num: 3,  phase: 'Planning',        name: 'Research and Resource Planning' },
  { num: 4,  phase: 'Planning',        name: 'Timeline and Milestones' },
  { num: 5,  phase: 'Development',     name: 'Initial Development and Prototyping' },
  { num: 6,  phase: 'Development',     name: 'Coding / Building / Creating the Project' },
  { num: 7,  phase: 'Development',     name: 'Testing and Refining' },
  { num: 8,  phase: 'Development',     name: 'Feature Enhancement or Adjustments' },
  { num: 9,  phase: 'Implementation',  name: 'Preparing for Implementation or Launch' },
  { num: 10, phase: 'Implementation',  name: 'Finalizing Implementation / Production' },
  { num: 11, phase: 'Implementation',  name: 'Post-Implementation Review and Adjustments' },
  { num: 12, phase: 'Evaluation',      name: 'Final Evaluation and Review' },
];

const DEFAULT_CHECKLIST = [
  'Research Completed',
  'Idea Validation Done',
  'Literature Review Done',
  'Planning Completed',
  'Prototype Started',
  'Prototype Tested',
  'Documentation Updated',
  'Presentation Prepared',
  'Final Review Done',
  'Submission Ready',
];

const PHASE_COLORS = {
  Initiation: 'initiation',
  Planning: 'planning',
  Development: 'development',
  Implementation: 'implementation',
  Evaluation: 'evaluation',
};

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#f43f5e','#06b6d4','#ec4899','#84cc16'];

// ─── STATE ──────────────────────────────────
let state = {
  students: [],
  currentStudentId: null,
};

// ─── INIT ────────────────────────────────────
function init() {
  loadFromStorage();
  renderDashboard();
  renderStudentTable();
  renderAnalytics();
  updateSummaryCards();
}

// ─── STORAGE ────────────────────────────────
let _memoryStorage = null; // fallback when localStorage unavailable

function saveToStorage() {
  const data = JSON.stringify(state);
  try {
    localStorage.setItem('passiontrack_v2', data);
    _memoryStorage = data; // keep in sync
  } catch(e) {
    _memoryStorage = data; // fallback to memory
    console.warn('PassionTrack: localStorage unavailable, using in-memory storage (data will not persist on reload):', e.message);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem('passiontrack_v2') || _memoryStorage;
    if (raw) state = JSON.parse(raw);
  } catch(e) {
    console.warn('PassionTrack: failed to load from storage:', e);
  }
}

// ─── NAVIGATION ──────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === name);
  });
  if (name === 'analytics') renderAnalytics();
  if (name === 'students') renderStudentTable();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); showView(item.dataset.view); });
});

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── STUDENT MANAGEMENT ──────────────────────
function generateId() { return 'stu_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

function createNewStudent() {
  try {
    const name = document.getElementById('mStudentName').value.trim();
    const project = document.getElementById('mProjectName').value.trim();
    if (!name || !project) { toast('Please enter student name and project name', 'error'); return; }

    const id = generateId();
    const student = {
      id,
      name,
      studentId: document.getElementById('mStudentId').value.trim(),
      grade: document.getElementById('mGrade').value,
      section: '',
      school: '',
      email: '',
      mentor: document.getElementById('mMentor').value.trim(),
      parentName: '',
      parentContact: '',
      projectName: project,
      category: document.getElementById('mCategory').value,
      description: '',
      goal: '',
      startDate: '',
      endDate: '',
      status: 'Not Started',
      progress: 0,
      sessions: SESSION_TEMPLATES.map(s => ({
        num: s.num,
        phase: s.phase,
        name: s.name,
        date: '',
        objective: '',
        topicsCovered: '',
        studentInput: '',
        progressNotes: '',
        studentStatus: 'Pending',
        tat: '',
        mentorFeedback: '',
        challenges: '',
        solutions: '',
        resources: '',
        links: '',
        files: '',
        milestone: '',
        nextStep: '',
        pendingTasks: '',
        completionStatus: false,
        remarks: '',
        mentorApproved: false,
        checklist: DEFAULT_CHECKLIST.map(label => ({ label, checked: false })),
      })),
      milestones: [],
      createdAt: Date.now(),
    };

    state.students.push(student);
    saveToStorage();
    closeModal('newStudentModal');
    clearModal();
    showView('dashboard');
    renderDashboard();
    renderStudentTable();
    updateSummaryCards();
    toast(`Student "${name}" created successfully`, 'success');
  } catch(err) {
    console.error('PassionTrack: createNewStudent error:', err);
    toast('Error creating student: ' + err.message, 'error');
  }
}

function clearModal() {
  ['mStudentName','mStudentId','mProjectName','mMentor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['mGrade','mCategory'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
}

function deleteStudent(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Delete this student? This cannot be undone.')) return;
  state.students = state.students.filter(s => s.id !== id);
  if (state.currentStudentId === id) state.currentStudentId = null;
  saveToStorage();
  renderDashboard();
  renderStudentTable();
  updateSummaryCards();
  renderAnalytics();
  toast('Student deleted', '');
}

function openStudent(id) {
  state.currentStudentId = id;
  const s = getStudent(id);
  if (!s) return;
  loadProfileForm(s);
  renderSessionsView(s);
  renderMilestonesView(s);
  updateProgressRing(s.progress, s.status);
  updateSessionStats(s);
  document.getElementById('sessionsStudentName').textContent = s.name + ' — ' + s.projectName;
  document.getElementById('milestonesStudentName').textContent = s.name + ' — Milestones';
  document.getElementById('profileTitle').textContent = s.name;
  showView('profile');
}

function getStudent(id) { return state.students.find(s => s.id === id); }

// ─── PROFILE FORM ────────────────────────────
function loadProfileForm(s) {
  const fields = {
    pStudentName: s.name, pStudentId: s.studentId, pGrade: s.grade,
    pSection: s.section, pSchool: s.school, pEmail: s.email,
    pMentor: s.mentor, pParentName: s.parentName, pParentContact: s.parentContact,
    pProjectName: s.projectName, pCategory: s.category, pDescription: s.description,
    pGoal: s.goal, pStartDate: s.startDate, pEndDate: s.endDate,
    pStatus: s.status,
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  });
  document.getElementById('pProgress').value = s.progress || 0;
  document.getElementById('progressVal').textContent = s.progress || 0;
}

function saveCurrentStudent() {
  const s = getStudent(state.currentStudentId);
  if (!s) { toast('No student selected', 'error'); return; }

  s.name = document.getElementById('pStudentName').value.trim() || s.name;
  s.studentId = document.getElementById('pStudentId').value.trim();
  s.grade = document.getElementById('pGrade').value;
  s.section = document.getElementById('pSection').value.trim();
  s.school = document.getElementById('pSchool').value.trim();
  s.email = document.getElementById('pEmail').value.trim();
  s.mentor = document.getElementById('pMentor').value.trim();
  s.parentName = document.getElementById('pParentName').value.trim();
  s.parentContact = document.getElementById('pParentContact').value.trim();
  s.projectName = document.getElementById('pProjectName').value.trim() || s.projectName;
  s.category = document.getElementById('pCategory').value;
  s.description = document.getElementById('pDescription').value.trim();
  s.goal = document.getElementById('pGoal').value.trim();
  s.startDate = document.getElementById('pStartDate').value;
  s.endDate = document.getElementById('pEndDate').value;
  s.status = document.getElementById('pStatus').value;
  s.progress = parseInt(document.getElementById('pProgress').value) || 0;

  document.getElementById('profileTitle').textContent = s.name;
  updateProgressRing(s.progress, s.status);
  updateSessionStats(s);

  saveToStorage();
  renderDashboard();
  renderStudentTable();
  updateSummaryCards();
  toast('Profile saved successfully', 'success');
}

// ─── PROGRESS RING ────────────────────────────
function updateProgressRing(pct, status) {
  const circ = 2 * Math.PI * 65;
  const offset = circ - (pct / 100) * circ;
  const circle = document.getElementById('progressRingCircle');
  if (circle) {
    circle.style.strokeDashoffset = offset;
    const colors = { Completed: '#10b981', 'In Progress': '#3b82f6', 'Under Review': '#f59e0b', 'On Hold': '#f43f5e', 'Not Started': '#4b6480' };
    circle.style.stroke = colors[status] || '#3b82f6';
  }
  const ringPct = document.getElementById('ringPct');
  if (ringPct) ringPct.textContent = pct + '%';
  const ringStatus = document.getElementById('ringStatus');
  if (ringStatus) {
    ringStatus.textContent = status;
    ringStatus.className = 'status-badge ' + statusClass(status);
  }
}

function updateSessionStats(s) {
  const done = s.sessions.filter(ss => ss.completionStatus).length;
  document.getElementById('sessionsDoneCount').textContent = done + ' / 12';
  const tats = s.sessions.map(ss => parseFloat(ss.tat)).filter(t => !isNaN(t));
  document.getElementById('avgTatDisplay').textContent = tats.length ? (tats.reduce((a,b)=>a+b,0)/tats.length).toFixed(1) + ' hrs' : '— hrs';
  document.getElementById('milestonesCount').textContent = (s.milestones || []).length;
}

// ─── SESSIONS VIEW ────────────────────────────
function renderSessionsView(s) {
  renderTimeline(s);
  const grid = document.getElementById('sessionsGrid');
  grid.innerHTML = '';
  s.sessions.forEach((sess, i) => {
    grid.appendChild(buildSessionCard(s, sess, i));
  });
}

function renderTimeline(s) {
  const tl = document.getElementById('sessionTimeline');
  tl.innerHTML = '';
  s.sessions.forEach((sess, i) => {
    const node = document.createElement('div');
    node.className = 'timeline-node';
    const dotClass = sess.completionStatus ? 'completed' : (sess.studentStatus === 'In Progress' ? 'in-progress' : 'pending');
    node.innerHTML = `
      <div class="timeline-dot ${dotClass}" onclick="scrollToSession(${i})">${i+1}</div>
      <div class="timeline-label">S${i+1}</div>
      <div class="timeline-phase">${sess.phase.slice(0,4)}</div>
    `;
    tl.appendChild(node);
  });
}

function scrollToSession(index) {
  const cards = document.querySelectorAll('.session-card');
  if (cards[index]) {
    cards[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    cards[index].classList.add('open');
  }
}

function buildSessionCard(s, sess, i) {
  const card = document.createElement('div');
  card.className = 'session-card';
  card.id = `session-card-${i}`;

  const phaseClass = 'phase-' + sess.phase.toLowerCase();
  const checklistHtml = buildChecklistHtml(sess, i);

  card.innerHTML = `
    <div class="session-header" onclick="toggleSession(${i})">
      <div class="session-num ${phaseClass}">${sess.num}</div>
      <div class="session-meta">
        <h4>${sess.name}</h4>
        <p>${sess.phase} &nbsp;·&nbsp; <span id="sess-status-label-${i}">${sess.studentStatus}</span></p>
      </div>
      <div class="session-header-right">
        <span class="status-badge ${sessionStatusClass(sess.studentStatus)}" id="sess-badge-${i}">${sess.studentStatus}</span>
        <span class="chevron">▾</span>
      </div>
    </div>
    <div class="session-body">
      <div class="session-form-grid">
        <div class="form-group">
          <label>Session Date</label>
          <input type="date" value="${sess.date||''}" onchange="updateSession(${i},'date',this.value)" />
        </div>
        <div class="form-group">
          <label>TAT (Hours)</label>
          <input type="number" step="0.5" min="0" placeholder="e.g. 2.5" value="${sess.tat||''}" onchange="updateSession(${i},'tat',this.value)" />
        </div>
        <div class="form-group">
          <label>Student Status</label>
          <select onchange="updateSession(${i},'studentStatus',this.value); updateSessionBadge(${i},this.value)">
            ${['Pending','Started','In Progress','Review Pending','Completed'].map(o=>`<option ${sess.studentStatus===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div>
        <div class="form-group span-3">
          <label>Session Objective</label>
          <input type="text" placeholder="What is the goal of this session?" value="${esc(sess.objective||'')}" onchange="updateSession(${i},'objective',this.value)" />
        </div>
        <div class="form-group span-3">
          <label>Topics Covered</label>
          <textarea rows="2" placeholder="Topics discussed and covered…" onchange="updateSession(${i},'topicsCovered',this.value)">${esc(sess.topicsCovered||'')}</textarea>
        </div>
        <div class="form-group span-3">
          <label>Student Input / Work Done</label>
          <textarea rows="2" placeholder="What the student contributed or submitted…" onchange="updateSession(${i},'studentInput',this.value)">${esc(sess.studentInput||'')}</textarea>
        </div>
        <div class="form-group span-3">
          <label>Student Progress Notes</label>
          <textarea rows="2" placeholder="Notes on student progress this session…" onchange="updateSession(${i},'progressNotes',this.value)">${esc(sess.progressNotes||'')}</textarea>
        </div>
        <div class="form-group span-3">
          <label>Mentor Feedback</label>
          <textarea rows="2" placeholder="Mentor comments and feedback…" onchange="updateSession(${i},'mentorFeedback',this.value)">${esc(sess.mentorFeedback||'')}</textarea>
        </div>
        <div class="form-group span-2">
          <label>Challenges Faced</label>
          <textarea rows="2" placeholder="Obstacles encountered…" onchange="updateSession(${i},'challenges',this.value)">${esc(sess.challenges||'')}</textarea>
        </div>
        <div class="form-group">
          <label>Solutions Suggested</label>
          <textarea rows="2" placeholder="How to overcome challenges…" onchange="updateSession(${i},'solutions',this.value)">${esc(sess.solutions||'')}</textarea>
        </div>
        <div class="form-group span-2">
          <label>Resources Shared</label>
          <input type="text" placeholder="Books, papers, tools shared…" value="${esc(sess.resources||'')}" onchange="updateSession(${i},'resources',this.value)" />
        </div>
        <div class="form-group">
          <label>Important Links</label>
          <input type="text" placeholder="URLs, references…" value="${esc(sess.links||'')}" onchange="updateSession(${i},'links',this.value)" />
        </div>
        <div class="form-group span-2">
          <label>Milestone Achieved</label>
          <input type="text" placeholder="Key milestone reached in this session…" value="${esc(sess.milestone||'')}" onchange="updateSession(${i},'milestone',this.value)" />
        </div>
        <div class="form-group">
          <label>Files / References</label>
          <input type="text" placeholder="File names or references…" value="${esc(sess.files||'')}" onchange="updateSession(${i},'files',this.value)" />
        </div>
        <div class="form-group span-2">
          <label>Next Step Planning</label>
          <textarea rows="2" placeholder="Plan for the next session…" onchange="updateSession(${i},'nextStep',this.value)">${esc(sess.nextStep||'')}</textarea>
        </div>
        <div class="form-group">
          <label>Pending Tasks</label>
          <textarea rows="2" placeholder="Tasks yet to be completed…" onchange="updateSession(${i},'pendingTasks',this.value)">${esc(sess.pendingTasks||'')}</textarea>
        </div>
        <div class="form-group span-3">
          <label>Remarks</label>
          <input type="text" placeholder="Additional notes…" value="${esc(sess.remarks||'')}" onchange="updateSession(${i},'remarks',this.value)" />
        </div>
        <div class="form-group span-3">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" ${sess.completionStatus?'checked':''} onchange="updateSession(${i},'completionStatus',this.checked);refreshTimeline()" />
            Mark Session as Completed
          </label>
        </div>
      </div>
      ${checklistHtml}
      <div class="mentor-approval" onclick="toggleMentorApproval(${i},this)">
        <input type="checkbox" id="mentor-approve-${i}" ${sess.mentorApproved?'checked':''} onchange="updateSession(${i},'mentorApproved',this.checked)" />
        <label for="mentor-approve-${i}">✓ Mentor Approved this Session</label>
      </div>
    </div>
  `;
  return card;
}

function buildChecklistHtml(sess, si) {
  const items = sess.checklist || DEFAULT_CHECKLIST.map(l => ({ label: l, checked: false }));
  const itemsHtml = items.map((item, ci) => `
    <div class="check-item ${item.checked ? 'checked' : ''}" onclick="toggleCheck(${si},${ci},this)">
      <input type="checkbox" ${item.checked ? 'checked' : ''} style="display:none" />
      <div class="check-icon"></div>
      ${esc(item.label)}
    </div>
  `).join('');

  return `
    <div class="checklist-section">
      <div class="checklist-title">Session Checklist</div>
      <div class="checklist-grid">${itemsHtml}</div>
      <div class="add-checklist-wrap">
        <input type="text" placeholder="Add custom checklist item…" id="custom-check-${si}" />
        <button class="btn-secondary btn-sm" onclick="addCustomCheck(${si})">+ Add</button>
      </div>
    </div>
  `;
}

function toggleSession(i) {
  const card = document.querySelector(`#session-card-${i}`);
  if (card) card.classList.toggle('open');
}

function updateSession(i, field, value) {
  const s = getStudent(state.currentStudentId);
  if (!s) return;
  s.sessions[i][field] = value;
  saveToStorage();
}

function updateSessionBadge(i, value) {
  const badge = document.getElementById(`sess-badge-${i}`);
  if (badge) { badge.textContent = value; badge.className = 'status-badge ' + sessionStatusClass(value); }
  const label = document.getElementById(`sess-status-label-${i}`);
  if (label) label.textContent = value;
}

function toggleMentorApproval(i, wrap) {
  const cb = document.getElementById(`mentor-approve-${i}`);
  if (cb) { cb.checked = !cb.checked; updateSession(i, 'mentorApproved', cb.checked); }
}

function toggleCheck(si, ci, el) {
  const s = getStudent(state.currentStudentId);
  if (!s) return;
  s.sessions[si].checklist[ci].checked = !s.sessions[si].checklist[ci].checked;
  el.classList.toggle('checked', s.sessions[si].checklist[ci].checked);
  saveToStorage();
}

function addCustomCheck(si) {
  const input = document.getElementById(`custom-check-${si}`);
  const label = input.value.trim();
  if (!label) return;
  const s = getStudent(state.currentStudentId);
  if (!s) return;
  s.sessions[si].checklist.push({ label, checked: false });
  saveToStorage();
  const grid = document.querySelector(`#session-card-${si} .checklist-grid`);
  if (grid) {
    const ci = s.sessions[si].checklist.length - 1;
    const div = document.createElement('div');
    div.className = 'check-item';
    div.onclick = function() { toggleCheck(si, ci, this); };
    div.innerHTML = `<div class="check-icon"></div>${esc(label)}`;
    grid.appendChild(div);
  }
  input.value = '';
}

function saveAllSessions() {
  saveToStorage();
  updateSessionStats(getStudent(state.currentStudentId));
  refreshTimeline();
  toast('Sessions saved', 'success');
}

function refreshTimeline() {
  const s = getStudent(state.currentStudentId);
  if (s) renderTimeline(s);
}

// ─── MILESTONES ──────────────────────────────
function renderMilestonesView(s) {
  ['todo','inprogress','review','done'].forEach(col => {
    document.getElementById(`items-${col}`).innerHTML = '';
  });
  (s.milestones || []).forEach((m, i) => {
    const col = milestoneCol(m.status);
    const colEl = document.getElementById(`items-${col}`);
    colEl.appendChild(buildKanbanCard(m, i));
  });
}

function milestoneCol(status) {
  const map = { 'To Do': 'todo', 'In Progress': 'inprogress', 'Review': 'review', 'Done': 'done' };
  return map[status] || 'todo';
}

function buildKanbanCard(m, i) {
  const card = document.createElement('div');
  card.className = 'kanban-card';
  const overdue = m.deadline && new Date(m.deadline) < new Date() && m.status !== 'Done';
  card.innerHTML = `
    <button class="kc-delete" onclick="deleteMilestone(${i})">✕</button>
    <div class="kc-name">${esc(m.name)}</div>
    <div class="kc-deadline ${overdue ? 'overdue' : ''}">📅 ${m.deadline || 'No deadline'}${overdue ? ' · OVERDUE' : ''}</div>
    <div class="priority-tag ${m.priority.toLowerCase()}">${m.priority} Priority</div>
    <div class="kc-progress">
      <div class="kc-progress-label">${m.progress}% Complete</div>
      <div class="kc-progress-bar"><div class="kc-progress-fill" style="width:${m.progress}%"></div></div>
    </div>
    ${m.remarks ? `<div style="font-size:11px;color:var(--text3);margin-top:8px">${esc(m.remarks)}</div>` : ''}
  `;
  return card;
}

function addMilestone() {
  if (!state.currentStudentId) { toast('Open a student first', 'error'); return; }
  document.getElementById('milestoneModal').classList.add('open');
}

function saveMilestone() {
  const name = document.getElementById('mMilestoneName').value.trim();
  if (!name) { toast('Enter milestone name', 'error'); return; }
  const s = getStudent(state.currentStudentId);
  if (!s) return;
  const m = {
    name,
    deadline: document.getElementById('mMilestoneDeadline').value,
    priority: document.getElementById('mMilestonePriority').value,
    progress: parseInt(document.getElementById('mMilestoneProgress').value) || 0,
    status: document.getElementById('mMilestoneStatus').value,
    remarks: document.getElementById('mMilestoneRemarks').value.trim(),
  };
  s.milestones = s.milestones || [];
  s.milestones.push(m);
  saveToStorage();
  renderMilestonesView(s);
  updateSessionStats(s);
  closeModal('milestoneModal');
  toast('Milestone added', 'success');
}

function deleteMilestone(i) {
  const s = getStudent(state.currentStudentId);
  if (!s) return;
  s.milestones.splice(i, 1);
  saveToStorage();
  renderMilestonesView(s);
  updateSessionStats(s);
}

// ─── DASHBOARD RENDER ─────────────────────────
function renderDashboard() {
  const list = document.getElementById('studentCardsList');
  const empty = document.getElementById('emptyState');

  let filtered = filterStudents();

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.add('visible');
    updatePhaseDist([]);
    updateAlerts([]);
    return;
  }

  empty.classList.remove('visible');
  list.innerHTML = filtered.map(s => buildStudentRow(s)).join('');
  updatePhaseDist(filtered);
  updateAlerts(filtered);
  buildCategoryPills();
}

function buildStudentRow(s) {
  const initials = s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const color = AVATAR_COLORS[Math.abs(hashCode(s.id)) % AVATAR_COLORS.length];
  const done = s.sessions.filter(ss => ss.completionStatus).length;
  return `
    <div class="student-row" onclick="openStudent('${s.id}')">
      <div class="student-avatar" style="background:${color}">${initials}</div>
      <div class="student-info">
        <h4>${esc(s.name)}</h4>
        <p>${esc(s.projectName)} &nbsp;·&nbsp; ${s.grade || '—'}</p>
      </div>
      <div class="student-category-tag">${esc(s.category || 'Uncategorized')}</div>
      <div class="mini-progress">
        <div class="mini-bar"><div class="mini-bar-fill" style="width:${s.progress||0}%"></div></div>
        <span class="mini-pct">${s.progress||0}% &nbsp;·&nbsp; ${done}/12 sessions</span>
      </div>
      <div class="student-row-actions">
        <span class="status-badge ${statusClass(s.status)}">${s.status}</span>
        <button class="icon-btn danger" onclick="deleteStudent('${s.id}',event)" title="Delete">✕</button>
      </div>
    </div>
  `;
}

function buildCategoryPills() {
  const pills = document.getElementById('categoryFilter');
  const cats = [...new Set(state.students.map(s => s.category).filter(Boolean))];
  pills.innerHTML = `<button class="pill ${!currentCategory ? 'active' : ''}" onclick="filterByCategory('')">All</button>`;
  cats.forEach(cat => {
    pills.innerHTML += `<button class="pill ${currentCategory===cat ? 'active' : ''}" onclick="filterByCategory('${cat}')">${cat}</button>`;
  });
}

let currentCategory = '';
function filterByCategory(cat) {
  currentCategory = cat;
  renderDashboard();
}

function filterStudents() {
  const search = (document.getElementById('searchInput').value || '').toLowerCase();
  const grade = document.getElementById('filterGrade').value;
  const status = document.getElementById('filterStatus').value;
  return state.students.filter(s => {
    if (search && !s.name.toLowerCase().includes(search) && !s.projectName.toLowerCase().includes(search)) return false;
    if (grade && s.grade !== grade) return false;
    if (status && s.status !== status) return false;
    if (currentCategory && s.category !== currentCategory) return false;
    return true;
  });
}

function handleSearch() { renderDashboard(); }
function applyFilters() { renderDashboard(); }

function updateSummaryCards() {
  const s = state.students;
  document.getElementById('totalStudents').textContent = s.length;
  document.getElementById('completedProjects').textContent = s.filter(x => x.status === 'Completed').length;
  document.getElementById('inProgressProjects').textContent = s.filter(x => x.status === 'In Progress').length;
  const alerts = s.filter(x => x.endDate && new Date(x.endDate) < new Date() && x.status !== 'Completed').length;
  document.getElementById('pendingAlerts').textContent = alerts;
}

function updateAlerts(students) {
  const list = document.getElementById('alertsList');
  const alerts = students.filter(s => s.endDate && new Date(s.endDate) < new Date() && s.status !== 'Completed');
  if (!alerts.length) { list.innerHTML = '<div class="no-alerts">✅ All caught up!</div>'; return; }
  list.innerHTML = alerts.map(s => `
    <div class="alert-item">⚠️ <strong>${esc(s.name)}</strong> — Project overdue (${s.endDate})</div>
  `).join('');
}

function updatePhaseDist(students) {
  const phases = ['Initiation','Planning','Development','Implementation','Evaluation'];
  const phaseColors = { Initiation:'#3b82f6', Planning:'#8b5cf6', Development:'#10b981', Implementation:'#f59e0b', Evaluation:'#f43f5e' };
  const totals = {};
  phases.forEach(p => totals[p] = 0);
  let total = 0;
  students.forEach(s => {
    s.sessions.forEach(sess => {
      if (sess.completionStatus) { totals[sess.phase] = (totals[sess.phase]||0)+1; total++; }
    });
  });
  const div = document.getElementById('phaseDist');
  div.innerHTML = phases.map(p => `
    <div class="phase-row">
      <div class="phase-row-header"><span>${p}</span><span>${totals[p]||0}</span></div>
      <div class="phase-bar"><div class="phase-bar-fill" style="width:${total?((totals[p]||0)/total*100):0}%;background:${phaseColors[p]}"></div></div>
    </div>
  `).join('');
}

// ─── STUDENT TABLE ────────────────────────────
function renderStudentTable() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;
  if (!state.students.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text2)">No students yet</td></tr>'; return; }
  tbody.innerHTML = state.students.map(s => {
    const done = s.sessions.filter(ss => ss.completionStatus).length;
    const initials = s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const color = AVATAR_COLORS[Math.abs(hashCode(s.id)) % AVATAR_COLORS.length];
    return `
      <tr>
        <td>
          <div class="table-student-info">
            <div class="student-avatar" style="background:${color};width:32px;height:32px;font-size:12px">${initials}</div>
            <div>
              <div style="font-weight:600">${esc(s.name)}</div>
              <div style="font-size:11px;color:var(--text2)">${s.studentId || '—'}</div>
            </div>
          </div>
        </td>
        <td>${s.grade || '—'}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.projectName)}</td>
        <td><span class="student-category-tag">${esc(s.category||'—')}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="mini-bar" style="width:80px"><div class="mini-bar-fill" style="width:${s.progress||0}%"></div></div>
            <span style="font-size:12px;color:var(--text2)">${s.progress||0}%</span>
          </div>
        </td>
        <td><span class="status-badge ${statusClass(s.status)}">${s.status}</span></td>
        <td style="text-align:center">${done} / 12</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="icon-btn" onclick="openStudent('${s.id}')" title="Open">✎</button>
            <button class="icon-btn danger" onclick="deleteStudent('${s.id}',event)" title="Delete">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── ANALYTICS ───────────────────────────────
function renderAnalytics() {
  renderPhaseBarChart();
  renderStatusDonut();
  renderStudentProgressBars();
  renderCategoryBars();
  renderTATSummary();
}

function renderPhaseBarChart() {
  const phases = ['Initiation','Planning','Development','Implementation','Evaluation'];
  const totals = {}; const completed = {};
  phases.forEach(p => { totals[p] = 0; completed[p] = 0; });
  state.students.forEach(s => s.sessions.forEach(sess => {
    totals[sess.phase]++;
    if (sess.completionStatus) completed[sess.phase]++;
  }));
  const chart = document.getElementById('phaseBarChart');
  chart.innerHTML = phases.map(p => {
    const pct = totals[p] ? Math.round(completed[p]/totals[p]*100) : 0;
    return `
      <div class="bar-row">
        <div class="bar-row-label"><span>${p}</span><span>${completed[p]}/${totals[p]} (${pct}%)</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderStatusDonut() {
  const statuses = ['Not Started','In Progress','Under Review','Completed','On Hold'];
  const colors = ['#4b6480','#3b82f6','#f59e0b','#10b981','#f43f5e'];
  const counts = {};
  statuses.forEach(s => counts[s] = 0);
  state.students.forEach(s => counts[s.status] = (counts[s.status]||0)+1);
  const chart = document.getElementById('statusDonut');
  chart.innerHTML = statuses.map((s,i) => `
    <div class="donut-legend-item">
      <div class="legend-label"><div class="legend-dot" style="background:${colors[i]}"></div>${s}</div>
      <div class="legend-count">${counts[s]||0}</div>
    </div>
  `).join('');
}

function renderStudentProgressBars() {
  const el = document.getElementById('studentProgressBars');
  if (!state.students.length) { el.innerHTML = '<p style="color:var(--text2);font-size:13px">No students yet</p>'; return; }
  el.innerHTML = state.students.map(s => {
    const done = s.sessions.filter(ss => ss.completionStatus).length;
    const pct = Math.round(done/12*100);
    return `
      <div class="bar-row" style="margin-bottom:10px">
        <div class="bar-row-label"><span>${esc(s.name)}</span><span>${done}/12 sessions &nbsp; ${s.progress||0}% progress</span></div>
        <div class="bar-bg"><div class="bar-fill" style="width:${s.progress||0}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderCategoryBars() {
  const el = document.getElementById('categoryBars');
  const cats = {};
  state.students.forEach(s => cats[s.category||'Uncategorized'] = (cats[s.category||'Uncategorized']||0)+1);
  const max = Math.max(...Object.values(cats), 1);
  el.innerHTML = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([cat,cnt]) => `
    <div class="bar-row" style="margin-bottom:8px">
      <div class="bar-row-label"><span style="font-size:12px">${cat}</span><span>${cnt}</span></div>
      <div class="bar-bg"><div class="bar-fill" style="width:${cnt/max*100}%"></div></div>
    </div>
  `).join('') || '<p style="color:var(--text2);font-size:13px">No data</p>';
}

function renderTATSummary() {
  const el = document.getElementById('tatSummary');
  let totalSessions = 0, totalTat = 0;
  state.students.forEach(s => s.sessions.forEach(sess => {
    const t = parseFloat(sess.tat);
    if (!isNaN(t)) { totalTat += t; totalSessions++; }
  }));
  el.innerHTML = `
    <div class="bar-row"><div class="bar-row-label"><span>Total Sessions Logged</span><span>${totalSessions}</span></div></div>
    <div class="bar-row"><div class="bar-row-label"><span>Total Hours Logged</span><span>${totalTat.toFixed(1)} hrs</span></div></div>
    <div class="bar-row"><div class="bar-row-label"><span>Average TAT per Session</span><span>${totalSessions ? (totalTat/totalSessions).toFixed(1) : '—'} hrs</span></div></div>
    <div class="bar-row"><div class="bar-row-label"><span>Total Students</span><span>${state.students.length}</span></div></div>
    <div class="bar-row"><div class="bar-row-label"><span>Total Projects</span><span>${state.students.length}</span></div></div>
  `;
}

// ─── EXPORT ──────────────────────────────────
function exportToExcel() {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Student Name','Student ID','Grade','Section','School','Mentor','Project Name','Category','Status','Progress %','Start Date','End Date'],
    ...state.students.map(s => [s.name, s.studentId, s.grade, s.section, s.school, s.mentor, s.projectName, s.category, s.status, s.progress, s.startDate, s.endDate])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

  // Sessions sheet per student
  state.students.forEach(s => {
    const rows = [
      ['Session No.','Phase','Session Name','Date','Objective','Topics Covered','Student Input','Progress Notes','Student Status','TAT (hrs)','Mentor Feedback','Challenges','Solutions','Resources','Links','Milestone','Next Step','Pending Tasks','Completed','Remarks','Mentor Approved'],
      ...s.sessions.map(sess => [sess.num, sess.phase, sess.name, sess.date, sess.objective, sess.topicsCovered, sess.studentInput, sess.progressNotes, sess.studentStatus, sess.tat, sess.mentorFeedback, sess.challenges, sess.solutions, sess.resources, sess.links, sess.milestone, sess.nextStep, sess.pendingTasks, sess.completionStatus ? 'Yes' : 'No', sess.remarks, sess.mentorApproved ? 'Yes' : 'No'])
    ];
    const name = s.name.slice(0,28).replace(/[^a-zA-Z0-9 ]/g,'');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name || 'Student');
  });

  XLSX.writeFile(wb, `PassionTrack_Export_${today()}.xlsx`);
  toast('Excel exported', 'success');
}

function exportToCSV() {
  const rows = [
    ['Student Name','Student ID','Grade','Project Name','Category','Status','Progress %','Sessions Done'],
    ...state.students.map(s => {
      const done = s.sessions.filter(ss => ss.completionStatus).length;
      return [s.name, s.studentId, s.grade, s.projectName, s.category, s.status, s.progress, done];
    })
  ];
  const csv = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  download(`PassionTrack_${today()}.csv`, csv, 'text/csv');
  toast('CSV exported', 'success');
}

function download(filename, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
}

function today() { return new Date().toISOString().slice(0,10); }

// ─── MODALS ──────────────────────────────────
function showNewStudentModal() {
  document.getElementById('newStudentModal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ─── TOAST ───────────────────────────────────
let toastTimer;
function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ─── HELPERS ─────────────────────────────────
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function statusClass(status) {
  const map = { 'Not Started':'not-started', 'In Progress':'in-progress', 'Under Review':'under-review', 'Completed':'completed', 'On Hold':'on-hold' };
  return map[status] || 'not-started';
}

function sessionStatusClass(status) {
  const map = { Pending:'not-started', Started:'in-progress', 'In Progress':'in-progress', 'Review Pending':'under-review', Completed:'completed' };
  return map[status] || 'not-started';
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ─── START ───────────────────────────────────
init();
