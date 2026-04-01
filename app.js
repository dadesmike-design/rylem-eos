/* ===== RYLEM EOS — Main Application (Multi-Team) ===== */
(function() {
'use strict';

const STORAGE_KEY = 'rylem_eos';
const TEAM_KEY = 'rylem_eos_team';
let DATA = null;
let currentModule = 'scorecard';
let currentTeamId = localStorage.getItem(TEAM_KEY) || 'leadership';
let meetingState = null;

// ===== DATA LAYER =====
async function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    DATA = JSON.parse(stored);
    // Migration: if old flat format, convert
    if (DATA.team && !DATA.teams) {
      DATA = migrateToMultiTeam(DATA);
      saveData();
    }
  } else {
    const resp = await fetch('data/seed.json');
    DATA = await resp.json();
    saveData();
  }
}

function migrateToMultiTeam(old) {
  // Wrap old single-team data into new multi-team format
  return {
    teams: [{
      id: 'leadership',
      name: old.team.name,
      members: old.team.members,
      scorecard: old.scorecard,
      rocks: old.rocks,
      todos: old.todos,
      issues: old.issues,
      meetings: old.meetings || []
    }],
    vto: old.vto,
    accountability: old.accountability
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
}

function getTeam(teamId) {
  return DATA.teams.find(t => t.id === teamId);
}

function currentTeam() {
  return getTeam(currentTeamId);
}

// Get all unique members across all teams (for "All" view)
function getAllMembers() {
  const seen = {};
  const all = [];
  DATA.teams.forEach(t => {
    t.members.forEach(m => {
      if (!seen[m.id]) { seen[m.id] = true; all.push(m); }
    });
  });
  return all;
}

// Get members for current context
function getActiveMembers() {
  if (currentTeamId === 'all') return getAllMembers();
  const team = currentTeam();
  return team ? team.members : [];
}

function getMember(id) {
  // Search current team first, then all teams
  const members = getActiveMembers();
  let m = members.find(m => m.id === id);
  if (m) return m;
  // Fallback: search all teams
  for (const t of DATA.teams) {
    m = t.members.find(m => m.id === id);
    if (m) return m;
  }
  return { name: id, initials: '??', color: '#666' };
}

// Per-team data accessors (aggregate for "All")
function getScorecard() {
  if (currentTeamId === 'all') {
    // Merge all scorecards
    const merged = { trailingWeeks: 13, measurables: [], entries: {} };
    DATA.teams.forEach(t => {
      t.scorecard.measurables.forEach(m => {
        merged.measurables.push({ ...m, _teamName: t.name });
      });
      Object.assign(merged.entries, t.scorecard.entries);
    });
    return merged;
  }
  const team = currentTeam();
  return team ? team.scorecard : { trailingWeeks: 13, measurables: [], entries: {} };
}

function getRocks() {
  if (currentTeamId === 'all') {
    const all = [];
    DATA.teams.forEach(t => { t.rocks.forEach(r => all.push({ ...r, _teamName: t.name })); });
    return all;
  }
  const team = currentTeam();
  return team ? team.rocks : [];
}

function getTodos() {
  if (currentTeamId === 'all') {
    const all = [];
    DATA.teams.forEach(t => { t.todos.forEach(td => all.push({ ...td, _teamName: t.name })); });
    return all;
  }
  const team = currentTeam();
  return team ? team.todos : [];
}

function getIssues() {
  if (currentTeamId === 'all') {
    const merged = { shortTerm: [], longTerm: [] };
    DATA.teams.forEach(t => {
      if (t.issues) {
        (t.issues.shortTerm || []).forEach(i => merged.shortTerm.push({ ...i, _teamName: t.name }));
        (t.issues.longTerm || []).forEach(i => merged.longTerm.push({ ...i, _teamName: t.name }));
      }
    });
    return merged;
  }
  const team = currentTeam();
  return team ? (team.issues || { shortTerm: [], longTerm: [] }) : { shortTerm: [], longTerm: [] };
}

function getMeetings() {
  if (currentTeamId === 'all') {
    const all = [];
    DATA.teams.forEach(t => { (t.meetings || []).forEach(m => all.push({ ...m, _teamName: t.name })); });
    return all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }
  const team = currentTeam();
  return team ? (team.meetings || []) : [];
}

// Mutators — always operate on the specific team
function findRockSource(rockId) {
  for (const t of DATA.teams) {
    const idx = t.rocks.findIndex(r => r.id === rockId);
    if (idx >= 0) return { team: t, index: idx, rock: t.rocks[idx] };
  }
  return null;
}

function findTodoSource(todoId) {
  for (const t of DATA.teams) {
    const idx = t.todos.findIndex(td => td.id === todoId);
    if (idx >= 0) return { team: t, index: idx, todo: t.todos[idx] };
  }
  return null;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getWeekKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getTrailingWeeks(count) {
  const weeks = [];
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const thisMonday = new Date(now);
  thisMonday.setDate(diff);
  thisMonday.setHours(0,0,0,0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - i * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }
  return weeks;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ===== TEAM SWITCHER =====
function initTeamSwitcher() {
  const sel = document.getElementById('teamSwitcher');
  sel.innerHTML = '<option value="all">All Teams</option>' +
    DATA.teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  sel.value = currentTeamId;
  sel.addEventListener('change', () => {
    currentTeamId = sel.value;
    localStorage.setItem(TEAM_KEY, currentTeamId);
    renderModule();
  });
}

// ===== NAVIGATION =====
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const mod = item.dataset.module;
      if (mod) switchModule(mod);
    });
  });
  document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebarExpand').addEventListener('click', toggleSidebar);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const btn = document.getElementById('sidebarExpand');
  sb.classList.toggle('collapsed');
  btn.style.display = sb.classList.contains('collapsed') ? 'flex' : 'none';
}

function switchModule(mod) {
  currentModule = mod;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.module === mod));
  const titles = {
    scorecard: 'Scorecard', rocks: 'Rocks', todos: 'To-Dos',
    issues: 'Issues', vto: 'V/TO', accountability: 'Accountability Chart',
    meeting: 'L10 Meeting', settings: 'Settings'
  };
  document.getElementById('moduleTitle').textContent = titles[mod] || mod;
  renderModule();
}

function renderModule() {
  const el = document.getElementById('content');
  const renderers = {
    scorecard: renderScorecard,
    rocks: renderRocks,
    todos: renderTodos,
    issues: renderIssues,
    vto: renderVTO,
    accountability: renderAccountability,
    meeting: renderMeeting,
    settings: renderSettings
  };
  (renderers[currentModule] || (() => { el.innerHTML = ''; }))(el);
}

