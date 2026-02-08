// ============================================================
// ZEITERFASSUNG APP - RESILIENT VERSION
// ============================================================

const STORAGE = {
    SETTINGS: 'zt_settings',
    ENTRIES: 'zt_entries',
};

const MONTHS = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// ============================================================
// HELPERS
// ============================================================

function toISODate(val) {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    // Local date components to avoid timezone shifts
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function todayISO() {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().split('T')[0];
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
}

function formatTime(h, m) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calcHours(from, to) {
    if (!from || !to) return 0;
    const [h1, m1] = from.split(':').map(Number);
    const [h2, m2] = to.split(':').map(Number);
    let t1 = h1 * 60 + m1;
    let t2 = h2 * 60 + m2;
    if (t2 <= t1) t2 += 24 * 60; // Midnight cross
    return (t2 - t1) / 60;
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// STATE & STORAGE
// ============================================================

let entriesCache = [];
let multiSelectMode = false;
let selectedIds = new Set();
let viewMonth = new Date();

function getSettings() {
    const s = localStorage.getItem(STORAGE.SETTINGS);
    return s ? JSON.parse(s) : { scriptUrl: '', hourlyWage: 38 };
}

function saveSettings(s) {
    localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s));
}

function loadEntries() {
    const local = localStorage.getItem(STORAGE.ENTRIES);
    if (local) {
        let entries = JSON.parse(local);
        // HEAL: Fix ISO dates/times that might have leaked from old syncs
        entries = entries.map(e => ({
            ...e,
            date: e.date.includes('T') ? e.date.split('T')[0] : e.date,
            from: e.from.includes('T') ? e.from.split('T')[1].substr(0, 5) : e.from,
            to: e.to.includes('T') ? e.to.split('T')[1].substr(0, 5) : e.to
        }));
        entriesCache = entries;
        refreshEntries();
    }
}

// ============================================================
// SYNC (GOOGLE APPS SCRIPT)
// ============================================================

async function syncRead() {
    const url = getSettings().scriptUrl;
    if (!url) return;
    try {
        const res = await fetch(`${url}?action=read&t=${Date.now()}`);
        const data = await res.json();
        if (data.status === 'success') {
            entriesCache = data.entries;
            localStorage.setItem(STORAGE.ENTRIES, JSON.stringify(entriesCache));
            refreshEntries();
        }
    } catch (e) {
        console.error('Sync error:', e);
    }
}

async function syncWrite() {
    const s = getSettings();
    if (!s.scriptUrl) return;
    try {
        await fetch(s.scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'write',
                entries: entriesCache,
                hourlyWage: s.hourlyWage,
                companyName: 'Zimmerei',
                settings: {
                    companyName: 'Zimmerei',
                    hourlyWage: s.hourlyWage
                }
            })
        });
    } catch (e) {
        console.error('Save error:', e);
    }
}

function deleteEntryById(id) {
    entriesCache = entriesCache.filter(e => e.id !== id);
    localStorage.setItem(STORAGE.ENTRIES, JSON.stringify(entriesCache));
    syncWrite();
    refreshEntries();
}

// ============================================================
// NAVIGATION
// ============================================================

function switchView(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active'));

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewId);
    });
}

// ============================================================
// ENTRIES LIST & DASHBOARD
// ============================================================

