/**
 * FinansialKu Sync Server
 * Receives transactions from n8n Telegram workflow and serves them to the frontend
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'transactions.json');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize data file if not exists
function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ transactions: [] }, null, 2));
    }
}

function readData() {
    initDataFile();
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Routes

/**
 * POST /api/transaction
 * Receive transaction from n8n workflow
 */
app.post('/api/transaction', (req, res) => {
    try {
        const { type, amount, categoryId, description, date, source, chatId, originalMessage } = req.body;

        if (!type || !amount || !categoryId) {
            return res.status(400).json({ error: 'Missing required fields: type, amount, categoryId' });
        }

        const data = readData();
        const transaction = {
            id: generateId(),
            type,
            amount: parseInt(amount),
            categoryId,
            description: description || '',
            date: date || new Date().toISOString().split('T')[0],
            source: source || 'telegram',
            chatId,
            originalMessage,
            synced: false,
            createdAt: new Date().toISOString()
        };

        data.transactions.push(transaction);
        writeData(data);

        console.log(`✅ Transaction received: ${type} ${amount} - ${description}`);
        res.status(201).json({ success: true, transaction });
    } catch (error) {
        console.error('Error saving transaction:', error);
        res.status(500).json({ error: 'Failed to save transaction' });
    }
});

/**
 * POST /api/transactions/batch
 * Receive multiple transactions from receipt items
 */
app.post('/api/transactions/batch', (req, res) => {
    try {
        const { transactions: items, store, date: receiptDate, chatId, draft } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'items array required' });
        }

        const data = readData();
        const savedTransactions = [];
        const date = receiptDate || new Date().toISOString().split('T')[0];
        const isDraft = draft === true;
        const batchId = generateId(); // Group transactions together

        items.forEach((item, index) => {
            const transaction = {
                id: generateId(),
                batchId: batchId,
                type: item.type || 'expense',
                amount: parseInt(item.amount || item.price) || 0,
                categoryId: item.categoryId || item.category || 'other',
                description: item.description || item.name || `Item ${index + 1}`,
                date: date,
                source: 'telegram-receipt-item',
                store: store || '',
                chatId,
                draft: isDraft,
                synced: false,
                createdAt: new Date().toISOString()
            };

            if (transaction.amount > 0) {
                data.transactions.push(transaction);
                savedTransactions.push(transaction);
                console.log(`  📦 ${isDraft ? '[DRAFT]' : ''} Item: ${transaction.description} - Rp ${transaction.amount}`);
            }
        });

        writeData(data);

        console.log(`✅ ${isDraft ? 'Draft' : 'Batch'} receipt: ${savedTransactions.length} items from ${store || 'store'}`);
        res.status(201).json({
            success: true,
            count: savedTransactions.length,
            batchId: batchId,
            transactions: savedTransactions
        });
    } catch (error) {
        console.error('Error saving batch transactions:', error);
        res.status(500).json({ error: 'Failed to save batch transactions' });
    }
});

/**
 * POST /api/transactions/confirm/:batchId
 * Confirm draft transactions (change draft to false)
 */
app.post('/api/transactions/confirm/:batchId', (req, res) => {
    try {
        const { batchId } = req.params;
        const data = readData();

        let confirmed = 0;
        data.transactions.forEach(t => {
            if (t.batchId === batchId && t.draft === true) {
                t.draft = false;
                t.synced = false; // Mark for sync
                confirmed++;
            }
        });

        if (confirmed === 0) {
            return res.status(404).json({ error: 'No draft transactions found' });
        }

        writeData(data);
        console.log(`✅ Confirmed ${confirmed} transactions (batch: ${batchId})`);
        res.json({ success: true, confirmed });
    } catch (error) {
        console.error('Error confirming transactions:', error);
        res.status(500).json({ error: 'Failed to confirm transactions' });
    }
});

/**
 * DELETE /api/transactions/batch/:batchId
 * Delete all transactions in a batch (cancel draft)
 */
app.delete('/api/transactions/batch/:batchId', (req, res) => {
    try {
        const { batchId } = req.params;
        const data = readData();

        const initialLength = data.transactions.length;
        data.transactions = data.transactions.filter(t => t.batchId !== batchId);
        const deleted = initialLength - data.transactions.length;

        if (deleted === 0) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        writeData(data);
        console.log(`🗑️ Deleted batch ${batchId} (${deleted} items)`);
        res.json({ success: true, deleted });
    } catch (error) {
        console.error('Error deleting batch:', error);
        res.status(500).json({ error: 'Failed to delete batch' });
    }
});

