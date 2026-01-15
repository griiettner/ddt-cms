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
            array: { stepId: null, el: document.getElementById('array-modal') },
            selectConfig: { stepId: null, el: document.getElementById('select-config-modal') },
            matchConfig: { stepId: null, el: document.getElementById('match-config-modal') }
        };
        
        this.selectConfigs = []; // For Custom Select / URL actions
        this.matchConfigs = [];  // For Options Match action

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
            
            // Load global select configs (for Custom Select / URL)
            const selectConfigsRes = await api.get('/api/select-configs');
            this.selectConfigs = selectConfigsRes.data;
            
            // Load global match configs (for Options Match)
            const matchConfigsRes = await api.get('/api/match-configs');
            this.matchConfigs = matchConfigsRes.data;
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
        
        // Show delete button when a scenario is selected
        document.getElementById('delete-scenario-btn').classList.remove('hidden');
        
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
                <td>${this.renderActionSelect(step.action)}</td>
                <td>${this.renderActionResultCell(step)}</td>
                <td><input id="required-${step.id}" type="checkbox" class="ml-4" ${step.required ? 'checked' : ''} data-field="required"></td>
                <td><input id="expected-results-${step.id}" class="cell-input" data-field="expected_results" value="${step.expected_results || ''}"></td>
            `;

            // Attach listeners to standard inputs
            tr.querySelectorAll('.cell-input, input[type="checkbox"]').forEach(input => {
                // Skip inputs without data-field (like readonly Options Match display)
                if (!input.dataset.field) return;
                
                if (input.type === 'checkbox') {
                    // Checkboxes save on change, not blur - convert to string for DB
                    input.onchange = () => {
                        const val = input.checked ? 'true' : 'false';
                        const s = this.steps.find(x => x.id == step.id);
                        if (s) s[input.dataset.field] = val;
                        this.saveStepField(step.id, input.dataset.field, val);
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
                select.onchange = async () => {
                    this.saveStepField(step.id, select.dataset.field, select.value);
                    if (select.dataset.field === 'action') {
                        // Clear action_result when action changes
                        await this.saveStepField(step.id, 'action_result', '');
                        step.action_result = '';
                        this.loadSteps(); // Refresh to update result cell type
                    }
                };
            });

            tr.querySelectorAll('.pencil-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.openOptionsModal(btn.dataset.category);
                };
            });

            tr.querySelectorAll('.select-config-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.openSelectConfigModal(btn.dataset.stepId, btn.dataset.configType || 'custom_select');
                };
            });

            tr.querySelectorAll('.match-config-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.openMatchConfigModal(btn.dataset.stepId);
                };
            });

            tbody.appendChild(tr);
        });
    }

    renderSelectCell(category, value) {
        const options = this.config[category + 's'] || [];
        // Action is no longer editable via UI because it controls field rendering logic
        const showPencil = category !== 'action';

        return `
            <div class="select-container">
                <select class="custom-select" data-field="${category}">
                    <option value="">-- Select --</option>
                    ${options.map(o => `<option value="${o.key}" ${o.key === value ? 'selected' : ''}>${o.display_name}</option>`).join('')}
                </select>
                ${showPencil ? `
                    <div class="pencil-btn" data-category="${category}">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderActionSelect(value) {
        // Hardcoded action options as per spec
        const actions = [
            { key: 'active', label: 'Active' },
            { key: 'click', label: 'Click' },
            { key: 'custom_select', label: 'Custom Select' },
            { key: 'options_match', label: 'Options Match' },
            { key: 'text_match', label: 'Text Match' },
            { key: 'text_plain', label: 'Text Plain' },
            { key: 'url', label: 'URL' },
            { key: 'visible', label: 'Visible' }
        ];

        return `
            <select class="custom-select" data-field="action">
                <option value="">-- Select --</option>
                ${actions.map(a => `<option value="${a.key}" ${a.key === value ? 'selected' : ''}>${a.label}</option>`).join('')}
            </select>
        `;
    }

    renderActionResultCell(step) {
        // Action → Action Result mapping:
        // Active → text, Click → disabled text, Custom Select → select UX, Options Match → array modal,
        // Text Match → text, Text Plain → text, URL → select UX, Visible → checkbox
        const actionKey = step.action || '';
        
        switch (actionKey) {
            case 'active':
            case 'visible':
                const isChecked = step.action_result === 'true' || step.action_result === 1 || step.action_result === '1' || step.action_result === true;
                return `<input type="checkbox" class="ml-4" ${isChecked ? 'checked' : ''} data-field="action_result">`;
            
            case 'text_match':
            case 'text_plain':
                return `<input class="cell-input" data-field="action_result" value="${step.action_result || ''}">`;
            
            case 'click':
                return `<input class="cell-input bg-co-gray-50 cursor-not-allowed" disabled value="N/A">`;
            
            case 'custom_select':
            case 'url':
                // Look up the step's associated select config
                const configId = step.select_config_id;
                const configType = actionKey; // 'custom_select' or 'url'
                const config = this.selectConfigs.find(c => c.id == configId);
                const configOptions = config ? config.options : [];
                
                return `
                    <div class="select-container">
                        <select class="custom-select" data-field="action_result">
                            <option value="">-- Select --</option>
                            ${configOptions.map(o => `<option value="${o}" ${o === step.action_result ? 'selected' : ''}>${o}</option>`).join('')}
                        </select>
                        <div class="select-config-btn" data-step-id="${step.id}" data-config-type="${configType}" title="Manage dropdown options">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
                        </div>
                    </div>
                `;
            
            case 'options_match':
                // Uses match_configs table, displays as JSON array
                const matchConfigId = step.match_config_id;
                const matchConfig = this.matchConfigs.find(c => c.id == matchConfigId);
                const matchOptions = matchConfig ? matchConfig.options : [];
                const jsonDisplay = JSON.stringify(matchOptions);
                // Escape quotes for HTML attribute
                const escapedValue = (step.action_result || '[]').replace(/"/g, '&quot;');
                const escapedTitle = jsonDisplay.replace(/"/g, '&quot;');
                
                return `
                    <div class="select-container">
                        <input class="cell-input bg-co-gray-50 cursor-pointer" readonly 
                            value="${escapedValue}"
                            title="Options: ${escapedTitle}">
                        <div class="match-config-btn" data-step-id="${step.id}" title="Manage match options">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
                        </div>
                    </div>
                `;
            
            default:
                // No action selected or unknown action - disabled and greyed out
                return `<input class="cell-input bg-co-gray-50 cursor-not-allowed" disabled value="" placeholder="Select an action first">`;
        }
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
        const options = this.config[category + 's'] || [];
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
                const res = await api.post(`/api/test-cases/${this.releaseId}`, {
                    testSetId: this.testSetId,
                    name
                });
                caseModal.style.display = 'none';
                caseForm.reset();
                await this.loadScenarios(); 
                if (res.data.scenarioId) {
                    this.selectScenario(res.data.scenarioId);
                }
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
                await this.loadScenarios();
                if (res.data.id) {
                    this.selectScenario(res.data.id);
                }
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

        const deleteBtn = document.getElementById('delete-scenario-btn');
        deleteBtn.onclick = async () => {
            if (!this.selectedScenarioId) return;
            
            const confirmed = await this.confirmDialog({
                title: 'Delete Scenario?',
                message: `Are you sure you want to delete "${scenarioTitle.textContent.trim()}"? This will permanently remove all associated test steps.`,
                confirmText: 'Delete Scenario'
            });

            if (!confirmed) return;

            try {
                await api.delete(`/api/test-cases/scenarios/${this.releaseId}/${this.selectedScenarioId}`);
                await this.loadScenarios(); // Refresh list

                // Auto-select another scenario from the local cache if available
                if (this.scenarios.length > 0) {
                    this.selectScenario(this.scenarios[0].id);
                } else {
                    this.selectedScenarioId = null;
                    document.getElementById('scenario-title').textContent = 'Select a scenario';
                    this.steps = [];
                    this.renderSteps();
                    deleteBtn.classList.add('hidden');
                }
            } catch (err) { alert(err.message); }
        };

        document.getElementById('save-options-btn').onclick = () => this.saveOptions();
        document.getElementById('save-select-config-btn').onclick = () => this.saveSelectConfig();
        document.getElementById('save-match-config-btn').onclick = () => this.saveMatchConfig();
        
        document.querySelectorAll('.close-modal').forEach(b => {
            b.onclick = () => {
                this.modals.options.el.style.display = 'none';
                this.modals.array.el.style.display = 'none';
                this.modals.selectConfig.el.style.display = 'none';
                if (this.modals.matchConfig.el) this.modals.matchConfig.el.style.display = 'none';
                scenarioModal.style.display = 'none';
                caseModal.style.display = 'none';
                document.getElementById('confirm-modal').style.display = 'none';
            };
        });

        // Delegate Array clicks (Options Match)
        document.getElementById('steps-tbody').addEventListener('click', (e) => {
            if (e.target.classList.contains('array-val-trigger')) {
                const val = e.target.value || e.target.textContent.trim();
                this.openArrayModal(e.target.dataset.id, val);
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

    confirmDialog({ title, message, confirmText }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-title');
            const msgEl = document.getElementById('confirm-message');
            const actionBtn = document.getElementById('confirm-action-btn');
            
            titleEl.textContent = title || 'Are you sure?';
            msgEl.textContent = message || 'This action cannot be undone.';
            actionBtn.textContent = confirmText || 'Delete';
            
            modal.style.display = 'flex';
            
            const handleAction = (val) => {
                modal.style.display = 'none';
                resolve(val);
            };
            
            actionBtn.onclick = () => handleAction(true);
            modal.querySelector('.close-modal').onclick = () => handleAction(false);
        });
    }

    openSelectConfigModal(stepId, configType = 'custom_select') {
        this.modals.selectConfig.stepId = stepId;
        this.modals.selectConfig.configType = configType;
        const step = this.steps.find(s => s.id == stepId);
        
        // Filter configs by type
        const filteredConfigs = this.selectConfigs.filter(c => c.config_type === configType);
        
        // Update modal title based on type
        const modalTitle = configType === 'url' ? 'Manage URL Options' : 'Manage Select Options';
        document.querySelector('#select-config-modal .font-bold').textContent = modalTitle;
        
        // Populate the dropdown with filtered configs
        const dropdown = document.getElementById('select-config-dropdown');
        dropdown.innerHTML = '<option value="">-- Create New --</option>' +
            filteredConfigs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        // If step already has a config, select it and load its options
        if (step && step.select_config_id) {
            dropdown.value = step.select_config_id;
            const config = filteredConfigs.find(c => c.id == step.select_config_id);
            if (config) {
                document.getElementById('select-config-name').value = config.name;
                document.getElementById('select-config-options').value = config.options.join('\n');
            }
        } else {
            document.getElementById('select-config-name').value = '';
            document.getElementById('select-config-options').value = '';
        }
        
        // When dropdown changes, load that config's data
        dropdown.onchange = () => {
            const selectedId = dropdown.value;
            if (selectedId) {
                const config = filteredConfigs.find(c => c.id == selectedId);
                if (config) {
                    document.getElementById('select-config-name').value = config.name;
                    document.getElementById('select-config-options').value = config.options.join('\n');
                }
            } else {
                document.getElementById('select-config-name').value = '';
                document.getElementById('select-config-options').value = '';
            }
        };
        
        this.modals.selectConfig.el.style.display = 'flex';
    }

    async saveSelectConfig() {
        const stepId = this.modals.selectConfig.stepId;
        const selectedConfigId = document.getElementById('select-config-dropdown').value;
        const name = document.getElementById('select-config-name').value.trim();
        const optionsText = document.getElementById('select-config-options').value;
        const options = optionsText.split('\n').map(l => l.trim()).filter(l => l);
        
        if (!name) {
            alert('Please enter a name for the dropdown configuration.');
            return;
        }
        
        try {
            let configId = selectedConfigId;
            const configType = this.modals.selectConfig.configType || 'custom_select';
            
            if (selectedConfigId) {
                // Update existing config
                await api.put(`/api/select-configs/${selectedConfigId}`, { name, options });
            } else {
                // Create new config with the correct type
                const res = await api.post('/api/select-configs', { name, options, config_type: configType });
                configId = res.data.id;
            }
            
            // Associate this config with the step
            await api.patch(`/api/test-steps/${this.releaseId}/${stepId}`, { select_config_id: configId });
            
            // Reload configs and steps
            await this.loadConfig();
            await this.loadSteps();
            
            this.modals.selectConfig.el.style.display = 'none';
        } catch (err) {
            alert(err.message);
        }
    }

    openMatchConfigModal(stepId) {
        this.modals.matchConfig.stepId = stepId;
        const step = this.steps.find(s => s.id == stepId);
        
        // Populate the dropdown with existing match configs
        const dropdown = document.getElementById('match-config-dropdown');
        dropdown.innerHTML = '<option value="">-- Create New --</option>' +
            this.matchConfigs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        // If step already has a config, select it and load its options
        if (step && step.match_config_id) {
            dropdown.value = step.match_config_id;
            const config = this.matchConfigs.find(c => c.id == step.match_config_id);
            if (config) {
                document.getElementById('match-config-name').value = config.name;
                document.getElementById('match-config-options').value = config.options.join('\n');
            }
        } else {
            document.getElementById('match-config-name').value = '';
            document.getElementById('match-config-options').value = '';
        }
        
        // When dropdown changes, load that config's data
        dropdown.onchange = () => {
            const selectedId = dropdown.value;
            if (selectedId) {
                const config = this.matchConfigs.find(c => c.id == selectedId);
                if (config) {
                    document.getElementById('match-config-name').value = config.name;
                    document.getElementById('match-config-options').value = config.options.join('\n');
                }
            } else {
                document.getElementById('match-config-name').value = '';
                document.getElementById('match-config-options').value = '';
            }
        };
        
        this.modals.matchConfig.el.style.display = 'flex';
    }

    async saveMatchConfig() {
        const stepId = this.modals.matchConfig.stepId;
        const selectedConfigId = document.getElementById('match-config-dropdown').value;
        const name = document.getElementById('match-config-name').value.trim();
        const optionsText = document.getElementById('match-config-options').value;
        const options = optionsText.split('\n').map(l => l.trim()).filter(l => l);
        
        if (!name) {
            alert('Please enter a name for the match configuration.');
            return;
        }
        
        try {
            let configId = selectedConfigId;
            
            if (selectedConfigId) {
                // Update existing config
                await api.put(`/api/match-configs/${selectedConfigId}`, { name, options });
            } else {
                // Create new config
                const res = await api.post('/api/match-configs', { name, options });
                configId = res.data.id;
            }
            
            // Associate this config with the step and save JSON array to action_result
            await api.patch(`/api/test-steps/${this.releaseId}/${stepId}`, { 
                match_config_id: configId,
                action_result: JSON.stringify(options)
            });
            
            // Reload configs and steps
            await this.loadConfig();
            await this.loadSteps();
            
            this.modals.matchConfig.el.style.display = 'none';
        } catch (err) {
            alert(err.message);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TestCasesEditor();
});