// ===== MODAL =====
function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// ===== MODULE 1: SCORECARD =====
function renderScorecard(el) {
  const scorecard = getScorecard();
  const weeks = getTrailingWeeks(scorecard.trailingWeeks || 13);
  const entries = scorecard.entries || {};
  const isAll = currentTeamId === 'all';

  let weekHeaders = weeks.map(w => {
    const d = new Date(w + 'T00:00:00');
    return `<th class="week-header">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</th>`;
  }).join('');

  let rows = scorecard.measurables.map(m => {
    const member = getMember(m.owner);
    const goalSymbol = m.goalType === 'gte' ? '>=' : m.goalType === 'lte' ? '<=' : '=';

    let weekCells = weeks.map(w => {
      const key = `${m.id}_${w}`;
      const val = entries[key];
      let cls = '';
      if (val !== undefined && val !== null && val !== '') {
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
          if (m.goalType === 'gte') cls = numVal >= m.goal ? 'green' : 'red';
          else if (m.goalType === 'lte') cls = numVal <= m.goal ? 'green' : 'red';
          else cls = numVal === m.goal ? 'green' : 'red';
        }
      }
      return `<td class="scorecard-cell ${cls}" data-key="${key}" data-measurable="${m.id}" data-week="${w}">${val !== undefined && val !== null && val !== '' ? val : ''}</td>`;
    }).join('');

    let sum = 0, count = 0;
    weeks.forEach(w => {
      const v = parseFloat(entries[`${m.id}_${w}`]);
      if (!isNaN(v)) { sum += v; count++; }
    });
    const avg = count > 0 ? (sum / count).toFixed(1) : '-';
    const teamLabel = m._teamName ? `<span style="color:#555;font-size:0.75rem;margin-left:6px">${escapeHtml(m._teamName)}</span>` : '';

    return `<tr>
      <td class="measurable-name">${escapeHtml(m.title)}${teamLabel}</td>
      <td class="owner-cell">${escapeHtml(member.name.split(' ')[0])}</td>
      <td class="goal-cell">${goalSymbol} ${m.goal}</td>
      <td class="avg-cell">${avg}</td>
      ${weekCells}
    </tr>`;
  }).join('');

  const members = getActiveMembers();

  el.innerHTML = `
    <div class="toolbar">
      <select class="filter-select week-select" id="weekCountSelect">
        <option value="6" ${scorecard.trailingWeeks === 6 ? 'selected' : ''}>6 weeks</option>
        <option value="13" ${scorecard.trailingWeeks === 13 ? 'selected' : ''}>13 weeks</option>
        <option value="26" ${scorecard.trailingWeeks === 26 ? 'selected' : ''}>26 weeks</option>
      </select>
      <div class="toolbar-spacer"></div>
      ${!isAll ? '<button class="btn btn-primary btn-sm" id="addMeasurableBtn">+ Measurable</button>' : ''}
    </div>
    <div class="card scorecard-wrap">
      <table class="scorecard-table">
        <thead>
          <tr>
            <th style="text-align:left; min-width:180px">Measurable</th>
            <th>Owner</th>
            <th>Goal</th>
            <th>Avg</th>
            ${weekHeaders}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  document.getElementById('weekCountSelect').addEventListener('change', e => {
    const val = parseInt(e.target.value);
    if (isAll) {
      DATA.teams.forEach(t => { t.scorecard.trailingWeeks = val; });
    } else {
      currentTeam().scorecard.trailingWeeks = val;
    }
    saveData();
    renderScorecard(el);
  });

  if (!isAll) {
    document.getElementById('addMeasurableBtn').addEventListener('click', () => {
      openModal(`
        <div class="modal-header"><h2>Add Measurable</h2><button class="modal-close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Title</label><input id="mTitle" placeholder="e.g. Revenue"></div>
          <div class="form-group"><label>Owner</label><select id="mOwner">${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Goal Type</label><select id="mGoalType"><option value="gte">>= (at least)</option><option value="lte"><= (at most)</option><option value="eq">= (exactly)</option></select></div>
          <div class="form-group"><label>Goal Value</label><input id="mGoal" type="number" placeholder="0"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">Cancel</button><button class="btn btn-primary" id="saveMeasurable">Save</button></div>
      `);
      document.getElementById('saveMeasurable').addEventListener('click', () => {
        const title = document.getElementById('mTitle').value.trim();
        if (!title) return;
        currentTeam().scorecard.measurables.push({
          id: 'sc' + generateId(),
          title,
          owner: document.getElementById('mOwner').value,
          goal: parseFloat(document.getElementById('mGoal').value) || 0,
          goalType: document.getElementById('mGoalType').value,
          unit: ''
        });
        saveData();
        closeModal();
        renderScorecard(el);
      });
    });
  }

  // Click to edit cells (only for specific team)
  if (!isAll) {
    el.querySelectorAll('.scorecard-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        if (cell.querySelector('input')) return;
        const key = cell.dataset.key;
        const sc = currentTeam().scorecard;
        const currentVal = sc.entries[key] || '';
        cell.innerHTML = `<input type="number" value="${currentVal}" step="any">`;
        const inp = cell.querySelector('input');
        inp.focus();
        inp.select();
        const finish = () => {
          const v = inp.value.trim();
          if (v === '') {
            delete sc.entries[key];
          } else {
            if (!sc.entries) sc.entries = {};
            sc.entries[key] = parseFloat(v);
          }
          saveData();
          renderScorecard(el);
        };
        inp.addEventListener('blur', finish);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = currentVal; inp.blur(); } });
      });
    });
  }
}

// ===== MODULE 2: ROCKS =====
let rocksFilter = { status: 'all', owner: 'all' };
let rocksTab = 'active';

function renderRocks(el) {
  const allRocks = getRocks();
  const isAll = currentTeamId === 'all';
  const rocks = allRocks.filter(r => {
    if (rocksTab === 'active' && r.archived) return false;
    if (rocksTab === 'archived' && !r.archived) return false;
    if (rocksFilter.status !== 'all' && r.status !== rocksFilter.status) return false;
    if (rocksFilter.owner !== 'all' && r.owner !== rocksFilter.owner) return false;
    return true;
  });

  const grouped = {};
  rocks.forEach(r => {
    if (!grouped[r.owner]) grouped[r.owner] = [];
    grouped[r.owner].push(r);
  });

  const members = getActiveMembers();

  let groupsHtml = Object.entries(grouped).map(([ownerId, ownerRocks]) => {
    const member = getMember(ownerId);
    const rockItems = ownerRocks.map(r => {
      const statusCls = `status-${r.status.replace(' ', '-')}`;
      const teamLabel = r._teamName ? ` <span style="color:#555;font-size:0.75rem">[${escapeHtml(r._teamName)}]</span>` : '';
      const milestoneHtml = r.milestones && r.milestones.length > 0 ? `
        <div class="milestones">${r.milestones.map((ms, i) => `
          <div class="milestone-item ${ms.done ? 'done' : ''}">
            <input type="checkbox" ${ms.done ? 'checked' : ''} data-rock="${r.id}" data-ms="${i}" ${isAll ? 'disabled' : ''}>
            <span>${escapeHtml(ms.title)}</span>
          </div>`).join('')}
        </div>` : '';
      return `<div class="rock-item" data-rock-id="${r.id}">
        <div class="rock-title">${escapeHtml(r.title)}${teamLabel}</div>
        <span class="rock-due">${formatDate(r.dueDate)}</span>
        <select class="filter-select rock-status-select" data-rock-id="${r.id}" ${isAll ? 'disabled' : ''}>
          <option value="on-track" ${r.status === 'on-track' ? 'selected' : ''}>On Track</option>
          <option value="off-track" ${r.status === 'off-track' ? 'selected' : ''}>Off Track</option>
          <option value="complete" ${r.status === 'complete' ? 'selected' : ''}>Complete</option>
        </select>
        ${!isAll ? `<button class="btn-icon" title="Edit" data-edit-rock="${r.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` : ''}
      </div>${milestoneHtml}`;
    }).join('');

    return `<div class="rock-group">
      <div class="rock-group-header">
        <div class="avatar" style="background:${member.color}">${member.initials}</div>
        <h3>${escapeHtml(member.name)}</h3>
        <span style="color:#666; font-size:0.82rem">${ownerRocks.length} rock${ownerRocks.length !== 1 ? 's' : ''}</span>
      </div>
      ${rockItems}
    </div>`;
  }).join('');

  if (!groupsHtml) groupsHtml = '<div class="empty-state"><p>No rocks found.</p></div>';

  el.innerHTML = `
    <div class="tabs">
      <div class="tab ${rocksTab === 'active' ? 'active' : ''}" data-rocks-tab="active">Active</div>
      <div class="tab ${rocksTab === 'archived' ? 'active' : ''}" data-rocks-tab="archived">Archived</div>
    </div>
    <div class="toolbar">
      <select class="filter-select" id="rockFilterStatus">
        <option value="all">All Status</option>
        <option value="on-track" ${rocksFilter.status === 'on-track' ? 'selected' : ''}>On Track</option>
        <option value="off-track" ${rocksFilter.status === 'off-track' ? 'selected' : ''}>Off Track</option>
        <option value="complete" ${rocksFilter.status === 'complete' ? 'selected' : ''}>Complete</option>
      </select>
      <select class="filter-select" id="rockFilterOwner">
        <option value="all">All Owners</option>
        ${members.map(m => `<option value="${m.id}" ${rocksFilter.owner === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
      </select>
      <div class="toolbar-spacer"></div>
      ${!isAll ? '<button class="btn btn-primary btn-sm" id="addRockBtn">+ Rock</button>' : ''}
    </div>
    ${groupsHtml}`;

  el.querySelectorAll('[data-rocks-tab]').forEach(t => {
    t.addEventListener('click', () => { rocksTab = t.dataset.rocksTab; renderRocks(el); });
  });

  document.getElementById('rockFilterStatus').addEventListener('change', e => { rocksFilter.status = e.target.value; renderRocks(el); });
  document.getElementById('rockFilterOwner').addEventListener('change', e => { rocksFilter.owner = e.target.value; renderRocks(el); });

  if (!isAll) {
    el.querySelectorAll('.rock-status-select').forEach(sel => {
      sel.addEventListener('change', e => {
        e.stopPropagation();
        const src = findRockSource(sel.dataset.rockId);
        if (src) { src.rock.status = sel.value; saveData(); renderRocks(el); }
      });
    });

    el.querySelectorAll('[data-edit-rock]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openRockModal(btn.dataset.editRock, el);
      });
    });

    el.querySelectorAll('.milestone-item input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const src = findRockSource(cb.dataset.rock);
        if (src && src.rock.milestones[cb.dataset.ms]) {
          src.rock.milestones[cb.dataset.ms].done = cb.checked;
          saveData();
        }
      });
    });

    document.getElementById('addRockBtn')?.addEventListener('click', () => openRockModal(null, el));
  }
}

