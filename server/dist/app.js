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
const supabase_1 = require("./config/supabase");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Test route
app.get('/', (req, res) => {
    res.send('Printing Press ERP API is running');
});
// Test Supabase connection
app.get('/api/test-db', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, supabase_1.checkConnection)();
    res.json(result);
}));
// Get all clients example
app.get('/api/clients', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase
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
    catch (err) {
        const error = err;
        return res.status(500).json({
            success: false,
            error: error.message || 'An unknown error occurred'
        });
    }
}));
exports.default = app;
