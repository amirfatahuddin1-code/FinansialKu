
// ========== Home Dashboard (Beranda) Widgets ==========

// Declare chart variable for Home Budget
if (typeof homeBudgetChart === 'undefined') {
    var homeBudgetChart = null;
}

function initHomeDashboard() {
    console.log('Using new Home Dashboard layout');
    // We don't render here, updateHomeWidgets() called by updateDashboard() will handle it.
}

function updateHomeWidgets() {
    // Only run if Beranda tab is active (optimization)
    // Actually, run always to ensure data is fresh when switching

    updateHomeBudgetWidget();
    updateHomeEventsWidget();
    updateHomeLoansWidget();
    updateHomeTransactionsWidget();
    updateHomeSavingsWidget();
}

// 1. Budget Widget
function updateHomeBudgetWidget() {
    const ctx = document.getElementById('homeBudgetChart');
    if (!ctx) return;

    // Calculate Budget Usage
    let totalBudget = 0;
    let totalSpent = 0;

    // Simple logic: Assume monthly period for widget Overview
    // Using filtered Transactions (which might be manipulated by dashboard period)
    // To make it robust for "Home", let's force calculation based on THIS MONTH
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthlyTx = state.transactions.filter(t =>
        t.type === 'expense' &&
        t.date >= startOfMonth &&
        t.date <= endOfMonth
    );

    totalSpent = monthlyTx.reduce((sum, t) => sum + t.amount, 0);

    // Calculate total budget from Budgets object
    // Budgets are stored per category. Sum them up.
    if (state.budgets) {
        Object.values(state.budgets).forEach(limit => {
            totalBudget += limit;
        });
    }

    // fallback for budget if 0 (to avoid division by zero visual issues)
    const renderBudget = totalBudget > 0 ? totalBudget : totalSpent * 1.2; // arbitary scale if no budget
    const percentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Update Text
    const packetEl = document.getElementById('homeBudgetPercent');
    if (packetEl) packetEl.textContent = `${percentage}%`;

    // Render/Update Chart
    if (homeBudgetChart) {
        homeBudgetChart.destroy();
    }

    homeBudgetChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Terpakai', 'Sisa'],
            datasets: [{
                data: [totalSpent, Math.max(0, renderBudget - totalSpent)],
                backgroundColor: [
                    percentage > 100 ? '#ef4444' : (percentage > 80 ? '#f59e0b' : '#10b981'),
                    'rgba(255, 255, 255, 0.1)'
                ],
                borderWidth: 0,
                cutout: '85%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });

    // Render Legend
    const legendContainer = document.getElementById('homeBudgetLegend');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div class="legend-item-mini">
                <div class="legend-info">
                   <div class="legend-color" style="background: ${percentage > 100 ? '#ef4444' : (percentage > 80 ? '#f59e0b' : '#10b981')}"></div>
                   <span>Terpakai (Rp ${formatCurrencyCompact(totalSpent)})</span>
                </div>
            </div>
             <div class="legend-item-mini">
                <div class="legend-info">
                   <div class="legend-color" style="background: rgba(255, 255, 255, 0.2)"></div>
                   <span>Budget (Rp ${formatCurrencyCompact(totalBudget)})</span>
                </div>
            </div>
        `;
    }
}

// 2. Events Widget
function updateHomeEventsWidget() {
    const list = document.getElementById('homeEventsList');
    if (!list) return;

    const now = new Date();
    // Get upcoming events (future date/time)
    // Filter active events only
    const upcoming = state.events
        .filter(e => !e.isArchived && new Date(e.date) >= new Date(now.setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3); // Top 3

    if (upcoming.length === 0) {
        list.innerHTML = '<div class="empty-state small"><p>Tidak ada acara mendatang</p></div>';
        document.getElementById('homeEventsTotalNeeds').parentElement.style.display = 'none'; // hide summary
        return;
    }

    list.innerHTML = upcoming.map(e => {
        const dateObj = new Date(e.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString('id-ID', { month: 'short' });

        return `
            <div class="event-item-mini" onclick="openEventModal('${e.id}')">
                <div class="event-date-box">
                    <span class="date-day">${day}</span>
                    <span class="date-month">${month}</span>
                </div>
                <div class="event-info-mini">
                    <div class="event-title-mini">${e.name}</div>
                    <div class="event-subtitle-mini">${e.category || 'Event'}</div>
                </div>
                <div class="event-amount-mini">
                    <span class="amount-val">${formatCurrencyCompact(e.budget)}</span>
                    <span class="amount-label">BUDGET</span>
                </div>
            </div>
        `;
    }).join('');

    // Update footer summary
    const totalNeeds = upcoming.reduce((sum, e) => sum + (e.budget - (e.totalSpent || 0)), 0);
    const summaryEl = document.getElementById('homeEventsTotalNeeds');
    if (summaryEl) {
        summaryEl.textContent = `Kekurangan dana: ${formatCurrency(totalNeeds)}`;
        summaryEl.parentElement.style.display = 'flex';
    }
}

// 3. Transactions Widget (Mini)
function updateHomeTransactionsWidget() {
    const list = document.getElementById('homeTransactionsList');
    if (!list) return;

    // Get top 5 recent transactions
    const recent = state.transactions.slice(0, 5);

    if (recent.length === 0) {
        list.innerHTML = '<div class="empty-state small"><p>Belum ada transaksi</p></div>';
    } else {
        list.innerHTML = recent.map(t => {
            const c = state.categories.find(x => x.id === t.categoryId) || { icon: '📦', name: 'Lainnya' };
            const isInc = t.type === 'income';
            return `
                <div class="tx-item-mini">
                    <div class="tx-left">
                        <div class="tx-icon-mini">${c.icon}</div>
                        <div class="tx-details">
                            <span class="tx-name">${t.description || c.name}</span>
                            <span class="tx-cat">${c.name}</span>
                        </div>
                    </div>
                    <span class="tx-amount ${t.type}">${isInc ? '+' : '-'} ${formatCurrencyCompact(t.amount)}</span>
                </div>
             `;
        }).join('');
    }

    // Update Savings Progress bar
    // Logic: Total Income vs Total Expense (All time or Monthly?)
    // Let's use Monthly Savings Ratio
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const monthlyTx = state.transactions.filter(t => t.date >= startOfMonth);
    const income = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const savings = income - expense;

    // Arbitary target: 20% of Income
    const targetSavings = income * 0.2;
    const percent = targetSavings > 0 ? Math.round((savings / targetSavings) * 100) : 0;
    const finalPercent = Math.max(0, Math.min(100, percent));

    document.getElementById('homeSavingsPercent').textContent = `${finalPercent}%`;
    document.getElementById('homeSavingsBar').style.width = `${finalPercent}%`;
    // Color logic
    const bar = document.getElementById('homeSavingsBar');
    if (finalPercent >= 100) bar.style.backgroundColor = 'var(--success)';
    else if (finalPercent >= 50) bar.style.backgroundColor = 'var(--accent-primary)';
    else bar.style.backgroundColor = 'var(--warning)';

    document.getElementById('homeSavingsTargetText').textContent = `Sisa simpanan: ${formatCurrencyCompact(savings)} (Target 20%)`;
}

// 4. Savings Widget (List)
function updateHomeSavingsWidget() {
    const list = document.getElementById('homeSavingsList');
    if (!list) return;

    const goals = state.savings || [];

    if (goals.length === 0) {
        list.innerHTML = '<div class="empty-state small"><p>Belum ada target tabungan</p></div>';
        return;
    }

    list.innerHTML = goals.map(g => {
        const percent = Math.round((g.current / g.target) * 100);
        return `
            <div style="margin-bottom: var(--space-3);">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:var(--font-size-sm);">
                    <span style="font-weight:500;">${g.name}</span>
                    <span style="color:var(--accent-primary); font-weight:600;">${percent}%</span>
                </div>
                 <div class="budget-progress" style="height:6px; background:var(--bg-secondary);">
                    <div class="budget-progress-bar" style="width: ${percent}%; background: var(--accent-primary);"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:2px;">
                    <span>${formatCurrencyCompact(g.current)}</span>
                    <span>Target: ${formatCurrencyCompact(g.target)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 5. Debt Widget
function updateHomeLoansWidget() {
    const debts = state.debts || [];

    // Calculate Totals
    const payable = debts.filter(d => d.type === 'payable' && d.status === 'unpaid').reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);
    const receivable = debts.filter(d => d.type === 'receivable' && d.status === 'unpaid').reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);

    const payEl = document.getElementById('homeTotalDebt');
    const recEl = document.getElementById('homeTotalReceivable');

    if (payEl) payEl.textContent = formatCurrencyCompact(payable);
    if (recEl) recEl.textContent = formatCurrencyCompact(receivable);

    // List Top 3 Due
    const list = document.getElementById('homeDebtList');
    if (list) {
        const unpaid = debts.filter(d => d.status === 'unpaid')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 3);

        if (unpaid.length === 0) {
            list.innerHTML = '<div class="empty-state small"><p>Tidak ada tanggungan aktif</p></div>';
        } else {
            list.innerHTML = unpaid.map(d => `
                <div class="debt-item-mini ${d.type === 'payable' ? 'pay' : 'receive'}">
                    <div class="debt-info-mini">
                        <h4>${d.name}</h4>
                        <p>${d.type === 'payable' ? 'Hutang ke' : 'Piutang dari'}: ${d.counterpart || '-'}</p>
                    </div>
                    <div class="debt-amount-mini" style="text-align:right;">
                         <div style="font-weight:600; font-size:12px;">${formatCurrencyCompact(d.amount - (d.paid || 0))}</div>
                         <div style="font-size:9px; color:var(--text-muted);">${d.dueDate ? 'Jatuh tempo: ' + formatDateShort(d.dueDate) : '-'}</div>
                    </div>
                </div>
             `).join('');
        }
    }
}

// Helper: Compact Currency Format (e.g. 1.5jt)
function formatCurrencyCompact(amount) {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
    }
    if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'rb';
    }
    return amount.toLocaleString('id-ID');
}