function openRockModal(rockId, parentEl) {
  const src = rockId ? findRockSource(rockId) : null;
  const rock = src ? src.rock : null;
  const isEdit = !!rock;
  const members = getActiveMembers();
  const milestonesJson = rock && rock.milestones ? rock.milestones.map(m => m.title).join('\n') : '';

  openModal(`
    <div class="modal-header"><h2>${isEdit ? 'Edit' : 'Add'} Rock</h2><button class="modal-close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Title</label><input id="rTitle" value="${isEdit ? escapeHtml(rock.title) : ''}"></div>
      <div class="form-group"><label>Owner</label><select id="rOwner">${members.map(m => `<option value="${m.id}" ${isEdit && rock.owner === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Due Date</label><input id="rDue" type="date" value="${isEdit ? rock.dueDate : ''}"></div>
      <div class="form-group"><label>Status</label><select id="rStatus"><option value="on-track" ${isEdit && rock.status === 'on-track' ? 'selected' : ''}>On Track</option><option value="off-track" ${isEdit && rock.status === 'off-track' ? 'selected' : ''}>Off Track</option><option value="complete" ${isEdit && rock.status === 'complete' ? 'selected' : ''}>Complete</option></select></div>
      <div class="form-group"><label>Milestones (one per line)</label><textarea id="rMilestones" placeholder="Milestone 1&#10;Milestone 2">${milestonesJson}</textarea></div>
      ${isEdit ? `<div class="form-group"><label><input type="checkbox" id="rArchived" ${rock.archived ? 'checked' : ''}> Archived</label></div>` : ''}
    </div>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteRock">Delete</button>` : ''}
      <div class="toolbar-spacer"></div>
      <button class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">Cancel</button>
      <button class="btn btn-primary" id="saveRock">Save</button>
    </div>
  `);

  document.getElementById('saveRock').addEventListener('click', () => {
    const title = document.getElementById('rTitle').value.trim();
    if (!title) return;
    const milestoneLines = document.getElementById('rMilestones').value.split('\n').filter(l => l.trim());
    const milestones = milestoneLines.map((line, i) => ({
      title: line.trim(),
      done: isEdit && rock.milestones[i] ? rock.milestones[i].done : false
    }));
    if (isEdit) {
      rock.title = title;
      rock.owner = document.getElementById('rOwner').value;
      rock.dueDate = document.getElementById('rDue').value;
      rock.status = document.getElementById('rStatus').value;
      rock.milestones = milestones;
      rock.archived = document.getElementById('rArchived')?.checked || false;
    } else {
      currentTeam().rocks.push({
        id: 'r' + generateId(),
        title, owner: document.getElementById('rOwner').value,
        status: document.getElementById('rStatus').value,
        dueDate: document.getElementById('rDue').value,
        milestones, archived: false, quarter: ''
      });
    }
    saveData(); closeModal(); renderRocks(parentEl);
  });

  if (isEdit) {
    document.getElementById('deleteRock').addEventListener('click', () => {
      src.team.rocks.splice(src.index, 1);
      saveData(); closeModal(); renderRocks(parentEl);
    });
  }
}

// ===== MODULE 3: TO-DOS =====
let todosTab = 'team';

function renderTodos(el) {
  const allTodos = getTodos();
  const isAll = currentTeamId === 'all';
  const todos = allTodos.filter(t => {
    if (todosTab === 'team' && t.type !== 'team') return false;
    if (todosTab === 'personal' && t.type !== 'personal') return false;
    if (todosTab === 'archived' && !t.archived) return false;
    if (todosTab !== 'archived' && t.archived) return false;
    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  const members = getActiveMembers();

  const todoItems = todos.map(t => {
    const member = getMember(t.owner);
    const teamLabel = t._teamName ? ` <span style="color:#555;font-size:0.75rem">[${escapeHtml(t._teamName)}]</span>` : '';
    return `<div class="todo-item ${t.completed ? 'completed' : ''}">
      <input type="checkbox" ${t.completed ? 'checked' : ''} data-todo-id="${t.id}" ${isAll ? 'disabled' : ''}>
      <span class="todo-title">${escapeHtml(t.title)}${teamLabel}</span>
      <span class="todo-owner">${escapeHtml(member.name.split(' ')[0])}</span>
      <span class="todo-due">${formatDate(t.dueDate)}</span>
      ${!isAll ? `<button class="btn-icon todo-delete" data-delete-todo="${t.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg></button>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="tabs">
      <div class="tab ${todosTab === 'team' ? 'active' : ''}" data-todos-tab="team">Team</div>
      <div class="tab ${todosTab === 'personal' ? 'active' : ''}" data-todos-tab="personal">Personal</div>
      <div class="tab ${todosTab === 'archived' ? 'active' : ''}" data-todos-tab="archived">Archived</div>
    </div>
    <div class="toolbar">
      <div class="toolbar-spacer"></div>
      ${!isAll ? '<button class="btn btn-secondary btn-sm" id="archiveCompletedTodos">Archive Completed</button>' : ''}
      ${!isAll ? '<button class="btn btn-primary btn-sm" id="addTodoBtn">+ To-Do</button>' : ''}
    </div>
    ${todoItems || '<div class="empty-state"><p>No to-dos yet.</p></div>'}`;

  el.querySelectorAll('[data-todos-tab]').forEach(t => {
    t.addEventListener('click', () => { todosTab = t.dataset.todosTab; renderTodos(el); });
  });

  if (!isAll) {
    el.querySelectorAll('input[data-todo-id]').forEach(cb => {
      cb.addEventListener('change', () => {
        const src = findTodoSource(cb.dataset.todoId);
        if (src) { src.todo.completed = cb.checked; saveData(); renderTodos(el); }
      });
    });

    el.querySelectorAll('[data-delete-todo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const src = findTodoSource(btn.dataset.deleteTodo);
        if (src) { src.team.todos.splice(src.index, 1); saveData(); renderTodos(el); }
      });
    });

    document.getElementById('archiveCompletedTodos')?.addEventListener('click', () => {
      currentTeam().todos.forEach(t => { if (t.completed && !t.archived) t.archived = true; });
      saveData(); renderTodos(el);
    });

    document.getElementById('addTodoBtn')?.addEventListener('click', () => {
      openModal(`
        <div class="modal-header"><h2>Add To-Do</h2><button class="modal-close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label>Title</label><input id="tdTitle"></div>
          <div class="form-group"><label>Owner</label><select id="tdOwner">${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Due Date</label><input id="tdDue" type="date"></div>
          <div class="form-group"><label>Type</label><select id="tdType"><option value="team">Team</option><option value="personal">Personal</option></select></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">Cancel</button><button class="btn btn-primary" id="saveTodo">Save</button></div>
      `);
      document.getElementById('saveTodo').addEventListener('click', () => {
        const title = document.getElementById('tdTitle').value.trim();
        if (!title) return;
        currentTeam().todos.push({
          id: 't' + generateId(), title,
          owner: document.getElementById('tdOwner').value,
          createdBy: 'md', dueDate: document.getElementById('tdDue').value,
          completed: false, archived: false, type: document.getElementById('tdType').value
        });
        saveData(); closeModal(); renderTodos(el);
      });
    });
  }
}

