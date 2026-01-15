import { api } from './utils/api.js';

class SettingsPage {
    constructor() {
        this.selectedReleaseId = localStorage.getItem('selectedReleaseId') || '';
        this.releases = [];
        this.types = [];
        this.actions = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserInfo();
        await this.loadReleases();
        if (this.selectedReleaseId) {
            await this.loadData();
        }
    }

    async loadUserInfo() {
        try {
            const data = await api.get('/api/health');
            document.getElementById('user-display').textContent = data.user.name;
        } catch (err) { console.error('Failed to load user info', err); }
    }

    async loadReleases() {
        const res = await api.get('/api/releases');
        this.releases = res.data;
        this.renderReleaseSelector();
    }

    renderReleaseSelector() {
        const selector = document.getElementById('release-selector');
        selector.innerHTML = this.releases.map(r => `
            <option value="${r.id}" ${this.selectedReleaseId == r.id ? 'selected' : ''}>
                Release ${r.release_number}
            </option>
        `).join('');
        
        if (!this.selectedReleaseId && this.releases.length > 0) {
            this.selectedReleaseId = this.releases[0].id;
            localStorage.setItem('selectedReleaseId', this.selectedReleaseId);
            this.loadData();
        }
    }

    async loadData() {
        try {
            const [typesRes, actionsRes] = await Promise.all([
                api.get(`/api/config/${this.selectedReleaseId}/types`),
                api.get(`/api/config/${this.selectedReleaseId}/actions`)
            ]);
            this.types = typesRes.data;
            this.actions = actionsRes.data;
            this.renderTables();
        } catch (err) {
            console.error('Failed to load settings', err);
        }
    }

    renderTables() {
        const typesTbody = document.getElementById('types-tbody');
        const actionsTbody = document.getElementById('actions-tbody');

        typesTbody.innerHTML = this.types.map(t => `
            <tr class="hover:bg-co-gray-50/50 transition-colors">
                <td class="px-6 py-4 font-semibold text-co-blue">${t.display_name}</td>
                <td class="px-6 py-4 text-co-gray-500 font-mono text-xs">${t.key}</td>
                <td class="px-6 py-4 text-right">
                    <button class="delete-opt-btn text-co-red hover:underline text-sm" data-id="${t.id}">&times; Remove</button>
                </td>
            </tr>
        `).join('');

        actionsTbody.innerHTML = this.actions.map(a => `
            <tr class="hover:bg-co-gray-50/50 transition-colors">
                <td class="px-6 py-4 font-semibold text-co-blue">${a.display_name}</td>
                <td class="px-6 py-4 text-co-gray-500 font-mono text-xs">${a.key}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-co-gray-100 text-co-gray-600">
                        ${a.result_type || 'None'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="delete-opt-btn text-co-red hover:underline text-sm" data-id="${a.id}">&times; Remove</button>
                </td>
            </tr>
        `).join('');

        // Attach delete handlers
        document.querySelectorAll('.delete-opt-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteOption(btn.dataset.id));
        });
    }

    async deleteOption(id) {
        if (!confirm('Are you sure you want to remove this option? It might already be used in test steps.')) return;
        try {
            await api.delete(`/api/config/${this.selectedReleaseId}/${id}`);
            await this.loadData();
        } catch (err) { alert(err.message); }
    }

    setupEventListeners() {
        const modal = document.getElementById('modal-overlay');
        const form = document.getElementById('option-form');
        const resultTypeContainer = document.getElementById('result-type-container');

        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                document.getElementById('opt-category').value = category;
                document.getElementById('modal-title').textContent = category === 'type' ? 'Add New Element Type' : 'Add New Test Action';
                
                if (category === 'action') {
                    resultTypeContainer.classList.remove('hidden');
                } else {
                    resultTypeContainer.classList.add('hidden');
                }
                
                modal.classList.remove('hidden');
            });
        });

        document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('cancel-btn').addEventListener('click', () => modal.classList.add('hidden'));
        
        document.getElementById('release-selector').addEventListener('change', (e) => {
            this.selectedReleaseId = e.target.value;
            localStorage.setItem('selectedReleaseId', this.selectedReleaseId);
            this.loadData();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const category = document.getElementById('opt-category').value;
            const key = document.getElementById('opt-key').value;
            const display_name = document.getElementById('opt-display-name').value;
            const result_type = category === 'action' ? document.getElementById('opt-result-type').value : null;

            try {
                await api.post(`/api/config/${this.selectedReleaseId}/${category}`, {
                    key, display_name, result_type
                });
                form.reset();
                modal.classList.add('hidden');
                await this.loadData();
            } catch (err) {
                alert('Failed to save option: ' + err.message);
            }
        });
        
        // Auto-slugify key from display name
        document.getElementById('opt-display-name').addEventListener('input', (e) => {
            const keyInput = document.getElementById('opt-key');
            if (keyInput.value === '' || keyInput.dataset.auto === 'true') {
                keyInput.value = e.target.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
                keyInput.dataset.auto = 'true';
            }
        });
        
        document.getElementById('opt-key').addEventListener('input', () => {
            document.getElementById('opt-key').dataset.auto = 'false';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SettingsPage();
});
