import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import clientsReducer from './slices/clientsSlice';
import ordersReducer from './slices/clientOrdersSlice';
import orderRequestReducer from './slices/orderRequestSlice';
import inventoryReducer from './slices/inventorySlice';
import employeesReducer from './slices/employeesSlice';
import attendanceReducer from './slices/attendanceSlice';
import payrollReducer from './slices/payrollSlice';
import machineryReducer from './slices/machinerySlice';
import suppliersReducer from './slices/suppliersSlice';
import productProfileReducer from './slices/productProfileSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  clients: clientsReducer,
  orders: ordersReducer,
  orderRequest: orderRequestReducer,
  inventory: inventoryReducer,
  employees: employeesReducer,
  attendance: attendanceReducer,
  payroll: payrollReducer,
  machinery: machineryReducer,
  suppliers: suppliersReducer,
  productProfile: productProfileReducer
});

export default rootReducer;