// ===== MODULE 4: ISSUES =====
let issuesTab = 'shortTerm';

function renderIssues(el) {
  const issues = getIssues();
  const isAll = currentTeamId === 'all';
  const listKey = issuesTab;
  const issueList = issues[listKey] || [];
  const members = getActiveMembers();

  const issueItems = issueList.map((iss, idx) => {
    const member = getMember(iss.owner || 'md');
    const teamLabel = iss._teamName ? ` <span style="color:#555;font-size:0.75rem">[${escapeHtml(iss._teamName)}]</span>` : '';
    return `<div class="issue-item" ${!isAll ? 'draggable="true"' : ''} data-issue-idx="${idx}" data-issue-list="${listKey}">
      ${!isAll ? '<div class="issue-drag-handle"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg></div>' : ''}
      <span class="issue-title">${escapeHtml(iss.title)}${teamLabel}</span>
      <span class="issue-owner">${escapeHtml(member.name.split(' ')[0])}</span>
      <span class="issue-priority priority-${iss.priority || 3}">P${iss.priority || 3}</span>
      ${!isAll ? `<div class="issue-actions">
        <button class="btn-icon" title="Edit" data-edit-issue="${idx}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="btn btn-success btn-sm" data-solve-issue="${idx}" title="Solve">Solve</button>
      </div>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="tabs">
      <div class="tab ${issuesTab === 'shortTerm' ? 'active' : ''}" data-issues-tab="shortTerm">Short-Term</div>
      <div class="tab ${issuesTab === 'longTerm' ? 'active' : ''}" data-issues-tab="longTerm">Long-Term</div>
    </div>
    <div class="toolbar">
      <div class="toolbar-spacer"></div>
      ${!isAll ? '<button class="btn btn-primary btn-sm" id="addIssueBtn">+ Issue</button>' : ''}
    </div>
    <div id="issuesList">
      ${issueItems || '<div class="empty-state"><p>No issues. That\'s a good thing!</p></div>'}
    </div>`;

  el.querySelectorAll('[data-issues-tab]').forEach(t => {
    t.addEventListener('click', () => { issuesTab = t.dataset.issuesTab; renderIssues(el); });
  });

  if (!isAll) {
    // Drag and drop
    const list = document.getElementById('issuesList');
    let dragIdx = null;

    list.querySelectorAll('.issue-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        dragIdx = parseInt(item.dataset.issueIdx);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        list.querySelectorAll('.issue-item').forEach(i => i.classList.remove('drag-over'));
      });
      item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
      item.addEventListener('dragleave', () => { item.classList.remove('drag-over'); });
      item.addEventListener('drop', e => {
        e.preventDefault();
        const dropIdx = parseInt(item.dataset.issueIdx);
        if (dragIdx !== null && dragIdx !== dropIdx) {
          const arr = currentTeam().issues[listKey];
          const moved = arr.splice(dragIdx, 1)[0];
          arr.splice(dropIdx, 0, moved);
          saveData();
          renderIssues(el);
        }
      });
    });

    // Solve
    el.querySelectorAll('[data-solve-issue]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.solveIssue);
        const team = currentTeam();
        const issue = team.issues[listKey][idx];
        if (!issue) return;
        openModal(`
          <div class="modal-header"><h2>Solve Issue</h2><button class="modal-close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
          <div class="modal-body">
            <p style="margin-bottom:12px">Issue: <strong>${escapeHtml(issue.title)}</strong></p>
            <div class="form-group"><label><input type="checkbox" id="createTodoFromIssue" checked> Create a To-Do from this issue</label></div>
            <div class="form-group"><label>To-Do Owner</label><select id="solveTodoOwner">${members.map(m => `<option value="${m.id}" ${issue.owner === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div>
            <div class="form-group"><label>Due Date</label><input id="solveTodoDue" type="date"></div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">Cancel</button><button class="btn btn-success" id="confirmSolve">Solve</button></div>
        `);
        document.getElementById('confirmSolve').addEventListener('click', () => {
          if (document.getElementById('createTodoFromIssue').checked) {
            team.todos.push({
              id: 't' + generateId(), title: issue.title,
              owner: document.getElementById('solveTodoOwner').value,
              createdBy: 'md', dueDate: document.getElementById('solveTodoDue').value,
              completed: false, archived: false, type: 'team'
            });
          }
          team.issues[listKey].splice(idx, 1);
          saveData(); closeModal(); renderIssues(el);
        });
      });
    });

    // Edit issue
    el.querySelectorAll('[data-edit-issue]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.editIssue);
        openIssueModal(listKey, idx, el);
      });
    });

    document.getElementById('addIssueBtn')?.addEventListener('click', () => openIssueModal(listKey, null, el));
  }
}

