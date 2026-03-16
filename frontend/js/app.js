
/**
 * Trip Budget Manager - Main Application
 */

import api from './api.js';

// ==================== STATE ====================

const state = {
    user: null,
    trips: [],
    activeTrip: null,
    expenses: [],
    currentTab: 'dashboard',
    loading: true,
};

// ==================== DOM ELEMENTS ====================

const elements = {
    loadingScreen: document.getElementById('loading-screen'),
    loginScreen: document.getElementById('login-screen'),
    app: document.getElementById('app'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    logoutBtn: document.getElementById('logout-btn'),
    tripSelector: document.getElementById('trip-selector'),
    tabNav: document.getElementById('tab-nav'),
    tabContent: document.getElementById('tab-content'),
    toastContainer: document.getElementById('toast-container'),
};

// ==================== INITIALIZATION ====================

async function init() {
    try {
        // Check if user is authenticated
        const { user } = await api.getCurrentUser();
        state.user = user;
        
        // Load user's trips
        state.trips = await api.getTrips();
        
        // Set active trip
        state.activeTrip = state.trips.find(t => t.isActive) || state.trips[0] || null;
        
        // Load expenses for active trip
        if (state.activeTrip) {
            state.expenses = await api.getExpenses(state.activeTrip.id);
        }
        
        // Show main app
        showApp();
    } catch (error) {
        // Not authenticated, show login
        showLogin();
    } finally {
        state.loading = false;
        elements.loadingScreen.classList.add('hidden');
    }
}

function showLogin() {
    elements.loginScreen.classList.remove('hidden');
    elements.app.classList.add('hidden');
}

function showApp() {
    elements.loginScreen.classList.add('hidden');
    elements.app.classList.remove('hidden');
    
    // Update user info
    if (state.user) {
        elements.userAvatar.src = state.user.picture || 'https://via.placeholder.com/32';
        elements.userName.textContent = state.user.name || state.user.email;
    }
    
    // Render UI
    renderTripSelector();
    renderTabs();
    renderTabContent();
}

// ==================== EVENT HANDLERS ====================

elements.logoutBtn.addEventListener('click', async () => {
    try {
        await api.logout();
        state.user = null;
        state.trips = [];
        state.activeTrip = null;
        state.expenses = [];
        showLogin();
        showToast('Signed out successfully', 'success');
    } catch (error) {
        showToast('Failed to sign out', 'error');
    }
});

// ==================== RENDERING ====================

function renderTripSelector() {
    if (state.trips.length === 0) {
        elements.tripSelector.innerHTML = `
            <div class="bg-primary-50 border border-primary-200 rounded-xl p-6 text-center">
                <p class="text-primary-800 mb-4">Welcome! Create your first trip to get started.</p>
                <button onclick="window.showCreateTripModal()" 
                        class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition">
                    ➕ Create Trip
                </button>
            </div>
        `;
        return;
    }
    
    elements.tripSelector.innerHTML = `
        <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-[200px]">
                <label class="block text-sm font-medium text-gray-700 mb-1">Active Trip</label>
                <select id="trip-select" 
                        onchange="window.switchTrip(this.value)"
                        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    ${state.trips.map(trip => `
                        <option value="${trip.id}" ${trip.id === state.activeTrip?.id ? 'selected' : ''}>
                            ${trip.name} (${trip.currency} ${trip.spent.toFixed(0)} / ${trip.totalBudget.toFixed(0)})
                        </option>
                    `).join('')}
                </select>
            </div>
            <button onclick="window.showCreateTripModal()" 
                    class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center gap-2">
                <span>➕</span> New Trip
            </button>
        </div>
    `;
}

function renderTabs() {
    const tabs = [
        { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
        { id: 'expenses', label: '💰 Expenses', icon: '💰' },
        { id: 'add', label: '➕ Add Expense', icon: '➕' },
        { id: 'settings', label: '⚙️ Trip Settings', icon: '⚙️' },
    ];

    elements.tabNav.innerHTML = `
        <div class="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
            ${tabs.map(tab => `
                <button onclick="window.switchTab('${tab.id}')"
                        class="px-4 py-2 rounded-lg font-medium transition
                               ${state.currentTab === tab.id
                                   ? 'bg-primary-600 text-white'
                                   : 'text-gray-600 hover:bg-gray-100'}">
                    ${tab.label}
                </button>
            `).join('')}
        </div>
    `;
}

function renderTabContent() {
    if (!state.activeTrip) {
        elements.tabContent.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <p>Select or create a trip to get started</p>
            </div>
        `;
        return;
    }

    switch (state.currentTab) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'expenses':
            renderExpensesList();
            break;
        case 'add':
            renderAddExpenseForm();
            break;
        case 'settings':
            renderTripSettings();
            break;
    }
}

function renderDashboard() {
    const trip = state.activeTrip;
    const spent = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = trip.totalBudget - spent;
    const percentage = (spent / trip.totalBudget) * 100;

    // Group expenses by category
    const byCategory = {};
    state.expenses.forEach(exp => {
        const cat = exp.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + exp.amount;
    });

    elements.tabContent.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <!-- Budget Overview -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-sm font-medium text-gray-500 mb-2">Total Budget</h3>
                <p class="text-3xl font-bold text-gray-900">${trip.currency} ${trip.totalBudget.toLocaleString()}</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-sm font-medium text-gray-500 mb-2">Spent</h3>
                <p class="text-3xl font-bold text-red-600">${trip.currency} ${spent.toLocaleString()}</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-sm font-medium text-gray-500 mb-2">Remaining</h3>
                <p class="text-3xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${trip.currency} ${remaining.toLocaleString()}
                </p>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div class="flex justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">Budget Used</span>
                <span class="text-sm font-medium ${percentage > 100 ? 'text-red-600' : 'text-gray-700'}">${percentage.toFixed(1)}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4">
                <div class="h-4 rounded-full transition-all duration-500 ${percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}"
                     style="width: ${Math.min(percentage, 100)}%"></div>
            </div>
        </div>

        <!-- Category Breakdown -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
            ${Object.keys(byCategory).length === 0
                ? '<p class="text-gray-500">No expenses yet</p>'
                : `<div class="space-y-3">
                    ${Object.entries(byCategory)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amount]) => `
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">${cat}</span>
                                <span class="font-medium">${trip.currency} ${amount.toLocaleString()}</span>
                            </div>
                        `).join('')}
                   </div>`
            }
        </div>
    `;
}

