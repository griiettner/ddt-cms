/**
 * API Wrapper for CMS for DDT
 */
export const api = {
    async get(url) {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Request failed');
        return data;
    },

    async post(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Request failed');
        return data;
    },

    async put(url, body) {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Request failed');
        return data;
    },

    async delete(url) {
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Request failed');
        return data;
    }
};
