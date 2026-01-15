import { api } from './utils/api.js';

class Dashboard {
    constructor() {
        this.selectedReleaseId = localStorage.getItem('selectedReleaseId') || '';
        this.releases = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadReleases();
        await this.loadDashboardData();
        await this.loadUserInfo();
    }

    async loadUserInfo() {
        try {
            const data = await api.get('/api/health');
            document.getElementById('user-display').textContent = data.user.name;
        } catch (err) {
            console.error('Failed to load user info', err);
        }
    }

    async loadReleases() {
        try {
            const res = await api.get('/api/releases');
            this.releases = res.data;
            this.renderReleaseSelector();
        } catch (err) {
            console.error('Failed to load releases', err);
        }
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
            this.loadDashboardData();
        }
    }

    async loadDashboardData() {
        if (!this.selectedReleaseId && this.releases.length > 0) {
            this.selectedReleaseId = this.releases[0].id;
        }

        try {
            const res = await api.get(`/api/dashboard/${this.selectedReleaseId}`);
            this.renderStats(res.data);
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        }
    }

    renderStats(stats) {
        document.getElementById('stat-total-sets').textContent = stats.totalTestSets || 0;
        document.getElementById('stat-total-cases').textContent = stats.totalTestCases || 0;
        document.getElementById('stat-active-release').textContent = this.releases.find(r => r.id == this.selectedReleaseId)?.release_number || 'None';
        
        const executionsTable = document.getElementById('recent-executions');
        if (stats.recentRuns && stats.recentRuns.length > 0) {
            executionsTable.innerHTML = stats.recentRuns.map(run => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-co-gray-900">${run.test_set_id || 'Global'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${run.status === 'passed' ? 'success' : 'error'}-light text-${run.status === 'passed' ? 'success' : 'error'}">
                            ${run.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-co-gray-700">${new Date(run.executed_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-co-gray-700">${run.passed_tests}/${run.total_tests} Passed</td>
                </tr>
            `).join('');
        } else {
            executionsTable.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-12 text-center text-co-gray-500 italic">No execution history found.</td>
                </tr>
            `;
        }
    }

    setupEventListeners() {
        document.getElementById('release-selector').addEventListener('change', (e) => {
            this.selectedReleaseId = e.target.value;
            localStorage.setItem('selectedReleaseId', this.selectedReleaseId);
            this.loadDashboardData();
        });

        document.getElementById('export-btn').addEventListener('click', async () => {
            if (!this.selectedReleaseId) return alert('Please select a release first.');
            try {
                const res = await api.get(`/api/export/${this.selectedReleaseId}`);
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `cms_export_release_${this.selectedReleaseId}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            } catch (err) {
                alert('Export failed: ' + err.message);
            }
        });

        document.getElementById('create-release-btn').addEventListener('click', async () => {
            const name = prompt('Enter new release number (e.g., v1.1.0):');
            if (name) {
                try {
                    const res = await api.post('/api/releases', { release_number: name });
                    alert(`Release ${res.data.release_number} created successfully!`);
                    await this.loadReleases();
                    this.selectedReleaseId = res.data.id;
                    localStorage.setItem('selectedReleaseId', this.selectedReleaseId);
                    this.renderReleaseSelector();
                    await this.loadDashboardData();
                } catch (err) {
                    alert('Error creating release: ' + err.message);
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
