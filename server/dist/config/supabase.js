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
exports.checkConnection = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = 'https://iyjfpkcxwljfkxbjagbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5amZwa2N4d2xqZmt4YmphZ2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjY2ODk3NSwiZXhwIjoyMDU4MjQ0OTc1fQ.m3Zt4gdwgkvtiqKoz51fqsiSf2Os7W7J8sZccxSwit4';
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const checkConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield exports.supabase.from('clients').select('*');
        if (error) {
            return {
                success: false,
                message: error.message,
                error
            };
        }
        return {
            success: true,
            message: 'Successfully connected to Supabase database',
            count: (data === null || data === void 0 ? void 0 : data.length) || 0,
            sample: (data === null || data === void 0 ? void 0 : data.length) > 0 ? data[0] : null
        };
    }
    catch (err) {
        const error = err;
        return {
            success: false,
            message: error.message,
            error
        };
    }
});
exports.checkConnection = checkConnection;