function refreshEntries() {
    const month = viewMonth.getMonth();
    const year = viewMonth.getFullYear();
    const settings = getSettings();

    // Update Label
    const labelEl = document.getElementById('entries-month-label');
    if (labelEl) labelEl.textContent = `${MONTHS[month]} ${year}`;

    // Filter & Sort
    const monthEntries = entriesCache
        .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === month && d.getFullYear() === year;
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.from.localeCompare(a.from));

    // List HTML
    const listEl = document.getElementById('entries-list');
    if (listEl) {
        if (monthEntries.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Keine Einträge vorhanden</p>';
        } else {
            listEl.innerHTML = monthEntries.map(e => {
                // Ensure we handle both YYYY-MM-DD and full ISO strings safely
                const cleanDate = e.date.includes('T') ? e.date.split('T')[0] : e.date;
                const [y, m, d] = cleanDate.split('-');

                // Get weekday
                const dateObj = new Date(y, m - 1, d);
                const weekdays = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
                const dayName = weekdays[dateObj.getDay()];

                const labelHtml = `<b>${dayName}</b> - ${d}.${m}.${y}`;
                const checkbox = multiSelectMode ? `<input type="checkbox" class="entry-checkbox" data-id="${e.id}" ${selectedIds.has(e.id) ? 'checked' : ''}>` : '';
                return `
                    <div class="entry-item ${multiSelectMode ? 'selectable' : ''} ${selectedIds.has(e.id) ? 'selected' : ''}" data-id="${e.id}">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${checkbox}
                            <span class="entry-label">${labelHtml}</span>
                        </div>
                        <span class="entry-hours">${e.hours.toFixed(2)} h</span>
                    </div>
                `;
            }).join('');

            // Re-attach listeners
            listEl.querySelectorAll('.entry-item').forEach(item => {
                item.addEventListener('click', (ev) => {
                    if (ev.target.classList.contains('entry-checkbox')) return;
                    if (multiSelectMode) {
                        toggleSelection(item.dataset.id);
                    } else {
                        openEditModal(item.dataset.id);
                    }
                });
                const cb = item.querySelector('.entry-checkbox');
                if (cb) cb.addEventListener('change', () => toggleSelection(item.dataset.id));
            });
        }
    }

    // Multi-Select Bar Status
    updateSelectionBar();

    // Dashboard
    const totalHours = monthEntries.reduce((s, e) => s + e.hours, 0);
    const totalWage = totalHours * (settings.hourlyWage || 0);

    const hEl = document.getElementById('dash-hours');
    const wEl = document.getElementById('dash-wage');
    if (hEl) hEl.textContent = `${totalHours.toFixed(2)} h`;
    if (wEl) wEl.textContent = `CHF ${totalWage.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`;
}

// ============================================================
// MULTI SELECT
// ============================================================

function toggleMultiSelectMode() {
    multiSelectMode = !multiSelectMode;
    selectedIds.clear();
    const btn = document.getElementById('btn-multi-select');
    if (btn) btn.classList.toggle('active', multiSelectMode);
    updateSelectionBar();
    refreshEntries();
}

function toggleSelection(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    updateSelectionBar();
    refreshEntries();
}

function updateSelectionBar() {
    const bar = document.getElementById('multi-select-bar');
    const count = document.getElementById('multi-select-count');
    if (bar) bar.classList.toggle('hidden', !multiSelectMode);
    if (count) count.textContent = `${selectedIds.size} ausgewählt`;
}

// ============================================================
// PICKERS (Simplified Logic)
// ============================================================