function renderExpensesList() {
    elements.tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900">All Expenses</h3>
                <span class="text-sm text-gray-500">${state.expenses.length} expenses</span>
            </div>
            ${state.expenses.length === 0
                ? '<div class="p-8 text-center text-gray-500">No expenses yet. Add your first expense!</div>'
                : `<div class="divide-y divide-gray-200">
                    ${state.expenses.map(exp => `
                        <div class="p-4 hover:bg-gray-50 flex justify-between items-center">
                            <div>
                                <p class="font-medium text-gray-900">${exp.description || exp.category || 'Expense'}</p>
                                <p class="text-sm text-gray-500">${new Date(exp.date).toLocaleDateString()} • ${exp.category || 'Uncategorized'}</p>
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="font-semibold text-gray-900">${exp.currency} ${exp.amount.toLocaleString()}</span>
                                <button onclick="window.deleteExpense('${exp.id}')"
                                        class="text-red-500 hover:text-red-700 p-1">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                   </div>`
            }
        </div>
    `;
}

function renderAddExpenseForm() {
    const categories = ['🍔 Food', '🚗 Transport', '🏨 Accommodation', '🎭 Entertainment', '🛍️ Shopping', '💊 Health', '📱 Communication', '📋 Other'];
    const today = new Date().toISOString().split('T')[0];

    elements.tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
            <h3 class="text-lg font-semibold text-gray-900 mb-6">Add New Expense</h3>
            <form id="expense-form" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                        <input type="number" id="expense-amount" step="0.01" min="0" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                               placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <input type="text" id="expense-currency" value="${state.activeTrip?.currency || 'USD'}"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select id="expense-category" required
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <option value="">Select category...</option>
                        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" id="expense-date" value="${today}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" id="expense-description"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                           placeholder="What was this expense for?">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" id="expense-location"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                           placeholder="Where did you spend this?">
                </div>

                <button type="submit"
                        class="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                    ➕ Add Expense
                </button>
            </form>
        </div>
    `;

    // Attach form handler
    document.getElementById('expense-form').addEventListener('submit', handleAddExpense);
}

async function handleAddExpense(e) {
    e.preventDefault();

    const expenseData = {
        tripId: state.activeTrip.id,
        amount: parseFloat(document.getElementById('expense-amount').value),
        currency: document.getElementById('expense-currency').value.toUpperCase(),
        category: document.getElementById('expense-category').value,
        date: document.getElementById('expense-date').value,
        description: document.getElementById('expense-description').value || null,
        location: document.getElementById('expense-location').value || null,
    };

    try {
        const newExpense = await api.createExpense(expenseData);
        state.expenses.unshift(newExpense);

        // Update trip spent amount
        state.activeTrip.spent = (state.activeTrip.spent || 0) + newExpense.amount;

        showToast('Expense added successfully!', 'success');
        state.currentTab = 'expenses';
        renderTabs();
        renderTabContent();
    } catch (error) {
        showToast('Failed to add expense: ' + error.message, 'error');
    }
}

function renderTripSettings() {
    const trip = state.activeTrip;

    elements.tabContent.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
            <h3 class="text-lg font-semibold text-gray-900 mb-6">Trip Settings</h3>
            <form id="trip-settings-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Trip Name</label>
                    <input type="text" id="trip-name" value="${trip.name}" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" id="trip-start" value="${trip.startDate.split('T')[0]}" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input type="date" id="trip-end" value="${trip.endDate.split('T')[0]}" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Total Budget</label>
                        <input type="number" id="trip-budget" value="${trip.totalBudget}" step="0.01" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <input type="text" id="trip-currency" value="${trip.currency}" maxlength="3" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                </div>

                <div class="flex gap-4 pt-4">
                    <button type="submit"
                            class="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition">
                        💾 Save Changes
                    </button>
                    <button type="button" onclick="window.deleteTrip('${trip.id}')"
                            class="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition">
                        🗑️ Delete Trip
                    </button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('trip-settings-form').addEventListener('submit', handleUpdateTrip);
}

async function handleUpdateTrip(e) {
    e.preventDefault();

    const tripData = {
        name: document.getElementById('trip-name').value,
        startDate: document.getElementById('trip-start').value,
        endDate: document.getElementById('trip-end').value,
        totalBudget: parseFloat(document.getElementById('trip-budget').value),
        currency: document.getElementById('trip-currency').value.toUpperCase(),
    };

    try {
        const updated = await api.updateTrip(state.activeTrip.id, tripData);
        Object.assign(state.activeTrip, updated);

        // Update trips list
        const idx = state.trips.findIndex(t => t.id === state.activeTrip.id);
        if (idx !== -1) state.trips[idx] = { ...state.trips[idx], ...updated };

        showToast('Trip updated successfully!', 'success');
        renderTripSelector();
    } catch (error) {
        showToast('Failed to update trip: ' + error.message, 'error');
    }
}

// ==================== GLOBAL FUNCTIONS ====================

window.switchTab = function(tabId) {
    state.currentTab = tabId;
    renderTabs();
    renderTabContent();
};

window.switchTrip = async function(tripId) {
    try {
        const trip = state.trips.find(t => t.id === tripId);
        if (!trip) return;

        state.activeTrip = trip;
        state.expenses = await api.getExpenses(tripId);

        await api.activateTrip(tripId);

        renderTripSelector();
        renderTabContent();
    } catch (error) {
        showToast('Failed to switch trip: ' + error.message, 'error');
    }
};

window.showCreateTripModal = function() {
    const modal = document.createElement('div');
    modal.id = 'create-trip-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 fade-in">
            <h3 class="text-xl font-bold text-gray-900 mb-4">Create New Trip</h3>
            <form id="create-trip-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Trip Name *</label>
                    <input type="text" id="new-trip-name" required placeholder="e.g., Summer Europe Trip"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                        <input type="date" id="new-trip-start" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                        <input type="date" id="new-trip-end" required
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Budget *</label>
                        <input type="number" id="new-trip-budget" required step="0.01" placeholder="5000"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                        <input type="text" id="new-trip-currency" required maxlength="3" placeholder="USD" value="USD"
                               class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                    </div>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="window.closeModal('create-trip-modal')"
                            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button type="submit"
                            class="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                        Create Trip
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('create-trip-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const tripData = {
            name: document.getElementById('new-trip-name').value,
            startDate: document.getElementById('new-trip-start').value,
            endDate: document.getElementById('new-trip-end').value,
            totalBudget: parseFloat(document.getElementById('new-trip-budget').value),
            currency: document.getElementById('new-trip-currency').value.toUpperCase(),
            destinations: [],
        };

        try {
            const newTrip = await api.createTrip(tripData);
            state.trips.unshift(newTrip);
            state.activeTrip = newTrip;
            state.expenses = [];

            window.closeModal('create-trip-modal');
            showToast('Trip created successfully!', 'success');

            renderTripSelector();
            renderTabs();
            renderTabContent();
        } catch (error) {
            showToast('Failed to create trip: ' + error.message, 'error');
        }
    });
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
};

window.deleteExpense = async function(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
        await api.deleteExpense(expenseId);
        const expense = state.expenses.find(e => e.id === expenseId);
        if (expense) {
            state.activeTrip.spent -= expense.amount;
        }
        state.expenses = state.expenses.filter(e => e.id !== expenseId);

        showToast('Expense deleted', 'success');
        renderTabContent();
        renderTripSelector();
    } catch (error) {
        showToast('Failed to delete expense: ' + error.message, 'error');
    }
};

window.deleteTrip = async function(tripId) {
    if (!confirm('Are you sure you want to delete this trip and all its expenses? This cannot be undone.')) return;

    try {
        await api.deleteTrip(tripId);
        state.trips = state.trips.filter(t => t.id !== tripId);
        state.activeTrip = state.trips[0] || null;

        if (state.activeTrip) {
            state.expenses = await api.getExpenses(state.activeTrip.id);
        } else {
            state.expenses = [];
        }

        showToast('Trip deleted', 'success');
        state.currentTab = 'dashboard';
        renderTripSelector();
        renderTabs();
        renderTabContent();
    } catch (error) {
        showToast('Failed to delete trip: ' + error.message, 'error');
    }
};

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

    toast.className = `toast ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span>${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== START APP ====================

init();