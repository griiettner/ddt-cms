import { api } from './utils/api.js';

class TestSetsPage {
    constructor() {
        this.selectedReleaseId = localStorage.getItem('selectedReleaseId') || '';
        this.releases = [];
        this.testSets = [];
        this.pagination = { page: 1, limit: 10, total: 0, pages: 1 };
        this.filters = { search: '' };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserInfo();
        await this.loadReleases();
        if (this.selectedReleaseId) {
            await this.loadTestSets();
        }
    }

    async loadUserInfo() {
        try {
            const data = await api.get('/api/health');
            document.getElementById('user-display').textContent = data.user.name;
        } catch (err) { console.error('Failed to load user info', err); }
    }

    async loadReleases() {
        try {
            const res = await api.get('/api/releases');
            this.releases = res.data;
            this.renderReleaseSelector();
        } catch (err) { console.error('Failed to load releases', err); }
    }

    renderReleaseSelector() {
        const selector = document.getElementById('release-selector');
        selector.innerHTML = this.releases.length === 0 
            ? '<option value="">No releases</option>'
            : this.releases.map(r => `
                <option value="${r.id}" ${this.selectedReleaseId == r.id ? 'selected' : ''}>
                    Release ${r.release_number}
                </option>
            `).join('');
        
        if (!this.selectedReleaseId && this.releases.length > 0) {
            this.selectedReleaseId = this.releases[0].id;
            localStorage.setItem('selectedReleaseId', this.selectedReleaseId);
            this.loadTestSets();
        }
    }

    async loadTestSets() {
        try {
            const query = new URLSearchParams({
                page: this.pagination.page,
                limit: this.pagination.limit,
                search: this.filters.search
            }).toString();
            
            const res = await api.get(`/api/test-sets/${this.selectedReleaseId}?${query}`);
            this.testSets = res.data;
            this.pagination = res.pagination;
            this.renderTestSets();
            this.renderPagination();
        } catch (err) {
            console.error('Failed to load test sets', err);
        }
    }

    renderTestSets() {
        const tbody = document.getElementById('test-sets-tbody');
        if (this.testSets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-10 text-center text-co-gray-500 italic">No test suites found for this release.</td></tr>';
            return;
        }

        tbody.innerHTML = this.testSets.map(ts => `
            <tr class="hover:bg-co-gray-50/50 transition-colors">
                <td class="px-6 py-4 font-bold">
                    <a href="/test-cases.html?testSetId=${ts.id}" class="text-co-blue hover:underline">${ts.name}</a>
                </td>
                <td class="px-6 py-4 text-co-gray-600 max-w-xs truncate">${ts.description || '-'}</td>
                <td class="px-6 py-4 text-center font-bold text-co-blue">${ts.caseCount || 0}</td>
                <td class="px-6 py-4 text-center font-bold text-co-blue">${ts.scenarioCount || 0}</td>
                <td class="px-6 py-4 text-xs text-co-gray-500">${new Date(ts.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4 text-right">
                    <button class="kebab-btn" data-id="${ts.id}" data-name="${ts.name}" data-description="${ts.description || ''}">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        this.attachTableHandlers();
    }

    attachTableHandlers() {
        const floatingMenu = document.getElementById('floating-kebab-menu');

        document.querySelectorAll('.kebab-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const name = btn.dataset.name;
                const desc = btn.dataset.description;

                floatingMenu.innerHTML = `
                    <button class="menu-item-view" data-id="${id}">View Test Cases</button>
                    <button class="menu-item-edit" data-id="${id}">Edit Details</button>
                    <button class="menu-item-delete text-co-red" data-id="${id}">Delete Suite</button>
                `;

                const rect = btn.getBoundingClientRect();
                floatingMenu.style.top = `${rect.bottom + 5}px`;
                floatingMenu.style.left = `${rect.right - 160}px`;
                floatingMenu.style.display = 'block';

                floatingMenu.querySelector('.menu-item-view').onclick = () => {
                    location.href = `/test-cases.html?testSetId=${id}`;
                };

                floatingMenu.querySelector('.menu-item-edit').onclick = () => {
                    floatingMenu.style.display = 'none';
                    this.openEditModal(id, name, desc);
                };

                floatingMenu.querySelector('.menu-item-delete').onclick = () => {
                    floatingMenu.style.display = 'none';
                    this.deleteTestSet(id);
                };
            };
        });
    }

    renderPagination() {
        document.getElementById('pagination-info').textContent = 
            `Showing ${this.testSets.length} of ${this.pagination.total} test suites`;
        
        const container = document.getElementById('pagination-controls');
        container.innerHTML = '';
        
        for (let i = 1; i <= this.pagination.pages; i++) {
            const btn = document.createElement('button');
            btn.className = `px-3 py-1 rounded text-xs font-bold ${this.pagination.page === i ? 'bg-co-blue text-white' : 'bg-co-gray-100 text-co-gray-700 hover:bg-co-gray-200'}`;
            btn.textContent = i;
            btn.onclick = () => {
                this.pagination.page = i;
                this.loadTestSets();
            };
            container.appendChild(btn);
        }
    }

    openEditModal(id, name, desc) {
        const modal = document.getElementById('test-set-modal');
        document.getElementById('modal-title').textContent = 'Edit Test Set';
        document.getElementById('ts-id').value = id;
        document.getElementById('ts-name').value = name;
        document.getElementById('ts-description').value = desc;
        modal.classList.remove('hidden');
    }

    async deleteTestSet(id) {
        if (!confirm('Are you sure you want to delete this test set and all associated cases/steps? This cannot be undone.')) return;
        try {
            await api.delete(`/api/test-sets/${this.selectedReleaseId}/${id}`);
            await this.loadTestSets();
        } catch (err) { alert('Delete failed: ' + err.message); }
    }

    setupEventListeners() {
        const modal = document.getElementById('test-set-modal');
        const form = document.getElementById('test-set-form');

        document.getElementById('add-test-set-btn').onclick = () => {
            document.getElementById('modal-title').textContent = 'New Test Set';
            document.getElementById('ts-id').value = '';
            form.reset();
            modal.classList.remove('hidden');
        };

        document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => modal.classList.add('hidden'));

        document.getElementById('release-selector').onchange = (e) => {
            this.selectedReleaseId = e.target.value;
            localStorage.setItem('selectedReleaseId', this.selectedReleaseId);
            this.pagination.page = 1;
            this.loadTestSets();
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('ts-id').value;
            const data = {
                name: document.getElementById('ts-name').value,
                description: document.getElementById('ts-description').value
            };

            try {
                if (id) {
                    await api.patch(`/api/test-sets/${this.selectedReleaseId}/${id}`, data);
                } else {
                    await api.post(`/api/test-sets/${this.selectedReleaseId}`, data);
                }
                modal.classList.add('hidden');
                await this.loadTestSets();
            } catch (err) { alert('Save failed: ' + err.message); }
        };

        document.getElementById('apply-filters').onclick = () => {
            this.filters.search = document.getElementById('filter-search').value;
            this.pagination.page = 1;
            this.loadTestSets();
        };

        document.getElementById('reset-filters').onclick = () => {
            document.getElementById('filter-search').value = '';
            this.filters.search = '';
            this.pagination.page = 1;
            this.loadTestSets();
        };

        window.onclick = (e) => {
            const menu = document.getElementById('floating-kebab-menu');
            if (!e.target.closest('.kebab-btn') && !e.target.closest('#floating-kebab-menu')) {
                menu.style.display = 'none';
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TestSetsPage();
});