/**
 * GET /api/transactions/draft/:chatId
 * Get latest draft for a chat
 */
app.get('/api/transactions/draft/:chatId', (req, res) => {
    try {
        const { chatId } = req.params;
        const data = readData();

        // Get drafts for this chatId
        const drafts = data.transactions
            .filter(t => t.chatId == chatId && t.draft === true)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (drafts.length === 0) {
            return res.json({ transactions: [], batchId: null });
        }

        // Get the latest batch
        const batchId = drafts[0].batchId;
        const batchTransactions = drafts.filter(t => t.batchId === batchId);

        res.json({
            transactions: batchTransactions,
            batchId: batchId
        });
    } catch (error) {
        console.error('Error getting draft:', error);
        res.status(500).json({ error: 'Failed to get draft' });
    }
});

/**
 * GET /api/transactions/last
 * Get last N transactions (for edit purposes)
 */
app.get('/api/transactions/last', (req, res) => {
    try {
        const count = parseInt(req.query.count) || 5;
        const chatId = req.query.chatId;

        const data = readData();
        let transactions = data.transactions;

        // Filter by chatId if provided
        if (chatId) {
            transactions = transactions.filter(t => t.chatId == chatId);
        }

        // Get last N transactions (newest first)
        const lastTransactions = transactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, count);

        res.json({ transactions: lastTransactions });
    } catch (error) {
        console.error('Error getting last transactions:', error);
        res.status(500).json({ error: 'Failed to get last transactions' });
    }
});

/**
 * PATCH /api/transactions/:id
 * Edit/Update a specific transaction
 */
app.patch('/api/transactions/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const data = readData();
        const index = data.transactions.findIndex(t => t.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Apply updates
        const allowedFields = ['amount', 'date', 'description', 'categoryId', 'type'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'amount') {
                    data.transactions[index][field] = parseInt(updates[field]);
                } else {
                    data.transactions[index][field] = updates[field];
                }
            }
        });

        // Mark as edited and unsynced so app picks up changes
        data.transactions[index].edited = true;
        data.transactions[index].synced = false;
        data.transactions[index].updatedAt = new Date().toISOString();

        writeData(data);

        console.log(`✏️ Transaction edited: ${id}`);
        res.json({ success: true, transaction: data.transactions[index] });
    } catch (error) {
        console.error('Error editing transaction:', error);
        res.status(500).json({ error: 'Failed to edit transaction' });
    }
});

/**
 * GET /api/transactions
 * Get all unsynced transactions for FinansialKu to poll
 */
app.get('/api/transactions', (req, res) => {
    try {
        const data = readData();
        const unsynced = data.transactions.filter(t => !t.synced);
        res.json({ transactions: unsynced });
    } catch (error) {
        console.error('Error reading transactions:', error);
        res.status(500).json({ error: 'Failed to read transactions' });
    }
});

/**
 * POST /api/transactions/mark-synced
 * Mark transactions as synced after FinansialKu imports them
 */
app.post('/api/transactions/mark-synced', (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'ids array required' });
        }

        const data = readData();
        data.transactions.forEach(t => {
            if (ids.includes(t.id)) {
                t.synced = true;
            }
        });
        writeData(data);

        console.log(`✅ Marked ${ids.length} transactions as synced`);
        res.json({ success: true, count: ids.length });
    } catch (error) {
        console.error('Error marking synced:', error);
        res.status(500).json({ error: 'Failed to mark synced' });
    }
});

/**
 * DELETE /api/transactions/:id
 * Delete a specific transaction
 */
app.delete('/api/transactions/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = readData();
        const initialLength = data.transactions.length;
        data.transactions = data.transactions.filter(t => t.id !== id);

        if (data.transactions.length === initialLength) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        writeData(data);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    initDataFile();
    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 FinansialKu Sync Server                      ║
║                                                   ║
║   Server running on http://localhost:${PORT}        ║
║                                                   ║
║   Endpoints:                                      ║
║   POST   /api/transaction         → Add new       ║
║   GET    /api/transactions        → Get unsynced  ║
║   POST   /api/transactions/mark-synced            ║
║   DELETE /api/transactions/:id    → Delete        ║
║   GET    /api/health              → Health check  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});
