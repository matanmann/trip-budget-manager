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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ==================== AUTH ====================

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async checkAuthStatus() {
    return this.request('/auth/status');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // ==================== TRIPS ====================

  async getTrips() {
    return this.request('/api/trips');
  }

  async getTrip(id) {
    return this.request(`/api/trips/${id}`);
  }

  async createTrip(tripData) {
    return this.request('/api/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  }

  async updateTrip(id, tripData) {
    return this.request(`/api/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tripData),
    });
  }

  async deleteTrip(id) {
    return this.request(`/api/trips/${id}`, { method: 'DELETE' });
  }

  async activateTrip(id) {
    return this.request(`/api/trips/${id}/activate`, { method: 'POST' });
  }

  // ==================== EXPENSES ====================

  async getExpenses(tripId) {
    return this.request(`/api/expenses/trip/${tripId}`);
  }

  async getExpense(id) {
    return this.request(`/api/expenses/${id}`);
  }

  async createExpense(expenseData) {
    return this.request('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async updateExpense(id, expenseData) {
    return this.request(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    });
  }

  async deleteExpense(id) {
    return this.request(`/api/expenses/${id}`, { method: 'DELETE' });
  }

  // ==================== INVITATIONS ====================

  // Generate an invite link for a trip (owner only)
  async createInvitation(tripId) {
    return this.request(`/api/invitations/${tripId}`, { method: 'POST' });
  }

  // Preview trip info before accepting invite
  async previewInvitation(token) {
    return this.request(`/api/invitations/${token}/preview`);
  }

  // Accept an invite and join the trip
  async acceptInvitation(token) {
    return this.request(`/api/invitations/${token}/accept`, { method: 'POST' });
  }

  // Get all members of a trip
  async getTripMembers(tripId) {
    return this.request(`/api/invitations/${tripId}/members`);
  }

  // Remove a member from a trip (owner only)
  async removeTripMember(tripId, userId) {
    return this.request(`/api/invitations/${tripId}/members/${userId}`, { method: 'DELETE' });
  }
}

// Export singleton instance
const api = new API();
export default api;

// Also expose globally for non-module scripts
window.api = api;