const TimePicker = {
    modal: document.getElementById('modal-time-picker'),
    wheelHours: document.getElementById('wheel-hours'),
    wheelMinutes: document.getElementById('wheel-minutes'),
    btnSet: document.getElementById('btn-time-set'),
    targetInput: null,

    init() {
        if (!this.modal || !this.wheelHours || !this.wheelMinutes) return;

        // Generate wheels
        let hHtml = '';
        for (let i = 0; i < 24; i++) hHtml += `<div class="wheel-item" data-val="${i}">${String(i).padStart(2, '0')}</div>`;
        this.wheelHours.innerHTML = hHtml;

        let mHtml = '';
        for (let i = 0; i < 60; i += 15) mHtml += `<div class="wheel-item" data-val="${i}">${String(i).padStart(2, '0')}</div>`;
        this.wheelMinutes.innerHTML = mHtml;

        // Events
        [this.wheelHours, this.wheelMinutes].forEach(w => {
            w.addEventListener('wheel', (e) => {
                e.preventDefault();
                const direction = e.deltaY > 0 ? 1 : -1;
                w.scrollTop += direction * 40;
                this.snap(w);
            }, { passive: false });

            // Drag support
            let isDown = false, startY, scrollT;
            w.addEventListener('mousedown', (e) => {
                isDown = true;
                w.classList.add('is-grabbing');
                startY = e.pageY - w.offsetTop;
                scrollT = w.scrollTop;
            });
            w.addEventListener('mouseleave', () => {
                if (isDown) {
                    isDown = false;
                    w.classList.remove('is-grabbing');
                    this.snap(w);
                }
            });
            w.addEventListener('mouseup', () => {
                if (isDown) {
                    isDown = false;
                    w.classList.remove('is-grabbing');
                    this.snap(w);
                }
            });
            w.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const y = e.pageY - w.offsetTop;
                const walk = (y - startY) * 0.7;
                w.scrollTop = scrollT - walk;
            });

            w.addEventListener('click', (e) => {
                const item = e.target.closest('.wheel-item');
                if (item) {
                    const idx = Array.from(w.children).indexOf(item);
                    w.scrollTo({ top: idx * 40, behavior: 'smooth' });
                    setTimeout(() => this.updateActive(w), 150);
                }
            });
            w.addEventListener('scroll', () => {
                this.updateActive(w);
            });
        });

        this.btnSet?.addEventListener('click', () => {
            const h = this.getSelectedVal(this.wheelHours);
            const m = this.getSelectedVal(this.wheelMinutes);
            const val = formatTime(h, m);
            if (this.targetInput) {
                this.targetInput.value = val;
                this.targetInput.dispatchEvent(new Event('input'));
            }
            this.modal.classList.add('hidden');
        });
    },

    snap(w) {
        clearTimeout(w._snapTimer);
        w._snapTimer = setTimeout(() => {
            const idx = Math.round(w.scrollTop / 40);
            w.scrollTo({ top: idx * 40, behavior: 'smooth' });
            this.updateActive(w);
        }, 100);
    },

    updateActive(w) {
        const idx = Math.round(w.scrollTop / 40);
        const items = w.querySelectorAll('.wheel-item');
        items.forEach((it, i) => it.classList.toggle('active', i === idx));
    },

    getSelectedVal(w) {
        const active = w.querySelector('.wheel-item.active');
        return active ? parseInt(active.dataset.val) : 0;
    },

    open(input, title) {
        this.targetInput = input;
        const titleEl = document.getElementById('time-picker-title');
        if (titleEl) titleEl.textContent = title;
        this.modal?.classList.remove('hidden');

        let h = 0, m = 0;
        if (input.value) {
            [h, m] = input.value.split(':').map(Number);
            m = Math.round(m / 15) * 15;
            if (m === 60) { m = 0; h = (h + 1) % 24; }
        } else {
            // Smart Defaults: 4h ago for 'from'
            const now = new Date();
            if (input.id === 'entry-from' || input.id === 'edit-from') {
                now.setHours(now.getHours() - 4);
            }
            h = now.getHours();
            m = Math.round(now.getMinutes() / 15) * 15;
            if (m === 60) { m = 0; h = (h + 1) % 24; }
        }

        setTimeout(() => {
            this.scrollToVal(this.wheelHours, h);
            this.scrollToVal(this.wheelMinutes, m);
        }, 10);
    },

    scrollToVal(w, val) {
        const items = Array.from(w.querySelectorAll('.wheel-item'));
        const idx = items.findIndex(it => parseInt(it.dataset.val) === val);
        if (idx !== -1) {
            w.scrollTo({ top: idx * 40, behavior: 'auto' });
            this.updateActive(w);
        }
    }
};

