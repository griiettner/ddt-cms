import { api } from './utils/api.js';

class TestCasesEditor {
    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.releaseId = urlParams.get('release') || localStorage.getItem('selectedReleaseId');
        this.testSetId = urlParams.get('testSetId');
        
        this.scenarios = [];
        this.selectedScenarioId = null;
        this.steps = [];
        this.config = { types: [], actions: [] };
        
        this.modals = {
            options: { type: null, el: document.getElementById('options-modal') },
            array: { stepId: null, el: document.getElementById('array-modal') }
        };

        if (!this.testSetId || !this.releaseId) {
            alert('Missing Release ID or Test Set ID');
            window.location.href = '/test-sets.html';
            return;
        }

        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadTestSetInfo();
        await this.loadScenarios();
        this.setupEventListeners();
    }

    async loadConfig() {
        try {
            const typesRes = await api.get(`/api/config/${this.releaseId}/types`);
            const actionsRes = await api.get(`/api/config/${this.releaseId}/actions`);
            this.config.types = typesRes.data;
            this.config.actions = actionsRes.data;
        } catch (err) { console.error('Config failed', err); }
    }

    async loadTestSetInfo() {
        try {
            const res = await api.get(`/api/test-sets/${this.releaseId}/${this.testSetId}`);
            document.getElementById('test-set-name').textContent = res.data.name;
        } catch (err) { console.error(err); }
    }

    async loadScenarios() {
        try {
            const res = await api.get(`/api/test-cases/all-scenarios/${this.releaseId}?testSetId=${this.testSetId}`);
            this.scenarios = res.data;
            this.renderSidebar();
            if (this.scenarios.length > 0 && !this.selectedScenarioId) {
                this.selectScenario(this.scenarios[0].id);
            }
        } catch (err) { console.error(err); }
    }

    renderSidebar() {
        const list = document.getElementById('scenario-list');
        const header = list.querySelector('.sidebar-header');
        list.innerHTML = '';
        list.appendChild(header);

        // Group scenarios by case
        const groups = {};
        this.scenarios.forEach(s => {
            if (!groups[s.case_name]) groups[s.case_name] = [];
            groups[s.case_name].push(s);
        });

        if (!this.openCases) this.openCases = new Set();
        
        // Auto-open group containing selected scenario
        const selectedScenario = this.scenarios.find(s => s.id == this.selectedScenarioId);
        if (selectedScenario) this.openCases.add(selectedScenario.case_name);

        Object.entries(groups).forEach(([caseName, scenarios]) => {
            const container = document.createElement('div');
            container.className = `case-accordion ${this.openCases.has(caseName) ? 'open' : ''}`;
            
            container.innerHTML = `
                <div class="case-header">
                    <span class="case-title">${caseName}</span>
                    <svg class="chevron w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                <div class="scenario-list">
                    ${scenarios.map(s => `
                        <div class="scenario-tab ${this.selectedScenarioId == s.id ? 'active' : ''}" data-id="${s.id}">
                            ${s.name}
                        </div>
                    `).join('')}
                </div>
            `;

            // Toggle logic
            container.querySelector('.case-header').onclick = (e) => {
                const isOpen = container.classList.toggle('open');
                if (isOpen) this.openCases.add(caseName);
                else this.openCases.delete(caseName);
            };

            // Scenario selection logic
            container.querySelectorAll('.scenario-tab').forEach(tab => {
                tab.onclick = (e) => {
                    e.stopPropagation();
                    this.selectScenario(tab.dataset.id);
                };
            });

            list.appendChild(container);
        });
    }

    async selectScenario(id) {
        this.selectedScenarioId = id;
        this.renderSidebar();
        
        const scenario = this.scenarios.find(s => s.id == id);
        document.getElementById('scenario-title').textContent = scenario.name;
        
        await this.loadSteps();
    }

    async loadSteps() {
        try {
            const res = await api.get(`/api/test-steps/${this.releaseId}?scenarioId=${this.selectedScenarioId}`);
            this.steps = res.data;
            this.renderSteps();
        } catch (err) { console.error(err); }
    }

    renderSteps() {
        const tbody = document.getElementById('steps-tbody');
        const emptyState = document.getElementById('empty-state');
        tbody.innerHTML = '';

        if (this.steps.length === 0) {
            emptyState.classList.remove('hidden');
            // Render 10 skeleton rows that fade out
            tbody.innerHTML = Array(10).fill(0).map((_, i) => `
                <tr class="skeleton-row" style="opacity: ${Math.max(0.1, 1 - (i * 0.1))}">
                    <td><div class="skeleton-bone" style="width: 80%"></div></td>
                    <td><div class="skeleton-bone" style="width: 60%"></div></td>
                    <td><div class="skeleton-bone" style="width: 40%"></div></td>
                    <td><div class="skeleton-bone" style="width: 50%"></div></td>
                    <td><div class="skeleton-bone" style="width: 70%"></div></td>
                    <td><div class="skeleton-bone" style="width: 20px"></div></td>
                    <td><div class="skeleton-bone" style="width: 90%"></div></td>
                </tr>
            `).join('');
            return;
        }

        if (this.steps.length > 0) {
            emptyState.classList.add('hidden');
        }
        
        this.steps.forEach(step => {
            const tr = document.createElement('tr');
            tr.dataset.id = step.id;
            
            tr.innerHTML = `
                <td><input id="step-definition-${step.id}" class="cell-input" data-field="step_definition" value="${step.step_definition || ''}"></td>
                <td>${this.renderSelectCell('type', step.type)}</td>
                <td><input id="element-id-${step.id}" class="cell-input" data-field="element_id" value="${step.element_id || ''}"></td>
                <td>${this.renderSelectCell('action', step.action)}</td>
                <td>${this.renderActionResultCell(step)}</td>
                <td><input id="required-${step.id}" type="checkbox" class="ml-4" ${step.required ? 'checked' : ''} data-field="required"></td>
                <td><input id="expected-results-${step.id}" class="cell-input" data-field="expected_results" value="${step.expected_results || ''}"></td>
            `;

            // Attach listeners to standard inputs
            tr.querySelectorAll('.cell-input, input[type="checkbox"]').forEach(input => {
                if (input.type === 'checkbox') {
                    // Checkboxes save on change, not blur
                    input.onchange = () => {
                        const s = this.steps.find(x => x.id == step.id);
                        if (s) s[input.dataset.field] = input.checked;
                        this.saveStepField(step.id, input.dataset.field, input.checked);
                    };
                } else {
                    // Text inputs save on blur
                    input.oninput = () => {
                        const s = this.steps.find(x => x.id == step.id);
                        if (s) s[input.dataset.field] = input.value;
                    };
                    input.onblur = () => this.saveStepField(step.id, input.dataset.field, input.value);
                    input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); };
                }
            });

            // Attach listeners to custom selects
            tr.querySelectorAll('.custom-select').forEach(select => {
                select.onchange = () => {
                    this.saveStepField(step.id, select.dataset.field, select.value);
                    if (select.dataset.field === 'action') this.loadSteps(); // Refresh to update result cell type
                };
            });

            tr.querySelectorAll('.pencil-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.openOptionsModal(btn.dataset.category);
                };
            });

            tbody.appendChild(tr);
        });
    }

    renderSelectCell(category, value) {
        const options = this.config[category + 's'] || [];
        return `
            <div class="select-container">
                <select class="custom-select" data-field="${category}">
                    <option value="">-- Select --</option>
                    ${options.map(o => `<option value="${o.key}" ${o.key === value ? 'selected' : ''}>${o.display_name}</option>`).join('')}
                </select>
                <div class="pencil-btn" data-category="${category}">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
                </div>
            </div>
        `;
    }

    renderActionResultCell(step) {
        // Logic dependent on Action
        const action = this.config.actions.find(a => a.key === step.action);
        const type = action ? action.result_type : 'text';

        if (type === 'disabled') {
            return `<input class="cell-input bg-co-gray-50 cursor-not-allowed" disabled value="N/A">`;
        }
        
        if (type === 'bool') {
            const isChecked = step.action_result === 'true' || step.action_result === 1 || step.action_result === '1';
            return `<input type="checkbox" class="ml-4" ${isChecked ? 'checked' : ''} data-field="action_result">`;
        }

        if (type === 'array') {
            return `
                <button class="array-val-trigger" data-id="${step.id}">
                    ${step.action_result || '[]'}
                </button>
            `;
        }

        if (type === 'select') {
             // For now, text input for simple select. If user wants specific select list, we'd need another config.
             // But the prompt says "same custom select UX" for URL/Select? 
             // That implies a dropdown. I'll use a text input for now or a dummy select.
             return `<input class="cell-input" data-field="action_result" value="${step.action_result || ''}" placeholder="Value...">`;
        }

        return `<input class="cell-input" data-field="action_result" value="${step.action_result || ''}">`;
    }

    async saveStepField(stepId, field, value) {
        // Skip temp IDs - they get synced separately
        if (stepId.toString().startsWith('temp')) return;
        
        try {
            await api.patch(`/api/test-steps/${this.releaseId}/${stepId}`, { [field]: value });
        } catch (err) { console.error('Save failed', err); }
    }

    openOptionsModal(category) {
        this.modals.options.type = category;
        const options = this.config[category + 's'];
        document.getElementById('options-modal-title').textContent = `Edit ${category.toUpperCase()} Options`;
        document.getElementById('options-textarea').value = options.map(o => o.display_name).join('\n');
        this.modals.options.el.style.display = 'flex';
    }

    async saveOptions() {
        const category = this.modals.options.type;
        const text = document.getElementById('options-textarea').value;
        const lines = text.split('\n').filter(l => l.trim());
        const options = lines.map(l => ({ display_name: l.trim() }));

        try {
            await api.post(`/api/config/${this.releaseId}/${category}/bulk`, { options });
            this.modals.options.el.style.display = 'none';
            await this.loadConfig();
            this.renderSteps();
        } catch (err) { alert(err.message); }
    }

    setupEventListeners() {
        const scenarioModal = document.getElementById('scenario-modal');
        const scenarioForm = document.getElementById('scenario-form');
        const caseModal = document.getElementById('case-modal');
        const caseForm = document.getElementById('case-form');

        // New Case Handlers
        document.getElementById('add-case-btn').onclick = () => {
            caseModal.style.display = 'flex';
        };

        caseForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('case-name-input').value;
            try {
                await api.post(`/api/test-cases/${this.releaseId}`, {
                    testSetId: this.testSetId,
                    name
                });
                caseModal.style.display = 'none';
                caseForm.reset();
                await this.loadScenarios(); // This will show the auto-created default scenario
            } catch (err) { alert(err.message); }
        };

        // New Scenario Handlers
        document.getElementById('add-scenario-btn').onclick = async () => {
            try {
                const casesRes = await api.get(`/api/test-cases/${this.releaseId}?testSetId=${this.testSetId}`);
                const selector = document.getElementById('case-selector');
                
                if (casesRes.data.length === 0) {
                    // Help the user by suggesting they create a case first
                    if (confirm('A Test Case is required to hold scenarios. Would you like to create one now?')) {
                        document.getElementById('add-case-btn').click();
                    }
                    return;
                }

                selector.innerHTML = casesRes.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                scenarioModal.style.display = 'flex';
            } catch (err) { alert(err.message); }
        };

        scenarioForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('scenario-name-input').value;
            const testCaseId = document.getElementById('case-selector').value;

            try {
                const res = await api.post(`/api/test-cases/scenarios/${this.releaseId}`, {
                    testCaseId,
                    name
                });
                scenarioModal.style.display = 'none';
                scenarioForm.reset();
                this.selectedScenarioId = res.data.id; // Auto-select new
                await this.loadScenarios();
            } catch (err) { alert(err.message); }
        };

        document.getElementById('add-step-btn').onclick = async () => {
            if (!this.selectedScenarioId) return;
            
            // Immediate UI feedback
            document.getElementById('empty-state').classList.add('hidden');
            
            const tempId = `temp-${Date.now()}`;
            const newStep = { 
                id: tempId, 
                step_definition: '', 
                order_index: this.steps.length 
            };
            
            this.steps.push(newStep);
            this.renderSteps(); // This one is okay, it happens before typing
            
            const row = document.querySelector(`tr[data-id="${tempId}"]`);
            if (row) row.querySelector('input').focus();

            try {
                // Sync with server without re-rendering the whole table
                const res = await api.post(`/api/test-steps/${this.releaseId}/sync`, {
                    scenarioId: this.selectedScenarioId,
                    steps: this.steps.map(s => {
                        const { id, ...rest } = s;
                        return id.toString().startsWith('temp') ? { step_definition: '', ...rest } : s;
                    })
                });
                
                // Silver lining: we update the IDs in the background so future saves work
                const freshRes = await api.get(`/api/test-steps/${this.releaseId}?scenarioId=${this.selectedScenarioId}`);
                this.steps = freshRes.data;
                // We update the data-id on the live rows so we don't need a full render
                const rows = document.getElementById('steps-tbody').querySelectorAll('tr');
                this.steps.forEach((s, i) => {
                    if (rows[i]) rows[i].dataset.id = s.id;
                });
            } catch (err) { console.error(err); }
        };

        document.getElementById('save-options-btn').onclick = () => this.saveOptions();
        
        document.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => {
                this.modals.options.el.style.display = 'none';
                this.modals.array.el.style.display = 'none';
                scenarioModal.style.display = 'none';
                caseModal.style.display = 'none';
            };
        });

        // Delegate Array clicks
        document.getElementById('steps-tbody').addEventListener('click', (e) => {
            if (e.target.classList.contains('array-val-trigger')) {
                this.openArrayModal(e.target.dataset.id, e.target.textContent.trim());
            }
        });

        document.getElementById('save-array-btn').onclick = () => this.saveArray();

        // Editable Scenario Title logic
        const scenarioTitle = document.getElementById('scenario-title');
        scenarioTitle.onblur = async () => {
            const newName = scenarioTitle.textContent.trim();
            if (!newName || !this.selectedScenarioId) return;

            try {
                await api.patch(`/api/test-cases/scenarios/${this.releaseId}/${this.selectedScenarioId}`, { name: newName });
                // Update local list
                const s = this.scenarios.find(x => x.id == this.selectedScenarioId);
                if (s) {
                    s.name = newName;
                    this.renderSidebar(); // Refresh sidebar to show new name immediately
                }
            } catch (err) { console.error('Failed to save scenario title', err); }
        };

        scenarioTitle.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                scenarioTitle.blur();
            }
        };

        window.onclick = (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.style.display = 'none';
            }
        };
    }

    openArrayModal(stepId, currentVal) {
        this.modals.array.stepId = stepId;
        try {
            const arr = JSON.parse(currentVal || '[]');
            document.getElementById('array-textarea').value = arr.join('\n');
        } catch (e) {
            document.getElementById('array-textarea').value = '';
        }
        this.modals.array.el.style.display = 'flex';
    }

    async saveArray() {
        const text = document.getElementById('array-textarea').value;
        const arr = text.split('\n').filter(l => l.trim());
        const json = JSON.stringify(arr);
        
        await this.saveStepField(this.modals.array.stepId, 'action_result', json);
        this.modals.array.el.style.display = 'none';
        await this.loadSteps();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TestCasesEditor();
});
