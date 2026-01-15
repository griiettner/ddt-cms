import { api } from './utils/api.js';

class TestCasesEditor {
    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.testSetId = urlParams.get('ts');
        this.selectedReleaseId = localStorage.getItem('selectedReleaseId');
        
        this.testCases = [];
        this.selectedTestCaseId = null;
        this.selectedScenarioId = null;
        this.hot = null;
        this.config = { types: [], actions: [] };
        
        this.saveTimeout = null;
        
        if (!this.testSetId || !this.selectedReleaseId) {
            window.location.href = '/test-sets.html';
            return;
        }

        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserInfo();
        await this.loadConfig();
        await this.loadTestSetDetails();
        await this.loadTestCases();
        this.initGrid();
    }

    async loadUserInfo() {
        try {
            const data = await api.get('/api/health');
            document.getElementById('user-display').textContent = data.user.name;
        } catch (err) { console.error(err); }
    }

    async loadConfig() {
        try {
            const [typesRes, actionsRes] = await Promise.all([
                api.get(`/api/config/${this.selectedReleaseId}/types`),
                api.get(`/api/config/${this.selectedReleaseId}/actions`)
            ]);
            this.config.types = typesRes.data.map(t => t.display_name);
            this.config.actions = actionsRes.data.map(a => a.display_name);
        } catch (err) { console.error('Failed to load config', err); }
    }

    async loadTestSetDetails() {
        try {
            const res = await api.get(`/api/test-sets/${this.selectedReleaseId}/${this.testSetId}`);
            document.getElementById('breadcrumb-test-set').textContent = res.data.name;
            document.getElementById('text-set-name').textContent = res.data.name;
            document.getElementById('text-set-description').textContent = res.data.description || 'No description';
        } catch (err) { console.error(err); }
    }

    async loadTestCases() {
        try {
            const res = await api.get(`/api/test-cases/${this.selectedReleaseId}?testSetId=${this.testSetId}`);
            this.testCases = res.data;
            this.renderTestCasesList();
            
            if (this.testCases.length > 0) {
                this.selectTestCase(this.testCases[0].id);
            }
        } catch (err) { console.error(err); }
    }

    renderTestCasesList() {
        const container = document.getElementById('test-cases-list');
        if (this.testCases.length === 0) {
            container.innerHTML = '<p class="text-sm text-co-gray-500 italic">No test cases found.</p>';
            return;
        }

        container.innerHTML = this.testCases.map(tc => `
            <div class="test-case-item p-3 rounded-md cursor-pointer transition-colors ${this.selectedTestCaseId == tc.id ? 'bg-co-blue text-white shadow-sm' : 'hover:bg-co-gray-100 text-co-gray-700'}" 
                 data-id="${tc.id}">
                <div class="font-semibold text-sm truncate">${tc.name}</div>
            </div>
        `).join('');

        container.querySelectorAll('.test-case-item').forEach(item => {
            item.addEventListener('click', () => this.selectTestCase(item.dataset.id));
        });
    }

    async selectTestCase(id) {
        this.selectedTestCaseId = id;
        this.renderTestCasesList();
        
        try {
            const res = await api.get(`/api/test-cases/scenarios/${this.selectedReleaseId}?testCaseId=${this.selectedTestCaseId}`);
            if (res.data.length > 0) {
                this.selectedScenarioId = res.data[0].id; // For POC, use first scenario
                await this.loadSteps();
            } else {
                console.warn('No scenarios found for test case', id);
                this.selectedScenarioId = null;
                this.hot.loadData([{}, {}, {}]);
            }
        } catch (err) { console.error(err); }
    }

    async loadSteps() {
        if (!this.selectedScenarioId) return;
        
        try {
            const res = await api.get(`/api/test-steps/${this.selectedReleaseId}?scenarioId=${this.selectedScenarioId}`);
            const data = res.data.length > 0 ? res.data : [{}, {}, {}]; // Start with empty rows if nothing found
            this.hot.loadData(data);
            document.getElementById('row-count').textContent = `${data.length} steps`;
        } catch (err) { console.error(err); }
    }

    initGrid() {
        const container = document.getElementById('grid-container');
        
        this.hot = new Handsontable(container, {
            data: [],
            colHeaders: [
                'Step Definition', 
                'Type', 
                'Element ID / Selector', 
                'Action', 
                'Action Result (Variable)', 
                'Required?', 
                'Expected Results'
            ],
            columns: [
                { data: 'step_definition', type: 'text', placeholder: 'e.g. Click Login button' },
                { data: 'type', type: 'dropdown', source: this.config.types },
                { data: 'element_id', type: 'text' },
                { data: 'action', type: 'dropdown', source: this.config.actions },
                { data: 'action_result', type: 'text' },
                { data: 'required', type: 'checkbox', className: 'htCenter' },
                { data: 'expected_results', type: 'text' }
            ],
            rowHeaders: true,
            height: '100%',
            width: '100%',
            stretchH: 'all',
            manualColumnResize: true,
            contextMenu: true,
            filters: true,
            dropdownMenu: true,
            licenseKey: 'non-commercial-and-evaluation',
            afterChange: (changes) => {
                if (changes) {
                    this.triggerAutoSave();
                }
            },
            afterCreateRow: () => this.triggerAutoSave(),
            afterRemoveRow: () => this.triggerAutoSave()
        });
    }

    triggerAutoSave() {
        const status = document.getElementById('save-status');
        status.textContent = 'Saving...';
        status.classList.add('text-co-blue');
        
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveData(), 1000);
    }

    async saveData() {
        if (!this.selectedScenarioId) return;
        
        const data = this.hot.getSourceData();
        // Filter out completely empty rows
        const filteredData = data.filter(row => Object.values(row).some(val => val !== null && val !== ''));
        
        try {
            await api.post(`/api/test-steps/${this.selectedReleaseId}/bulk`, {
                scenarioId: this.selectedScenarioId,
                steps: filteredData
            });
            
            const status = document.getElementById('save-status');
            status.textContent = 'All changes saved';
            status.classList.remove('text-co-blue');
            document.getElementById('row-count').textContent = `${filteredData.length} steps`;
        } catch (err) {
            document.getElementById('save-status').textContent = 'Error saving changes!';
        }
    }

    setupEventListeners() {
        document.getElementById('add-test-case-btn').addEventListener('click', async () => {
            const name = prompt('Enter Test Case Name:');
            if (name) {
                try {
                    await api.post(`/api/test-cases/${this.selectedReleaseId}`, {
                        testSetId: this.testSetId,
                        name: name,
                        order_index: this.testCases.length
                    });
                    await this.loadTestCases();
                } catch (err) { alert(err.message); }
            }
        });

        document.getElementById('sync-btn').addEventListener('click', () => {
            const btn = document.getElementById('sync-btn');
            btn.disabled = true;
            btn.textContent = 'Syncing...';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    Sync Complete
                `;
                setTimeout(() => {
                    btn.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        Sync with Cloud
                    `;
                }, 2000);
            }, 1000);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TestCasesEditor();
});