const DatePicker = {
    modal: document.getElementById('modal-date-picker'),
    wheelDays: document.getElementById('wheel-days'),
    wheelMonths: document.getElementById('wheel-months'),
    wheelYears: document.getElementById('wheel-years'),
    btnSet: document.getElementById('btn-date-set'),
    targetInput: null,

    init() {
        if (!this.modal || !this.wheelDays || !this.wheelMonths || !this.wheelYears) return;

        // Generate Months
        let mHtml = '';
        MONTHS.forEach((m, i) => {
            mHtml += `<div class="wheel-item" data-val="${i + 1}">${m.substr(0, 3)}</div>`;
        });
        this.wheelMonths.innerHTML = mHtml;

        // Years
        const curY = new Date().getFullYear();
        let yHtml = '';
        for (let y = curY - 5; y <= curY + 5; y++) {
            yHtml += `<div class="wheel-item" data-val="${y}">${y}</div>`;
        }
        this.wheelYears.innerHTML = yHtml;

        this.refreshDays();

        // Events
        [this.wheelDays, this.wheelMonths, this.wheelYears].forEach(w => {
            w.addEventListener('wheel', (e) => {
                e.preventDefault();
                const direction = e.deltaY > 0 ? 1 : -1;
                w.scrollTop += direction * 40;
                this.snap(w);
            }, { passive: false });

            // Drag support
            let isDown = false, startY, scrollT;
            w.addEventListener('mousedown', (e) => {
                isDown = true;
                w.classList.add('is-grabbing');
                startY = e.pageY - w.offsetTop;
                scrollT = w.scrollTop;
            });
            w.addEventListener('mouseleave', () => {
                if (isDown) {
                    isDown = false;
                    w.classList.remove('is-grabbing');
                    this.snap(w);
                }
            });
            w.addEventListener('mouseup', () => {
                if (isDown) {
                    isDown = false;
                    w.classList.remove('is-grabbing');
                    this.snap(w);
                }
            });
            w.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const y = e.pageY - w.offsetTop;
                const walk = (y - startY) * 0.7;
                w.scrollTop = scrollT - walk;
            });

            w.addEventListener('click', (e) => {
                const item = e.target.closest('.wheel-item');
                if (item) {
                    const idx = Array.from(w.children).indexOf(item);
                    w.scrollTo({ top: idx * 40, behavior: 'smooth' });
                    setTimeout(() => this.snap(w), 150);
                }
            });
            w.addEventListener('scroll', () => {
                this.updateActive(w);
            });
        });

        this.btnSet?.addEventListener('click', () => {
            const d = this.getSelectedVal(this.wheelDays);
            const m = this.getSelectedVal(this.wheelMonths);
            const y = this.getSelectedVal(this.wheelYears);
            const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (this.targetInput) {
                this.targetInput.value = iso;
                this.targetInput.dispatchEvent(new Event('input'));
            }
            this.modal.classList.add('hidden');
        });
    },

    snap(w) {
        clearTimeout(w._snapTimer);
        w._snapTimer = setTimeout(() => {
            const idx = Math.round(w.scrollTop / 40);
            w.scrollTo({ top: idx * 40, behavior: 'smooth' });
            this.updateActive(w);
            if (w !== this.wheelDays) this.refreshDays();
        }, 100);
    },

    updateActive(w) {
        const idx = Math.round(w.scrollTop / 40);
        const items = w.querySelectorAll('.wheel-item');
        items.forEach((it, i) => it.classList.toggle('active', i === idx));
    },

    refreshDays() {
        const m = this.getSelectedVal(this.wheelMonths);
        const y = this.getSelectedVal(this.wheelYears);
        const daysInMonth = new Date(y, m, 0).getDate();

        let dHtml = '';
        for (let i = 1; i <= daysInMonth; i++) {
            dHtml += `<div class="wheel-item" data-val="${i}">${String(i).padStart(2, '0')}</div>`;
        }
        const curD = this.getSelectedVal(this.wheelDays) || 1;
        this.wheelDays.innerHTML = dHtml;
        this.scrollToVal(this.wheelDays, Math.min(curD, daysInMonth));
    },

    getSelectedVal(w) {
        const active = w.querySelector('.wheel-item.active');
        return active ? parseInt(active.dataset.val) : 1;
    },

    open(input, title) {
        this.targetInput = input;
        const titleEl = document.getElementById('date-picker-title');
        if (titleEl) titleEl.textContent = title;
        this.modal?.classList.remove('hidden');

        const date = input.value ? new Date(input.value) : new Date();
        setTimeout(() => {
            this.scrollToVal(this.wheelYears, date.getFullYear());
            this.scrollToVal(this.wheelMonths, date.getMonth() + 1);
            this.refreshDays();
            this.scrollToVal(this.wheelDays, date.getDate());
        }, 10);
    },

    scrollToVal(w, val) {
        const items = Array.from(w.querySelectorAll('.wheel-item'));
        const idx = items.findIndex(it => parseInt(it.dataset.val) === val);
        if (idx !== -1) {
            w.scrollTo({ top: idx * 40, behavior: 'auto' });
            this.updateActive(w);
        }
    }
};

// ============================================================
// MODALS (EDIT & SETTINGS)
// ============================================================

let editingId = null;
const elEditModal = document.getElementById('modal-edit');
const elSettingsModal = document.getElementById('modal-settings');

const elEditDate = document.getElementById('edit-date');
const elEditFrom = document.getElementById('edit-from');
const elEditTo = document.getElementById('edit-to');

function openEditModal(id) {
    const entry = entriesCache.find(e => e.id === id);
    if (!entry) return;
    editingId = id;
    if (elEditDate) elEditDate.value = entry.date;
    if (elEditFrom) elEditFrom.value = entry.from;
    if (elEditTo) elEditTo.value = entry.to;

    // Update edit calc
    const h = calcHours(entry.from, entry.to);
    const ec = document.getElementById('edit-calc');
    if (ec) ec.textContent = `${h.toFixed(2)} h`;

    elEditModal?.classList.remove('hidden');
}

