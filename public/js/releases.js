import { api } from './utils/api.js';

class ReleasesPage {
    constructor() {
        this.releases = [];
        this.pagination = { page: 1, limit: 10, total: 0 };
        this.filters = { search: '', status: '', from_date: '', to_date: '' };
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserInfo();
        await this.loadReleases();
    }

    async loadUserInfo() {
        try {
            const data = await api.get('/api/health');
            document.getElementById('user-display').textContent = data.user.name;
        } catch (err) { console.error(err); }
    }

    async loadReleases() {
        try {
            const query = new URLSearchParams({
                page: this.pagination.page,
                limit: this.pagination.limit,
                ...this.filters
            }).toString();
            
            const res = await api.get(`/api/releases?${query}`);
            this.releases = res.data;
            this.pagination = res.pagination;
            this.renderReleases();
            this.renderPagination();
        } catch (err) {
            console.error('Failed to load releases', err);
        }
    }

    renderReleases() {
        const tbody = document.getElementById('releases-tbody');
        if (this.releases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="px-6 py-10 text-center text-co-gray-500 italic">No releases found.</td></tr>';
            return;
        }

        tbody.innerHTML = this.releases.map(r => {
            const isClosed = r.status === 'closed';
            const isArchived = r.status === 'archived';
            
            return `
            <tr class="hover:bg-co-gray-50/50 transition-colors group">
                <td class="px-4 py-4 font-bold text-co-blue">${r.release_number}</td>
                <td class="px-4 py-4 text-co-gray-600">${r.description || '-'}</td>
                <td class="px-4 py-4">
                    <div class="notes-editor" 
                         contenteditable="${!isArchived}" 
                         data-id="${r.id}"
                         onblur="this.dataset.changed === 'true' && window.dispatchEvent(new CustomEvent('save-note', {detail: {id: this.dataset.id, text: this.innerText}}))"
                         oninput="this.dataset.changed = 'true'">
                        ${r.notes || ''}
                    </div>
                </td>
                <td class="px-4 py-4">
                    <span class="status-pill status-${r.status}">${r.status}</span>
                </td>
                <td class="px-4 py-4 text-[11px] text-co-gray-500">
                    <div>${new Date(r.created_at).toLocaleDateString()}</div>
                    <div class="font-bold uppercase text-[9px]">${r.created_by}</div>
                </td>
                <td class="px-4 py-4 text-[11px] text-co-gray-500">
                    ${r.closed_at ? `
                        <div>${new Date(r.closed_at).toLocaleDateString()}</div>
                        <div class="font-bold uppercase text-[9px]">${r.closed_by || ''}</div>
                    ` : '-'}
                </td>
                <td class="px-4 py-4 text-center font-bold text-co-blue">${r.testSetCount || 0}</td>
                <td class="px-4 py-4 text-center font-bold text-co-blue">${r.testCaseCount || 0}</td>
                <td class="px-4 py-4 text-right">
                    <div class="kebab-menu">
                        <button class="kebab-btn" data-id="${r.id}" data-status="${r.status}">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');

        this.attachTableHandlers();
    }

    attachTableHandlers() {
        const floatingMenu = document.getElementById('floating-kebab-menu');

        // Close menu on click outside
        window.onclick = (e) => {
            if (!e.target.closest('.kebab-btn') && !e.target.closest('#floating-kebab-menu')) {
                floatingMenu.style.display = 'none';
            }
        };

        document.querySelectorAll('.kebab-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const status = btn.dataset.status;
                const isClosed = status === 'closed';
                const isArchived = status === 'archived';

                // Repopulate floating menu
                floatingMenu.innerHTML = `
                    <button class="menu-item-edit" data-id="${id}">Edit Details</button>
                    ${!isClosed ? `
                        <button class="menu-item-action" data-id="${id}" data-action="close">Close Release</button>
                    ` : `
                        <button class="menu-item-action" data-id="${id}" data-action="reopen">Reopen Release</button>
                    `}
                    ${!isArchived ? `
                        <button class="menu-item-action" data-id="${id}" data-action="archive">Archive Release</button>
                    ` : ''}
                    ${status === 'open' ? `
                        <button class="menu-item-delete text-co-red" data-id="${id}">Delete Release</button>
                    ` : ''}
                `;

                // Calculate position
                const rect = btn.getBoundingClientRect();
                floatingMenu.style.top = `${rect.bottom + 5}px`;
                floatingMenu.style.left = `${rect.right - 160}px`;
                floatingMenu.style.display = 'block';

                // Re-attach listeners to menu items
                floatingMenu.querySelector('.menu-item-edit').onclick = () => {
                    floatingMenu.style.display = 'none';
                    this.openEditModal(id);
                };

                floatingMenu.querySelectorAll('.menu-item-action').forEach(mBtn => {
                    mBtn.onclick = () => {
                        floatingMenu.style.display = 'none';
                        this.handleAction(mBtn.dataset.id, mBtn.dataset.action);
                    };
                });

                const delBtn = floatingMenu.querySelector('.menu-item-delete');
                if (delBtn) {
                    delBtn.onclick = () => {
                        floatingMenu.style.display = 'none';
                        this.handleDelete(id);
                    };
                }
            };
        });
    }

    renderPagination() {
        document.getElementById('pagination-info').textContent = 
            `Showing page ${this.pagination.page} of ${this.pagination.pages} (${this.pagination.total} total)`;
        
        const container = document.getElementById('pagination-controls');
        container.innerHTML = '';
        
        for (let i = 1; i <= this.pagination.pages; i++) {
            const btn = document.createElement('button');
            btn.className = `px-3 py-1 rounded text-xs font-bold ${this.pagination.page === i ? 'bg-co-blue text-white' : 'bg-co-gray-100 text-co-gray-700 hover:bg-co-gray-200'}`;
            btn.textContent = i;
            btn.onclick = () => {
                this.pagination.page = i;
                this.loadReleases();
            };
            container.appendChild(btn);
        }
    }

    async handleAction(id, action) {
        try {
            await api.put(`/api/releases/${id}/${action}`);
            await this.loadReleases();
        } catch (err) { alert(err.message); }
    }

    async handleDelete(id) {
        if (!confirm('EXTREME DANGER: This will permanently delete ALL test data, sets, cases, scenarios, and steps for this release. This action cannot be undone. Are you absolutely sure?')) return;
        try {
            await api.delete(`/api/releases/${id}`);
            await this.loadReleases();
        } catch (err) { alert(err.message); }
    }

    openEditModal(id) {
        const release = this.releases.find(r => r.id == id);
        if (!release) return;

        document.getElementById('modal-title').textContent = 'Edit Release';
        document.getElementById('rel-id').value = release.id;
        document.getElementById('rel-number').value = release.release_number;
        document.getElementById('rel-description').value = release.description || '';
        document.getElementById('notes-field-container').classList.add('hidden'); // Notes are edited inline
        
        document.getElementById('release-modal').classList.remove('hidden');
    }

    setupEventListeners() {
        const modal = document.getElementById('release-modal');
        const form = document.getElementById('release-form');

        document.getElementById('add-release-btn').addEventListener('click', () => {
            document.getElementById('modal-title').textContent = 'New Release';
            document.getElementById('rel-id').value = '';
            form.reset();
            document.getElementById('notes-field-container').classList.remove('hidden');
            modal.classList.remove('hidden');
        });

        document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => modal.classList.add('hidden'));

        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('rel-id').value;
            const data = {
                release_number: document.getElementById('rel-number').value,
                description: document.getElementById('rel-description').value,
                notes: document.getElementById('rel-notes').value
            };

            try {
                if (id) {
                    await api.patch(`/api/releases/${id}`, data);
                } else {
                    await api.post('/api/releases', data);
                }
                modal.classList.add('hidden');
                await this.loadReleases();
            } catch (err) { alert(err.message); }
        };

        // Filters
        document.getElementById('apply-filters').onclick = () => {
            this.filters.search = document.getElementById('filter-search').value;
            this.filters.status = document.getElementById('filter-status').value;
            this.filters.from_date = document.getElementById('filter-from').value;
            this.filters.to_date = document.getElementById('filter-to').value;
            this.pagination.page = 1;
            this.loadReleases();
        };

        document.getElementById('reset-filters').onclick = () => {
            document.getElementById('filter-search').value = '';
            document.getElementById('filter-status').value = '';
            document.getElementById('filter-from').value = '';
            document.getElementById('filter-to').value = '';
            this.filters = { search: '', status: '', from_date: '', to_date: '' };
            this.pagination.page = 1;
            this.loadReleases();
        };

        // Close kebab on click elsewhere
        window.addEventListener('click', () => {
            document.querySelectorAll('.kebab-content').forEach(c => c.classList.remove('show'));
        });

        // Note save listener
        window.addEventListener('save-note', async (e) => {
            try {
                await api.patch(`/api/releases/${e.detail.id}`, { notes: e.detail.text });
            } catch (err) { console.error('Failed to auto-save note', err); }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ReleasesPage();
});
