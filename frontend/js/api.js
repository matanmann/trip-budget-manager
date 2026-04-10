
/**
 * API Client for Trip Budget Manager
 * Handles all communication with the backend
 */

const API_BASE_URL = 'https://api.tripbudget.org';

class API {
    /**
     * Make an HTTP request to the API
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'include', // Important for session cookies
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // ==================== AUTH ====================

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        return this.request('/auth/me');
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        return this.request('/auth/status');
    }

    /**
     * Log out current user
     */
    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    // ==================== TRIPS ====================

    /**
     * Get all trips for current user
     */
    async getTrips() {
        return this.request('/api/trips');
    }

    /**
     * Get a single trip with expenses
     */
    async getTrip(id) {
        return this.request(`/api/trips/${id}`);
    }

    /**
     * Create a new trip
     */
    async createTrip(tripData) {
        return this.request('/api/trips', {
            method: 'POST',
            body: JSON.stringify(tripData),
        });
    }

    /**
     * Update an existing trip
     */
    async updateTrip(id, tripData) {
        return this.request(`/api/trips/${id}`, {
            method: 'PUT',
            body: JSON.stringify(tripData),
        });
    }

    /**
     * Delete a trip
     */
    async deleteTrip(id) {
        return this.request(`/api/trips/${id}`, { method: 'DELETE' });
    }

    /**
     * Set a trip as active
     */
    async activateTrip(id) {
        return this.request(`/api/trips/${id}/activate`, { method: 'POST' });
    }

    // ==================== EXPENSES ====================

    /**
     * Get all expenses for a trip
     */
    async getExpenses(tripId) {
        return this.request(`/api/expenses/trip/${tripId}`);
    }

    /**
     * Get a single expense
     */
    async getExpense(id) {
        return this.request(`/api/expenses/${id}`);
    }

    /**
     * Create a new expense
     */
    async createExpense(expenseData) {
        return this.request('/api/expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData),
        });
    }

    /**
     * Update an existing expense
     */
    async updateExpense(id, expenseData) {
        return this.request(`/api/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(expenseData),
        });
    }

    /**
     * Delete an expense
     */
    async deleteExpense(id) {
        return this.request(`/api/expenses/${id}`, { method: 'DELETE' });
    }
}

// Export singleton instance
const api = new API();
export default api;

// Also expose globally for non-module scripts
window.api = api;