// Edit Modal Actions
document.getElementById('btn-edit-save')?.addEventListener('click', () => {
    if (!editingId) return;
    const idx = entriesCache.findIndex(e => e.id === editingId);
    if (idx !== -1) {
        entriesCache[idx] = {
            ...entriesCache[idx],
            date: elEditDate.value,
            from: elEditFrom.value,
            to: elEditTo.value,
            hours: calcHours(elEditFrom.value, elEditTo.value)
        };
        localStorage.setItem(STORAGE.ENTRIES, JSON.stringify(entriesCache));
        syncWrite();
        refreshEntries();
    }
    elEditModal.classList.add('hidden');
    editingId = null;
    showToast('Aktualisiert');
});

document.getElementById('btn-edit-delete')?.addEventListener('click', () => {
    if (!editingId) return;
    if (!confirm('Eintrag löschen?')) return;
    deleteEntryById(editingId);
    elEditModal.classList.add('hidden');
    editingId = null;
    showToast('Gelöscht');
});

document.getElementById('btn-edit-cancel')?.addEventListener('click', () => {
    elEditModal.classList.add('hidden');
    editingId = null;
});

// Edit Calc sync
[elEditFrom, elEditTo].forEach(el => el?.addEventListener('input', () => {
    const h = calcHours(elEditFrom.value, elEditTo.value);
    const ec = document.getElementById('edit-calc');
    if (ec) ec.textContent = `${h.toFixed(2)} h`;
}));

// ============================================================
// EXCEL EXPORT (HIGH PRECISION)
// ============================================================

