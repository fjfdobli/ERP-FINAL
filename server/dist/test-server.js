"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log('Starting server on port 8888');
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const PORT = 8888;
app.get('/', (req, res) => {
    res.send('Test server running');
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
