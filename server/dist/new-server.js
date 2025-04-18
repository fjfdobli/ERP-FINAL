"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_js_1 = require("@supabase/supabase-js");
// Load environment variables
dotenv_1.default.config();
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://iyjfpkcxwljfkxbjagbd.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Add your service role key here
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// Initialize Express app
const app = (0, express_1.default)();
const PORT = 9999;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Authentication middleware
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    try {
        const { data, error } = yield supabase.auth.getUser(token);
        if (error || !data.user) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }
        req.user = data.user;
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, error: error.message });
    }
});
// Basic route
app.get('/', (req, res) => {
    res.send('Printing Press ERP API is running');
});
// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});
// Test Supabase connection
app.get('/api/test-db', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase.from('clients').select('count');
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Failed to connect to database',
                error: error.message
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Successfully connected to Supabase database',
            data
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}));
// ================ AUTH ROUTES ================
app.post('/api/auth/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, firstName, lastName } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Create user in Supabase Auth
        const { data, error } = yield supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    firstName,
                    lastName
                }
            }
        });
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            message: 'User created successfully. Please check your email for confirmation.',
            data: {
                user: data.user
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/auth/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        const { data, error } = yield supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            return res.status(401).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: {
                user: data.user,
                session: data.session
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/auth/logout', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error } = yield supabase.auth.signOut();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/auth/me', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({
        success: true,
        data: {
            user: req.user
        }
    });
}));
// ================ CLIENTS ROUTES ================
app.get('/api/clients', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase
            .from('clients')
            .select('*');
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/clients/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { data, error } = yield supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/clients', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, contactPerson, email, phone, address, notes } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        const { data, error } = yield supabase
            .from('clients')
            .insert([{
                name,
                contactPerson,
                email,
                phone,
                address,
                notes,
                createdBy: req.user.id
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/clients/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, contactPerson, email, phone, address, notes } = req.body;
        const { data, error } = yield supabase
            .from('clients')
            .update({
            name,
            contactPerson,
            email,
            phone,
            address,
            notes,
            updatedAt: new Date()
        })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.delete('/api/clients/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { error } = yield supabase
            .from('clients')
            .delete()
            .eq('id', id);
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Client deleted successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// ================ ORDERS ROUTES ================
app.get('/api/orders', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase
            .from('orders')
            .select('*, clients(name)');
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/orders/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { data, error } = yield supabase
            .from('orders')
            .select('*, clients(name), orderItems(*)')
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/orders', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { clientId, title, description, status, deadline, items } = req.body;
        if (!clientId || !title) {
            return res.status(400).json({ success: false, error: 'Client ID and title are required' });
        }
        // Generate a unique order ID (e.g., ORD-2025-00001)
        const orderIdPrefix = 'ORD-' + new Date().getFullYear() + '-';
        const { data: lastOrder, error: countError } = yield supabase
            .from('orders')
            .select('orderId')
            .ilike('orderId', orderIdPrefix + '%')
            .order('orderId', { ascending: false })
            .limit(1);
        let nextOrderNumber = 1;
        if (!countError && lastOrder && lastOrder.length > 0) {
            const lastOrderNumber = parseInt(lastOrder[0].orderId.split('-')[2]);
            nextOrderNumber = lastOrderNumber + 1;
        }
        const orderId = orderIdPrefix + nextOrderNumber.toString().padStart(5, '0');
        // Calculate total amount
        let totalAmount = 0;
        if (items && items.length > 0) {
            totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        }
        // Create order
        const { data, error } = yield supabase
            .from('orders')
            .insert([{
                orderId,
                clientId,
                title,
                description,
                status: status || 'Pending',
                totalAmount,
                amountPaid: 0,
                deadline,
                createdBy: req.user.id
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        // Create order items if provided
        if (items && items.length > 0 && data && data.length > 0) {
            const orderItems = items.map((item) => (Object.assign({ orderId: data[0].id }, item)));
            const { error: itemsError } = yield supabase
                .from('orderItems')
                .insert(orderItems);
            if (itemsError) {
                return res.status(400).json({
                    success: false,
                    error: 'Order created but failed to add items: ' + itemsError.message
                });
            }
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/orders/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { clientId, title, description, status, deadline } = req.body;
        const { data, error } = yield supabase
            .from('orders')
            .update({
            clientId,
            title,
            description,
            status,
            deadline,
            updatedAt: new Date()
        })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/orders/:id/status', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { data, error } = yield supabase
            .from('orders')
            .update({ status, updatedAt: new Date() })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/orders/:id/items', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const item = req.body;
        if (!item.itemName || !item.quantity || !item.unitPrice) {
            return res.status(400).json({
                success: false,
                error: 'Item name, quantity, and unit price are required'
            });
        }
        const { data, error } = yield supabase
            .from('orderItems')
            .insert([Object.assign(Object.assign({}, item), { orderId: id })])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        // Update order total amount
        const { data: orderItems } = yield supabase
            .from('orderItems')
            .select('quantity, unitPrice')
            .eq('orderId', id);
        if (orderItems) {
            const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            yield supabase
                .from('orders')
                .update({ totalAmount, updatedAt: new Date() })
                .eq('id', id);
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// Process an order (update status and inventory)
app.post('/api/orders/:id/process', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Update order status
        const { data: order, error: orderError } = yield supabase
            .from('orders')
            .update({ status, updatedAt: new Date() })
            .eq('id', id)
            .select('*, orderItems(*)')
            .single();
        if (orderError) {
            return res.status(400).json({ success: false, error: orderError.message });
        }
        // If status is "In Progress", update inventory
        if (status === 'In Progress' && (order === null || order === void 0 ? void 0 : order.orderItems)) {
            // For each item, reduce inventory quantity
            for (const item of order.orderItems) {
                // Find matching inventory items based on specifications
                const { data: inventoryItems, error: invError } = yield supabase
                    .from('inventory')
                    .select('*')
                    .eq('itemType', item.itemType)
                    .eq('paperType', item.paperType)
                    .single();
                if (!invError && inventoryItems) {
                    // Update inventory quantity
                    const newQuantity = Math.max(0, inventoryItems.quantity - item.quantity);
                    yield supabase
                        .from('inventory')
                        .update({ quantity: newQuantity, updatedAt: new Date() })
                        .eq('id', inventoryItems.id);
                    // Record transaction
                    yield supabase
                        .from('inventoryTransactions')
                        .insert([{
                            inventoryId: inventoryItems.id,
                            transactionType: 'Order Usage',
                            quantity: item.quantity,
                            orderId: id,
                            createdBy: req.user.id
                        }]);
                }
            }
        }
        return res.status(200).json({
            success: true,
            data: order
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// ================ INVENTORY ROUTES ================
app.get('/api/inventory', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase
            .from('inventory')
            .select('*, suppliers(name)');
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/inventory/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { data, error } = yield supabase
            .from('inventory')
            .select('*, suppliers(name)')
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/inventory/low-stock', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase
            .from('inventory')
            .select('*, suppliers(name)')
            .lt('quantity', 'minStockLevel');
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/inventory', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemName, itemType, sku, quantity, unitPrice, minStockLevel, supplierId } = req.body;
        if (!itemName || !itemType) {
            return res.status(400).json({
                success: false,
                error: 'Item name and type are required'
            });
        }
        const { data, error } = yield supabase
            .from('inventory')
            .insert([{
                itemName,
                itemType,
                sku,
                quantity: quantity || 0,
                unitPrice: unitPrice || 0,
                minStockLevel: minStockLevel || 10,
                supplierId
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/inventory/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { itemName, itemType, sku, quantity, unitPrice, minStockLevel, supplierId } = req.body;
        const { data, error } = yield supabase
            .from('inventory')
            .update({
            itemName,
            itemType,
            sku,
            quantity,
            unitPrice,
            minStockLevel,
            supplierId,
            updatedAt: new Date()
        })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/inventory/:id/transactions', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { transactionType, quantity, orderId } = req.body;
        if (!transactionType || !quantity) {
            return res.status(400).json({
                success: false,
                error: 'Transaction type and quantity are required'
            });
        }
        // Get current inventory item
        const { data: inventoryItem, error: getError } = yield supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();
        if (getError) {
            return res.status(404).json({ success: false, error: 'Inventory item not found' });
        }
        // Calculate new quantity
        let newQuantity = inventoryItem.quantity;
        if (transactionType === 'Restock' || transactionType === 'Adjustment Increase') {
            newQuantity += quantity;
        }
        else if (transactionType === 'Order Usage' || transactionType === 'Adjustment Decrease') {
            newQuantity = Math.max(0, newQuantity - quantity);
        }
        // Update inventory quantity
        const { error: updateError } = yield supabase
            .from('inventory')
            .update({ quantity: newQuantity, updatedAt: new Date() })
            .eq('id', id);
        if (updateError) {
            return res.status(400).json({ success: false, error: updateError.message });
        }
        // Record transaction
        const { data: transaction, error: transactionError } = yield supabase
            .from('inventoryTransactions')
            .insert([{
                inventoryId: id,
                transactionType,
                quantity,
                orderId,
                createdBy: req.user.id
            }])
            .select();
        if (transactionError) {
            return res.status(400).json({ success: false, error: transactionError.message });
        }
        return res.status(201).json({
            success: true,
            data: {
                transaction: transaction[0],
                newQuantity
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// ================ SUPPLIERS ROUTES ================
app.get('/api/suppliers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase
            .from('suppliers')
            .select('*');
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/suppliers/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { data, error } = yield supabase
            .from('suppliers')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/suppliers', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, contactPerson, email, phone, address, notes } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Name is required' });
        }
        const { data, error } = yield supabase
            .from('suppliers')
            .insert([{
                name,
                contactPerson,
                email,
                phone,
                address,
                notes,
                createdBy: req.user.id
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/suppliers/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, contactPerson, email, phone, address, notes } = req.body;
        const { data, error } = yield supabase
            .from('suppliers')
            .update({
            name,
            contactPerson,
            email,
            phone,
            address,
            notes,
            updatedAt: new Date()
        })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.delete('/api/suppliers/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { error } = yield supabase
            .from('suppliers')
            .delete()
            .eq('id', id);
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Supplier deleted successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// ================ EMPLOYEES ROUTES ================
app.get('/api/employees', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase
            .from('employees')
            .select('*');
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/employees/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { data, error } = yield supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// Continuing EMPLOYEES ROUTES
app.post('/api/employees', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstName, lastName, email, phone, position, department, baseSalary, joiningDate } = req.body;
        if (!firstName || !lastName || !position || !baseSalary) {
            return res.status(400).json({
                success: false,
                error: 'First name, last name, position, and base salary are required'
            });
        }
        // Generate a unique employee ID (e.g., EMP-001)
        const { data: lastEmployee, error: countError } = yield supabase
            .from('employees')
            .select('employeeId')
            .order('employeeId', { ascending: false })
            .limit(1);
        let nextEmployeeNumber = 1;
        if (!countError && lastEmployee && lastEmployee.length > 0) {
            const lastNumber = parseInt(lastEmployee[0].employeeId.split('-')[1]);
            nextEmployeeNumber = lastNumber + 1;
        }
        const employeeId = 'EMP-' + nextEmployeeNumber.toString().padStart(3, '0');
        const { data, error } = yield supabase
            .from('employees')
            .insert([{
                employeeId,
                firstName,
                lastName,
                email,
                phone,
                position,
                department,
                baseSalary,
                joiningDate: joiningDate || new Date(),
                createdBy: req.user.id
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/employees/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, position, department, baseSalary, joiningDate } = req.body;
        const { data, error } = yield supabase
            .from('employees')
            .update({
            firstName,
            lastName,
            email,
            phone,
            position,
            department,
            baseSalary,
            joiningDate,
            updatedAt: new Date()
        })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.delete('/api/employees/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { error } = yield supabase
            .from('employees')
            .delete()
            .eq('id', id);
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Employee deleted successfully'
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// ================ ATTENDANCE ROUTES ================
app.get('/api/attendance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, employeeId } = req.query;
        let query = supabase.from('attendance').select('*, employees(firstName, lastName)');
        if (date) {
            query = query.eq('attendanceDate', date);
        }
        if (employeeId) {
            query = query.eq('employeeId', employeeId);
        }
        const { data, error } = yield query;
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/attendance', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId, attendanceDate, morningPresent, afternoonPresent, notes } = req.body;
        if (!employeeId || !attendanceDate) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID and date are required'
            });
        }
        // Check if attendance record already exists for this employee and date
        const { data: existingRecord, error: checkError } = yield supabase
            .from('attendance')
            .select('*')
            .eq('employeeId', employeeId)
            .eq('attendanceDate', attendanceDate)
            .maybeSingle();
        if (existingRecord) {
            return res.status(400).json({
                success: false,
                error: 'Attendance record already exists for this employee and date'
            });
        }
        const { data, error } = yield supabase
            .from('attendance')
            .insert([{
                employeeId,
                attendanceDate,
                morningPresent: morningPresent || false,
                afternoonPresent: afternoonPresent || false,
                status: 'Recorded',
                notes,
                createdBy: req.user.id
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/attendance/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { morningPresent, afternoonPresent, morningIn, morningOut, afternoonIn, afternoonOut, status, notes } = req.body;
        const { data, error } = yield supabase
            .from('attendance')
            .update({
            morningPresent,
            afternoonPresent,
            morningIn,
            morningOut,
            afternoonIn,
            afternoonOut,
            status,
            notes,
            updatedAt: new Date()
        })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// ================ MACHINERY ROUTES ================
app.get('/api/machinery', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase
            .from('machinery')
            .select('*');
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            data: data || []
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/machinery/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { data, error } = yield supabase
            .from('machinery')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/machinery', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, model, serialNumber, status, purchaseDate, warrantyUntil, specifications } = req.body;
        if (!name || !model) {
            return res.status(400).json({
                success: false,
                error: 'Name and model are required'
            });
        }
        const { data, error } = yield supabase
            .from('machinery')
            .insert([{
                name,
                model,
                serialNumber,
                status: status || 'Operational',
                purchaseDate,
                warrantyUntil,
                specifications
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.put('/api/machinery/:id/status', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }
        const { data, error } = yield supabase
            .from('machinery')
            .update({ status, updatedAt: new Date() })
            .eq('id', id)
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(200).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.post('/api/machinery/:id/maintenance', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { maintenanceDate, maintenanceType, description, cost, performedBy } = req.body;
        if (!maintenanceDate || !maintenanceType) {
            return res.status(400).json({
                success: false,
                error: 'Maintenance date and type are required'
            });
        }
        const { data, error } = yield supabase
            .from('maintenanceLogs')
            .insert([{
                machineryId: id,
                maintenanceDate,
                maintenanceType,
                description,
                cost: cost || 0,
                performedBy,
                createdBy: req.user.id
            }])
            .select();
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        return res.status(201).json({
            success: true,
            data: data[0]
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// ================ REPORTS ROUTES ================
app.get('/api/reports/sales', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        let query = supabase.from('orders').select('*');
        if (startDate) {
            query = query.gte('createdAt', startDate);
        }
        if (endDate) {
            query = query.lte('createdAt', endDate);
        }
        const { data, error } = yield query;
        if (error) {
            return res.status(400).json({ success: false, error: error.message });
        }
        // Calculate totals
        const totalOrders = data.length;
        const totalSales = data.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const totalPaid = data.reduce((sum, order) => sum + (order.amountPaid || 0), 0);
        const outstanding = totalSales - totalPaid;
        // Group by status
        const statusCounts = {};
        data.forEach((order) => {
            if (order.status) {
                statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
            }
        });
        return res.status(200).json({
            success: true,
            data: {
                totalOrders,
                totalSales,
                totalPaid,
                outstanding,
                statusCounts,
                orders: data
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
app.get('/api/reports/inventory', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get all inventory items
        const { data: inventory, error: inventoryError } = yield supabase
            .from('inventory')
            .select('*');
        if (inventoryError) {
            return res.status(400).json({ success: false, error: inventoryError.message });
        }
        // Get low stock items
        const { data: lowStock, error: lowStockError } = yield supabase
            .from('inventory')
            .select('*')
            .lt('quantity', 'minStockLevel');
        if (lowStockError) {
            return res.status(400).json({ success: false, error: lowStockError.message });
        }
        // Calculate inventory value
        const totalItems = inventory.length;
        const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const lowStockCount = lowStock.length;
        return res.status(200).json({
            success: true,
            data: {
                totalItems,
                totalValue,
                lowStockCount,
                lowStockItems: lowStock,
                inventory
            }
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}));
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