function exportExcel() {
    const select = document.getElementById('export-month-select');
    if (!select) return;

    const [year, month] = select.value.split('-').map(Number);
    const settings = getSettings();
    const wage = settings.hourlyWage || 0;

    const monthEntries = entriesCache
        .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === month && d.getFullYear() === year;
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));

    if (monthEntries.length === 0) {
        showToast('Keine Einträge für diesen Monat');
        return;
    }

    const ws = {};
    const colNames = EXCEL_STYLES.COL_NAMES;

    // 1. Header
    ws['A1'] = { v: 'Zimmerei', t: 's', s: EXCEL_STYLES.CELL_STYLES.TITLE };
    ws['!merges'] = EXCEL_STYLES.MERGES;

    const headers = EXCEL_STYLES.HEADER_LABELS;
    headers.forEach((h, i) => {
        ws[colNames[i] + '2'] = { v: h, t: 's', s: EXCEL_STYLES.CELL_STYLES.HEADER };
    });

    // 2. Data
    let runningTotal = 0;
    monthEntries.forEach((e, idx) => {
        const r = idx + 3;
        runningTotal += e.hours;

        // Date conversion
        const dateObj = new Date(e.date);
        ws['A' + r] = { v: dateObj, t: 'd', z: EXCEL_STYLES.FORMATS.DATE, s: EXCEL_STYLES.CELL_STYLES.DATA_LEFT };

        // Time conversion (HH:mm -> fraction of day)
        const parseTime = (t) => {
            if (!t || typeof t !== 'string' || !t.includes(':')) return 0;
            const [h, m] = t.split(':').map(Number);
            if (isNaN(h) || isNaN(m)) return 0;
            return (h + m / 60) / 24;
        };

        ws['B' + r] = { v: parseTime(e.from), t: 'n', z: EXCEL_STYLES.FORMATS.TIME, s: EXCEL_STYLES.CELL_STYLES.DATA_CENTER };
        ws['C' + r] = { v: parseTime(e.to), t: 'n', z: EXCEL_STYLES.FORMATS.TIME, s: EXCEL_STYLES.CELL_STYLES.DATA_CENTER };
        ws['D' + r] = { v: Number(e.hours.toFixed(2)), t: 'n', z: EXCEL_STYLES.FORMATS.HOURS, s: EXCEL_STYLES.CELL_STYLES.DATA_RIGHT };
        ws['E' + r] = { v: Number(runningTotal.toFixed(2)), t: 'n', z: EXCEL_STYLES.FORMATS.HOURS, s: EXCEL_STYLES.CELL_STYLES.DATA_RIGHT };
        ws['F' + r] = { v: Number((e.hours * wage).toFixed(2)), t: 'n', z: EXCEL_STYLES.FORMATS.CURRENCY, s: EXCEL_STYLES.CELL_STYLES.DATA_RIGHT };
    });

    // 3. Total Row (draw line across all columns A-F)
    const lastR = monthEntries.length + 3;
    ws['A' + lastR] = { v: '', t: 's', s: EXCEL_STYLES.CELL_STYLES.TOTAL_EMPTY };
    ws['B' + lastR] = { v: '', t: 's', s: EXCEL_STYLES.CELL_STYLES.TOTAL_EMPTY };
    ws['C' + lastR] = { v: '', t: 's', s: EXCEL_STYLES.CELL_STYLES.TOTAL_EMPTY };
    ws['D' + lastR] = { v: 'Total', t: 's', s: EXCEL_STYLES.CELL_STYLES.TOTAL_LABEL };
    ws['E' + lastR] = { v: Number(runningTotal.toFixed(2)), t: 'n', z: EXCEL_STYLES.FORMATS.HOURS, s: EXCEL_STYLES.CELL_STYLES.TOTAL };
    ws['F' + lastR] = { v: Number((runningTotal * wage).toFixed(2)), t: 'n', z: EXCEL_STYLES.FORMATS.CURRENCY, s: EXCEL_STYLES.CELL_STYLES.TOTAL };

    ws['!ref'] = `A1:F${lastR}`;
    ws['!cols'] = EXCEL_STYLES.COLUMN_WIDTHS;

    const wb = XLSX.utils.book_new();
    const sheetName = `${MONTHS[month]} ${year}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Stunden - ${sheetName}.xlsx`);

    document.getElementById('modal-export-selection')?.classList.add('hidden');
    showToast('Excel exportiert');
}

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    // Entry Form
    const elDate = document.getElementById('entry-date');
    const elFrom = document.getElementById('entry-from');
    const elTo = document.getElementById('entry-to');
    const elCalc = document.getElementById('calculated-hours');

    function setSmartPresets() {
        const now = new Date();
        const fromDate = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        // Round to nearest 15 mins
        const mins = fromDate.getMinutes();
        const roundedMins = Math.round(mins / 15) * 15;
        fromDate.setMinutes(roundedMins);
        fromDate.setSeconds(0);

        if (elFrom) elFrom.value = formatTime(fromDate.getHours(), fromDate.getMinutes());
        if (elTo) elTo.value = formatTime(now.getHours(), now.getMinutes());
        updateCalc();
    }

    if (elDate) elDate.value = todayISO();
    // setSmartPresets removed as per user request to start with --:--

    function updateCalc() {
        if (elFrom && elTo && elFrom.value && elTo.value) {
            const h = calcHours(elFrom.value, elTo.value);
            elCalc.textContent = `${h.toFixed(2)} h`;
        } else {
            if (elCalc) elCalc.innerHTML = '&mdash;';
        }
    }

    elFrom?.addEventListener('input', updateCalc);
    elTo?.addEventListener('input', updateCalc);

    document.getElementById('btn-save')?.addEventListener('click', () => {
        if (!elDate.value || !elFrom.value || !elTo.value) {
            showToast('Bitte alles ausfüllen');
            return;
        }
        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            date: elDate.value,
            from: elFrom.value,
            to: elTo.value,
            hours: calcHours(elFrom.value, elTo.value)
        };
        entriesCache.push(entry);
        localStorage.setItem(STORAGE.ENTRIES, JSON.stringify(entriesCache));
        syncWrite();
        refreshEntries();

        showToast('Gespeichert');
        // Clear fields and reset to native --:--
        elFrom.value = '';
        elTo.value = '';
        elDate.value = todayISO();
        updateCalc(); // This will now set it back to &mdash;
    });

    // Pickers (Icon + Input click)
    document.getElementById('btn-picker-from')?.addEventListener('click', () => TimePicker.open(elFrom, 'Von'));
    elFrom?.addEventListener('click', () => TimePicker.open(elFrom, 'Von'));

    document.getElementById('btn-picker-to')?.addEventListener('click', () => TimePicker.open(elTo, 'Bis'));
    elTo?.addEventListener('click', () => TimePicker.open(elTo, 'Bis'));

    document.getElementById('btn-edit-picker-from')?.addEventListener('click', () => TimePicker.open(elEditFrom, 'Von'));
    elEditFrom?.addEventListener('click', () => TimePicker.open(elEditFrom, 'Von'));

    document.getElementById('btn-edit-picker-to')?.addEventListener('click', () => TimePicker.open(elEditTo, 'Bis'));
    elEditTo?.addEventListener('click', () => TimePicker.open(elEditTo, 'Bis'));

    document.getElementById('btn-picker-date')?.addEventListener('click', () => DatePicker.open(elDate, 'Datum'));
    elDate?.addEventListener('click', () => DatePicker.open(elDate, 'Datum'));

    document.getElementById('btn-edit-picker-date')?.addEventListener('click', () => DatePicker.open(elEditDate, 'Datum'));
    elEditDate?.addEventListener('click', () => DatePicker.open(elEditDate, 'Datum'));

    // Dashboard
    document.getElementById('btn-show-entries')?.addEventListener('click', () => switchView('view-entries'));
    document.getElementById('btn-export-xlsx')?.addEventListener('click', () => {
        const select = document.getElementById('export-month-select');
        if (select) {
            const months = new Set();
            entriesCache.forEach(e => {
                const d = new Date(e.date);
                months.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
            });
            const now = new Date();
            months.add(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);
            const sorted = Array.from(months).sort().reverse();
            select.innerHTML = sorted.map(m => {
                const [y, mm] = m.split('-').map(Number);
                const label = `${MONTHS[mm]} ${y}`;
                return `<option value="${m}" ${mm === now.getMonth() && y === now.getFullYear() ? 'selected' : ''}>${label}</option>`;
            }).join('');
        }
        document.getElementById('modal-export-selection')?.classList.remove('hidden');
    });
    document.getElementById('btn-export-confirm')?.addEventListener('click', exportExcel);
    document.getElementById('btn-export-cancel')?.addEventListener('click', () => document.getElementById('modal-export-selection').classList.add('hidden'));

    // Multi-Select Delete
    document.getElementById('btn-delete-selected')?.addEventListener('click', async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`${selectedIds.size} Einträge wirklich löschen?`)) return;
        for (const id of selectedIds) {
            entriesCache = entriesCache.filter(e => e.id !== id);
        }
        localStorage.setItem(STORAGE.ENTRIES, JSON.stringify(entriesCache));
        syncWrite();
        selectedIds.clear();
        multiSelectMode = false;

        // UI Fix: Ensure the multi-select icon is no longer lit up
        const btnSelect = document.getElementById('btn-multi-select');
        if (btnSelect) btnSelect.classList.remove('active');

        refreshEntries();
        showToast('Einträge gelöscht');
    });

    // Month Nav
    document.getElementById('btn-prev-month')?.addEventListener('click', () => {
        viewMonth.setMonth(viewMonth.getMonth() - 1);
        refreshEntries();
    });
    document.getElementById('btn-next-month')?.addEventListener('click', () => {
        viewMonth.setMonth(viewMonth.getMonth() + 1);
        refreshEntries();
    });

    document.getElementById('btn-multi-select')?.addEventListener('click', toggleMultiSelectMode);

    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        const s = getSettings();
        const urlIn = document.getElementById('setting-script-url');
        const wageIn = document.getElementById('setting-wage');
        if (urlIn) urlIn.value = s.scriptUrl;
        if (wageIn) wageIn.value = s.hourlyWage;
        elSettingsModal?.classList.remove('hidden');
    });
    document.getElementById('btn-settings-save')?.addEventListener('click', () => {
        const s = {
            scriptUrl: document.getElementById('setting-script-url')?.value || '',
            hourlyWage: parseFloat(document.getElementById('setting-wage')?.value || '38')
        };
        saveSettings(s);
        elSettingsModal?.classList.add('hidden');
        showToast('Einstellungen gespeichert');
        refreshEntries();
    });
    document.getElementById('btn-settings-cancel')?.addEventListener('click', () => elSettingsModal.classList.add('hidden'));

    // General Modal Closes
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close');
            document.getElementById(modalId)?.classList.add('hidden');
        });
    });

    // Initialization calls
    TimePicker.init();
    DatePicker.init();
    loadEntries();
    syncRead();

    // Set initial view
    switchView('view-entry');
}

// Start App
window.addEventListener('DOMContentLoaded', init);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered', reg))
            .catch(err => console.log('SW failed', err));
    });
}