function openIssueModal(listKey, idx, parentEl) {
  const team = currentTeam();
  const issue = idx !== null ? team.issues[listKey][idx] : null;
  const isEdit = !!issue;
  const members = getActiveMembers();

  openModal(`
    <div class="modal-header"><h2>${isEdit ? 'Edit' : 'Add'} Issue</h2><button class="modal-close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Title</label><input id="issTitle" value="${isEdit ? escapeHtml(issue.title) : ''}"></div>
      <div class="form-group"><label>Owner</label><select id="issOwner">${members.map(m => `<option value="${m.id}" ${isEdit && issue.owner === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Priority</label><select id="issPriority"><option value="1" ${isEdit && issue.priority === 1 ? 'selected' : ''}>P1 - High</option><option value="2" ${isEdit && issue.priority === 2 ? 'selected' : ''}>P2 - Medium</option><option value="3" ${isEdit && issue.priority === 3 ? 'selected' : ''}>P3 - Low</option></select></div>
      <div class="form-group"><label>Notes</label><textarea id="issNotes">${isEdit ? escapeHtml(issue.notes || '') : ''}</textarea></div>
    </div>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteIssue">Delete</button>` : ''}
      <div class="toolbar-spacer"></div>
      <button class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">Cancel</button>
      <button class="btn btn-primary" id="saveIssue">Save</button>
    </div>
  `);

  document.getElementById('saveIssue').addEventListener('click', () => {
    const title = document.getElementById('issTitle').value.trim();
    if (!title) return;
    const obj = {
      title, owner: document.getElementById('issOwner').value,
      priority: parseInt(document.getElementById('issPriority').value),
      notes: document.getElementById('issNotes').value,
      createdDate: isEdit ? issue.createdDate : new Date().toISOString().slice(0, 10)
    };
    if (isEdit) {
      team.issues[listKey][idx] = obj;
    } else {
      team.issues[listKey].push(obj);
    }
    saveData(); closeModal(); renderIssues(parentEl);
  });

  if (isEdit) {
    document.getElementById('deleteIssue').addEventListener('click', () => {
      team.issues[listKey].splice(idx, 1);
      saveData(); closeModal(); renderIssues(parentEl);
    });
  }
}

// ===== MODULE 5: V/TO (SHARED — not per-team) =====
let vtoTab = 'vision';

function renderVTO(el) {
  if (vtoTab === 'vision') renderVTOVision(el);
  else renderVTOTraction(el);
}

function renderVTOVision(el) {
  const vto = DATA.vto;

  const coreValuesHtml = vto.coreValues.map((cv, i) => `
    <div class="vto-value-item">
      <h4 class="vto-field-value" data-vto-path="coreValues.${i}.title">${escapeHtml(cv.title)}</h4>
      <p class="vto-field-value" data-vto-path="coreValues.${i}.description">${escapeHtml(cv.description)}</p>
    </div>`).join('');

  const uniquesHtml = vto.marketingStrategy.threeUniques.map((u, i) => `
    <div class="vto-value-item">
      <h4 class="vto-field-value" data-vto-path="marketingStrategy.threeUniques.${i}.title">${escapeHtml(u.title)}</h4>
      <p class="vto-field-value" data-vto-path="marketingStrategy.threeUniques.${i}.description">${escapeHtml(u.description)}</p>
    </div>`).join('');

  el.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-vto-tab="vision">Vision</div>
      <div class="tab" data-vto-tab="traction">Traction</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;justify-content:flex-end;margin-bottom:16px">
      <span style="color:#a3a3a3;font-size:0.82rem">Shared across all teams</span>
      <button class="btn btn-secondary btn-sm" id="printVTO">Print / Export PDF</button>
    </div>
    <div class="card">
      <div class="vto-section">
        <div class="vto-section-title">Core Values</div>
        ${coreValuesHtml}
        <button class="btn btn-secondary btn-sm" id="addCoreValue" style="margin-top:8px">+ Core Value</button>
      </div>
    </div>
    <div class="card">
      <div class="vto-section">
        <div class="vto-section-title">Core Focus</div>
        <div class="vto-field">
          <div class="vto-field-label">Purpose / Cause / Passion</div>
          <div class="vto-field-value" data-vto-path="coreFocus.purpose">${escapeHtml(vto.coreFocus.purpose)}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Niche</div>
          <div class="vto-field-value" data-vto-path="coreFocus.niche">${escapeHtml(vto.coreFocus.niche)}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="vto-section">
        <div class="vto-section-title">10-Year Target</div>
        <div class="vto-field">
          <div class="vto-field-label">Goal</div>
          <div class="vto-field-value" data-vto-path="tenYearTarget.goal">${escapeHtml(vto.tenYearTarget.goal)}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Target Date</div>
          <div class="vto-field-value" data-vto-path="tenYearTarget.date">${escapeHtml(vto.tenYearTarget.date)}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="vto-section">
        <div class="vto-section-title">Marketing Strategy</div>
        <div class="vto-field">
          <div class="vto-field-label">Target Market</div>
          <div class="vto-field-value" data-vto-path="marketingStrategy.targetMarket">${escapeHtml(vto.marketingStrategy.targetMarket)}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Three Uniques</div>
          ${uniquesHtml}
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Proven Process</div>
          <div class="vto-field-value" data-vto-path="marketingStrategy.provenProcess">${escapeHtml(vto.marketingStrategy.provenProcess)}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Guarantee</div>
          <div class="vto-field-value" data-vto-path="marketingStrategy.guarantee">${escapeHtml(vto.marketingStrategy.guarantee)}</div>
        </div>
      </div>
    </div>`;

  bindVTOTabs(el);
  bindVTOEditing(el);

  document.getElementById('printVTO').addEventListener('click', () => window.print());
  document.getElementById('addCoreValue').addEventListener('click', () => {
    vto.coreValues.push({ title: 'New Value', description: 'Description...' });
    saveData(); renderVTO(el);
  });
}

function renderVTOTraction(el) {
  const vto = DATA.vto;
  const goalsHtml3 = (vto.threeYearPicture.goals || []).map((g, i) => `
    <div class="vto-value-item">
      <p class="vto-field-value" data-vto-path="threeYearPicture.goals.${i}">${escapeHtml(g)}</p>
    </div>`).join('');

  const goalsHtml1 = (vto.oneYearPlan.goals || []).map((g, i) => `
    <div class="vto-value-item">
      <p class="vto-field-value" data-vto-path="oneYearPlan.goals.${i}">${escapeHtml(g)}</p>
    </div>`).join('');

  // Show rocks from all teams for the traction page
  const allRocks = [];
  DATA.teams.forEach(t => {
    t.rocks.filter(r => !r.archived).forEach(r => allRocks.push({ ...r, _teamName: t.name }));
  });
  const rocksSummary = allRocks.map(r => {
    const member = getMember(r.owner);
    const statusCls = `status-${r.status.replace(' ', '-')}`;
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
      <span class="status-badge ${statusCls}">${r.status.replace('-', ' ')}</span>
      <span>${escapeHtml(r.title)}</span>
      <span style="color:#555;font-size:0.75rem;margin-left:4px">[${escapeHtml(r._teamName)}]</span>
      <span style="color:#666;margin-left:auto">${escapeHtml(member.name.split(' ')[0])}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="tabs">
      <div class="tab" data-vto-tab="vision">Vision</div>
      <div class="tab active" data-vto-tab="traction">Traction</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;justify-content:flex-end;margin-bottom:16px">
      <span style="color:#a3a3a3;font-size:0.82rem">Shared across all teams</span>
    </div>
    <div class="card">
      <div class="vto-section">
        <div class="vto-section-title">3-Year Picture (${formatDate(vto.threeYearPicture.date)})</div>
        <div class="vto-field">
          <div class="vto-field-label">Revenue</div>
          <div class="vto-field-value" data-vto-path="threeYearPicture.revenue">${escapeHtml(vto.threeYearPicture.revenue)}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Profit</div>
          <div class="vto-field-value" data-vto-path="threeYearPicture.profit">${escapeHtml(vto.threeYearPicture.profit)}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Key Measurables</div>
          <div class="vto-field-value" data-vto-path="threeYearPicture.measurables">${escapeHtml(vto.threeYearPicture.measurables)}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Goals</div>
          ${goalsHtml3}
          <button class="btn btn-secondary btn-sm" style="margin-top:8px" id="add3YGoal">+ Goal</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="vto-section">
        <div class="vto-section-title">1-Year Plan (${formatDate(vto.oneYearPlan.date)})</div>
        <div class="vto-field">
          <div class="vto-field-label">Revenue</div>
          <div class="vto-field-value" data-vto-path="oneYearPlan.revenue">${escapeHtml(vto.oneYearPlan.revenue || '')}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Profit</div>
          <div class="vto-field-value" data-vto-path="oneYearPlan.profit">${escapeHtml(vto.oneYearPlan.profit || '')}</div>
        </div>
        <div class="vto-field">
          <div class="vto-field-label">Goals</div>
          ${goalsHtml1}
          <button class="btn btn-secondary btn-sm" style="margin-top:8px" id="add1YGoal">+ Goal</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="vto-section">
        <div class="vto-section-title">Current Quarter Rocks (All Teams)</div>
        ${rocksSummary || '<div class="empty-state"><p>No rocks for this quarter.</p></div>'}
      </div>
    </div>`;

  bindVTOTabs(el);
  bindVTOEditing(el);

  document.getElementById('add3YGoal')?.addEventListener('click', () => {
    vto.threeYearPicture.goals.push('New goal');
    saveData(); renderVTO(el);
  });
  document.getElementById('add1YGoal')?.addEventListener('click', () => {
    if (!vto.oneYearPlan.goals) vto.oneYearPlan.goals = [];
    vto.oneYearPlan.goals.push('New goal');
    saveData(); renderVTO(el);
  });
}

function bindVTOTabs(el) {
  el.querySelectorAll('[data-vto-tab]').forEach(t => {
    t.addEventListener('click', () => { vtoTab = t.dataset.vtoTab; renderVTO(el); });
  });
}

function bindVTOEditing(el) {
  el.querySelectorAll('.vto-field-value').forEach(field => {
    field.addEventListener('click', () => {
      if (field.querySelector('input, textarea')) return;
      const path = field.dataset.vtoPath;
      if (!path) return;
      const currentVal = getNestedValue(DATA.vto, path) || '';
      const isLong = currentVal.length > 60;
      if (isLong) {
        field.innerHTML = `<textarea class="vto-editable-input">${escapeHtml(currentVal)}</textarea>`;
      } else {
        field.innerHTML = `<input class="vto-editable-input" value="${escapeHtml(currentVal)}">`;
      }
      const inp = field.querySelector('input, textarea');
      inp.focus();
      const finish = () => {
        setNestedValue(DATA.vto, path, inp.value);
        saveData();
        renderVTO(el);
      };
      inp.addEventListener('blur', finish);
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !isLong) inp.blur();
        if (e.key === 'Escape') { renderVTO(el); }
      });
    });
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o && o[k], obj);
}

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

// ===== MODULE 6: ACCOUNTABILITY CHART (SHARED) =====
function renderAccountability(el) {
  const seats = DATA.accountability || [];
  const topLevel = seats.filter(s => !s.parentId);
  const integrator = seats.find(s => s.title === 'Integrator');

  const renderCard = (seat) => {
    const member = getMember(seat.ownerId);
    const rolesHtml = seat.roles && seat.roles.length > 0
      ? `<div class="org-roles"><ul>${seat.roles.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>`
      : '';
    return `<div class="org-card" data-seat-id="${seat.id}">
      <div class="org-card-title">${escapeHtml(seat.title)}</div>
      <div class="org-card-person">
        <div class="avatar" style="background:${member.color}">${member.initials}</div>
        ${escapeHtml(seat.person)}
      </div>
      ${rolesHtml}
    </div>`;
  };

  const integratorChildren = integrator ? seats.filter(s => s.parentId === integrator.id) : [];

  // Use all members from all teams for seat modal
  let html = `
    <div class="toolbar">
      <span style="color:#a3a3a3;font-size:0.82rem">Shared across all teams</span>
      <div class="toolbar-spacer"></div>
      <button class="btn btn-primary btn-sm" id="addSeatBtn">+ Seat</button>
    </div>
    <div class="org-chart">
      <div class="org-tree-top">
        ${topLevel.map(s => renderCard(s)).join('')}
      </div>`;

  if (integratorChildren.length > 0) {
    html += `
      <div class="org-top-connector"></div>
      <div class="org-tree-children">
        ${integratorChildren.map(s => `<div class="org-tree-child">${renderCard(s)}</div>`).join('')}
      </div>`;
  }

  html += '</div>';
  el.innerHTML = html;

  el.querySelectorAll('.org-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      card.classList.toggle('expanded');
    });
    card.addEventListener('dblclick', () => {
      const seatId = card.dataset.seatId;
      openSeatModal(seatId, el);
    });
  });

  document.getElementById('addSeatBtn').addEventListener('click', () => openSeatModal(null, el));
}

function openSeatModal(seatId, parentEl) {
  const seat = seatId ? DATA.accountability.find(s => s.id === seatId) : null;
  const isEdit = !!seat;
  const allMembers = getAllMembers();
  const parentOptions = DATA.accountability.map(s => `<option value="${s.id}" ${isEdit && seat.parentId === s.id ? 'selected' : ''}>${s.title} - ${s.person}</option>`).join('');

  openModal(`
    <div class="modal-header"><h2>${isEdit ? 'Edit' : 'Add'} Seat</h2><button class="modal-close" onclick="document.getElementById('modal').style.display='none'">&times;</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Title</label><input id="seatTitle" value="${isEdit ? escapeHtml(seat.title) : ''}"></div>
      <div class="form-group"><label>Person</label><select id="seatPerson">${allMembers.map(m => `<option value="${m.id}" ${isEdit && seat.ownerId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Reports To</label><select id="seatParent"><option value="">None (Top Level)</option>${parentOptions}</select></div>
      <div class="form-group"><label>Roles & Responsibilities (one per line)</label><textarea id="seatRoles">${isEdit ? seat.roles.join('\n') : ''}</textarea></div>
    </div>
    <div class="modal-footer">
      ${isEdit ? `<button class="btn btn-danger btn-sm" id="deleteSeat">Delete</button>` : ''}
      <div class="toolbar-spacer"></div>
      <button class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">Cancel</button>
      <button class="btn btn-primary" id="saveSeat">Save</button>
    </div>
  `);

  document.getElementById('saveSeat').addEventListener('click', () => {
    const title = document.getElementById('seatTitle').value.trim();
    if (!title) return;
    const personId = document.getElementById('seatPerson').value;
    const member = getMember(personId);
    const roles = document.getElementById('seatRoles').value.split('\n').filter(l => l.trim()).map(l => l.trim());
    const parentId = document.getElementById('seatParent').value || null;

    if (isEdit) {
      seat.title = title;
      seat.person = member.name;
      seat.ownerId = personId;
      seat.roles = roles;
      seat.parentId = parentId;
    } else {
      DATA.accountability.push({
        id: 'ac' + generateId(),
        title, person: member.name, ownerId: personId,
        roles, parentId
      });
    }
    saveData(); closeModal(); renderAccountability(parentEl);
  });

  if (isEdit) {
    document.getElementById('deleteSeat').addEventListener('click', () => {
      DATA.accountability = DATA.accountability.filter(s => s.id !== seatId);
      saveData(); closeModal(); renderAccountability(parentEl);
    });
  }
}

// ===== MODULE 7: L10 MEETING =====
const MEETING_SECTIONS = [
  { id: 'segue', title: 'Segue / Check-in', minutes: 5 },
  { id: 'scorecard', title: 'Scorecard Review', minutes: 5 },
  { id: 'rocks', title: 'Rock Review', minutes: 5 },
  { id: 'headlines', title: 'Customer/Employee Headlines', minutes: 5 },
  { id: 'todos', title: 'To-Do Review', minutes: 5 },
  { id: 'ids', title: 'IDS (Issues)', minutes: 60 },
  { id: 'conclude', title: 'Conclude', minutes: 5 }
];

let meetingTab = 'run';
let meetingTimers = {};

function renderMeeting(el) {
  if (meetingTab === 'run') renderMeetingRun(el);
  else renderMeetingHistory(el);
}

function renderMeetingRun(el) {
  const isAll = currentTeamId === 'all';
  if (!meetingState) {
    meetingState = {
      active: false,
      currentSection: 0,
      sectionTimers: MEETING_SECTIONS.map(s => s.minutes * 60),
      sectionRunning: -1,
      rating: null,
      notes: '',
      startTime: null
    };
  }

  const sections = MEETING_SECTIONS.map((sec, idx) => {
    const isActive = meetingState.currentSection === idx;
    const remaining = meetingState.sectionTimers[idx];
    const totalSec = sec.minutes * 60;
    const mins = Math.floor(Math.abs(remaining) / 60);
    const secs = Math.abs(remaining) % 60;
    const timeStr = `${remaining < 0 ? '-' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
    const timerCls = remaining <= 0 ? 'over' : remaining < 30 ? 'warning' : '';

    let bodyContent = '';
    if (sec.id === 'scorecard') bodyContent = renderMeetingScorecardReview();
    else if (sec.id === 'rocks') bodyContent = renderMeetingRockReview();
    else if (sec.id === 'todos') bodyContent = renderMeetingTodoReview();
    else if (sec.id === 'ids') bodyContent = renderMeetingIDS();
    else if (sec.id === 'segue') bodyContent = '<p style="color:#a3a3a3">Share good news — personal and professional.</p>';
    else if (sec.id === 'headlines') bodyContent = '<p style="color:#a3a3a3">Share customer and employee headlines. Good news and concerns.</p>';
    else if (sec.id === 'conclude') bodyContent = renderMeetingConclude();

    return `<div class="meeting-section ${isActive ? 'active-section' : ''}" data-section="${idx}">
      <div class="meeting-section-header">
        <span class="meeting-section-title">${sec.title}</span>
        <span class="meeting-section-time">${sec.minutes} min</span>
        <span class="meeting-timer ${timerCls}">${timeStr}</span>
        <div class="meeting-controls">
          ${isActive && meetingState.sectionRunning === idx
            ? `<button class="btn btn-secondary btn-sm" data-pause-section="${idx}">Pause</button>`
            : `<button class="btn btn-primary btn-sm" data-start-section="${idx}">Start</button>`}
          ${idx < MEETING_SECTIONS.length - 1
            ? `<button class="btn btn-secondary btn-sm" data-next-section="${idx}">Next</button>`
            : ''}
        </div>
      </div>
      <div class="meeting-section-body">${bodyContent}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="tabs">
      <div class="tab active" data-meeting-tab="run">Run Meeting</div>
      <div class="tab" data-meeting-tab="history">History</div>
    </div>
    <div class="toolbar">
      <button class="btn btn-primary btn-sm" id="newMeetingBtn">New Meeting</button>
      <div class="toolbar-spacer"></div>
      ${meetingState.active ? `<button class="btn btn-danger btn-sm" id="endMeetingBtn">End Meeting</button>` : ''}
    </div>
    <div class="meeting-agenda">${sections}</div>`;

  el.querySelectorAll('[data-meeting-tab]').forEach(t => {
    t.addEventListener('click', () => { meetingTab = t.dataset.meetingTab; renderMeeting(el); });
  });

  el.querySelectorAll('.meeting-section-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const idx = parseInt(header.parentElement.dataset.section);
      meetingState.currentSection = idx;
      renderMeetingRun(el);
    });
  });

  el.querySelectorAll('[data-start-section]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      startSectionTimer(parseInt(btn.dataset.startSection), el);
    });
  });
  el.querySelectorAll('[data-pause-section]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pauseSectionTimer(el);
    });
  });
  el.querySelectorAll('[data-next-section]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pauseSectionTimer(el);
      meetingState.currentSection = parseInt(btn.dataset.nextSection) + 1;
      renderMeetingRun(el);
    });
  });

  document.getElementById('newMeetingBtn').addEventListener('click', () => {
    Object.values(meetingTimers).forEach(clearInterval);
    meetingTimers = {};
    meetingState = {
      active: true,
      currentSection: 0,
      sectionTimers: MEETING_SECTIONS.map(s => s.minutes * 60),
      sectionRunning: -1,
      rating: null,
      notes: '',
      startTime: new Date().toISOString()
    };
    renderMeetingRun(el);
  });

  document.getElementById('endMeetingBtn')?.addEventListener('click', () => {
    saveMeetingToHistory();
    Object.values(meetingTimers).forEach(clearInterval);
    meetingTimers = {};
    meetingState.active = false;
    renderMeetingRun(el);
  });

  el.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      meetingState.rating = parseInt(btn.dataset.rating);
      el.querySelectorAll('.rating-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.rating) === meetingState.rating));
    });
  });

  el.querySelectorAll('input[data-meeting-todo-id]').forEach(cb => {
    cb.addEventListener('change', () => {
      const src = findTodoSource(cb.dataset.meetingTodoId);
      if (src) { src.todo.completed = cb.checked; saveData(); }
    });
  });
}

function startSectionTimer(idx, el) {
  if (meetingTimers.current) clearInterval(meetingTimers.current);
  meetingState.sectionRunning = idx;
  meetingState.currentSection = idx;
  meetingState.active = true;

  meetingTimers.current = setInterval(() => {
    meetingState.sectionTimers[idx]--;
    const section = el.querySelector(`[data-section="${idx}"]`);
    if (section) {
      const timerEl = section.querySelector('.meeting-timer');
      const remaining = meetingState.sectionTimers[idx];
      const mins = Math.floor(Math.abs(remaining) / 60);
      const secs = Math.abs(remaining) % 60;
      timerEl.textContent = `${remaining < 0 ? '-' : ''}${mins}:${secs.toString().padStart(2, '0')}`;
      timerEl.className = 'meeting-timer' + (remaining <= 0 ? ' over' : remaining < 30 ? ' warning' : '');
    }
  }, 1000);

  renderMeetingRun(el);
}

function pauseSectionTimer(el) {
  if (meetingTimers.current) clearInterval(meetingTimers.current);
  meetingState.sectionRunning = -1;
  renderMeetingRun(el);
}

function renderMeetingScorecardReview() {
  const scorecard = getScorecard();
  const weeks = getTrailingWeeks(2);
  const thisWeek = weeks[weeks.length - 1];
  return scorecard.measurables.map(m => {
    const member = getMember(m.owner);
    const val = scorecard.entries[`${m.id}_${thisWeek}`];
    const goalSymbol = m.goalType === 'gte' ? '>=' : m.goalType === 'lte' ? '<=' : '=';
    let status = '';
    if (val !== undefined && val !== null) {
      const numVal = parseFloat(val);
      if (m.goalType === 'gte') status = numVal >= m.goal ? 'green' : 'red';
      else if (m.goalType === 'lte') status = numVal <= m.goal ? 'green' : 'red';
      else status = numVal === m.goal ? 'green' : 'red';
    }
    const color = status === 'green' ? '#22c55e' : status === 'red' ? '#ef4444' : '#a3a3a3';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #222">
      <span style="flex:1">${escapeHtml(m.title)}</span>
      <span style="color:#666">${goalSymbol} ${m.goal}</span>
      <span style="font-weight:600;color:${color}">${val !== undefined && val !== null ? val : '—'}</span>
      <span style="color:#666;font-size:0.82rem">${member.name.split(' ')[0]}</span>
    </div>`;
  }).join('') || '<p style="color:#666">No measurables.</p>';
}

function renderMeetingRockReview() {
  const rocks = getRocks().filter(r => !r.archived);
  return rocks.map(r => {
    const member = getMember(r.owner);
    const statusCls = `status-${r.status.replace(' ', '-')}`;
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #222">
      <span class="status-badge ${statusCls}" style="font-size:0.72rem">${r.status.replace('-', ' ')}</span>
      <span style="flex:1">${escapeHtml(r.title)}</span>
      <span style="color:#666;font-size:0.82rem">${member.name.split(' ')[0]}</span>
    </div>`;
  }).join('') || '<p style="color:#666">No active rocks.</p>';
}

function renderMeetingTodoReview() {
  const todos = getTodos().filter(t => !t.archived && t.type === 'team');
  return todos.map(t => {
    const member = getMember(t.owner);
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #222">
      <input type="checkbox" ${t.completed ? 'checked' : ''} data-meeting-todo-id="${t.id}" style="accent-color:#6366f1">
      <span style="flex:1;${t.completed ? 'text-decoration:line-through;opacity:0.5' : ''}">${escapeHtml(t.title)}</span>
      <span style="color:#666;font-size:0.82rem">${formatDate(t.dueDate)}</span>
      <span style="color:#666;font-size:0.82rem">${member.name.split(' ')[0]}</span>
    </div>`;
  }).join('') || '<p style="color:#666">No team to-dos.</p>';
}

function renderMeetingIDS() {
  const issues = getIssues();
  const list = issues.shortTerm || [];
  return list.map(iss => {
    const member = getMember(iss.owner || 'md');
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #222">
      <span class="issue-priority priority-${iss.priority || 3}" style="font-size:0.72rem">P${iss.priority || 3}</span>
      <span style="flex:1">${escapeHtml(iss.title)}</span>
      <span style="color:#666;font-size:0.82rem">${member.name.split(' ')[0]}</span>
    </div>`;
  }).join('') || '<p style="color:#666">No short-term issues.</p>';
}

function renderMeetingConclude() {
  const ratingBtns = Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    return `<button class="rating-btn ${meetingState.rating === num ? 'selected' : ''}" data-rating="${num}">${num}</button>`;
  }).join('');
  return `
    <p style="color:#a3a3a3;margin-bottom:8px">Recap to-do list, cascading messages, and rate the meeting.</p>
    <div style="margin-bottom:12px">
      <label style="display:block;font-size:0.82rem;color:#a3a3a3;margin-bottom:4px">Rate this meeting</label>
      <div class="meeting-rating">${ratingBtns}</div>
    </div>`;
}

function saveMeetingToHistory() {
  if (!meetingState || !meetingState.startTime) return;
  if (currentTeamId !== 'all') {
    const team = currentTeam();
    if (!team.meetings) team.meetings = [];
    team.meetings.unshift({
      date: meetingState.startTime,
      rating: meetingState.rating,
      notes: meetingState.notes || ''
    });
  }
  saveData();
}

function renderMeetingHistory(el) {
  const meetings = getMeetings();
  const isAll = currentTeamId === 'all';
  const historyHtml = meetings.map(m => {
    const d = new Date(m.date);
    const teamLabel = m._teamName ? `<span style="color:#555;font-size:0.8rem">[${escapeHtml(m._teamName)}]</span>` : '';
    return `<div class="meeting-history-item">
      <span class="meeting-history-date">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      ${teamLabel}
      <span class="meeting-history-rating">${m.rating ? m.rating + '/10' : 'Not rated'}</span>
      ${m.notes ? `<span style="color:#a3a3a3;font-size:0.85rem">${escapeHtml(m.notes)}</span>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="tabs">
      <div class="tab" data-meeting-tab="run">Run Meeting</div>
      <div class="tab active" data-meeting-tab="history">History</div>
    </div>
    ${historyHtml || '<div class="empty-state"><p>No meeting history yet.</p></div>'}`;

  el.querySelectorAll('[data-meeting-tab]').forEach(t => {
    t.addEventListener('click', () => { meetingTab = t.dataset.meetingTab; renderMeeting(el); });
  });
}

// ===== SETTINGS =====
function renderSettings(el) {
  const team = currentTeam();
  const isAll = currentTeamId === 'all';
  const members = getActiveMembers();

  el.innerHTML = `
    <div class="settings-section">
      <div class="card">
        <h3>Data Management</h3>
        <p style="color:#a3a3a3;font-size:0.85rem;margin-bottom:16px">Export your data as JSON or import from a file. Includes all teams.</p>
        <div class="settings-actions">
          <button class="btn btn-primary" id="exportBtn">Export JSON</button>
          <button class="btn btn-secondary" id="importBtn">Import JSON</button>
          <input type="file" id="importFile" accept=".json" style="display:none">
        </div>
      </div>
      <div class="card">
        <h3>Reset Data</h3>
        <p style="color:#a3a3a3;font-size:0.85rem;margin-bottom:16px">Reset all data to the default seed data. This cannot be undone.</p>
        <button class="btn btn-danger" id="resetBtn">Reset to Default</button>
      </div>
      <div class="card">
        <h3>${isAll ? 'All Team Members' : escapeHtml(team.name) + ' Members'}</h3>
        <div id="teamMembersList">
          ${members.map(m => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #222">
              <div class="avatar" style="background:${m.color}">${m.initials}</div>
              <span style="flex:1">${escapeHtml(m.name)}</span>
              <span style="color:#666">${m.id.toUpperCase()}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rylem-eos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        DATA = JSON.parse(ev.target.result);
        saveData();
        initTeamSwitcher();
        renderSettings(el);
        alert('Data imported successfully!');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!confirm('Are you sure? This will reset ALL data to defaults.')) return;
    localStorage.removeItem(STORAGE_KEY);
    const resp = await fetch('data/seed.json');
    DATA = await resp.json();
    saveData();
    initTeamSwitcher();
    renderSettings(el);
    alert('Data reset to defaults.');
  });
}

// ===== INIT =====
async function init() {
  await loadData();
  initNav();
  initTeamSwitcher();
  switchModule('scorecard');
}

init();

})();
