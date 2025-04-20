import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { 
  productProfileService, 
  Product, 
  ExtendedProduct, 
  CreateProduct, 
  UpdateProduct, 
  ProductMaterial 
} from '../../services/productProfileService';

// Define the state interface
interface ProductProfileState {
  products: ExtendedProduct[];
  selectedProduct: ExtendedProduct | null;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: ProductProfileState = {
  products: [],
  selectedProduct: null,
  isLoading: false,
  error: null
};

// Async thunks
export const uploadProductImage = createAsyncThunk(
  'productProfile/uploadProductImage',
  async ({ file, productId }: { file: File; productId: number }, { rejectWithValue }) => {
    try {
      return await productProfileService.uploadProductImage(file, productId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload product image');
    }
  }
);

export const uploadMultipleProductImages = createAsyncThunk(
  'productProfile/uploadMultipleProductImages',
  async ({ files, productId }: { files: File[]; productId: number }, { rejectWithValue }) => {
    try {
      return await productProfileService.uploadMultipleProductImages(files, productId);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload product images');
    }
  }
);

export const fetchProducts = createAsyncThunk(
  'productProfile/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      return await productProfileService.getProducts();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch products');
    }
  }
);

export const fetchProductById = createAsyncThunk(
  'productProfile/fetchProductById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await productProfileService.getProductById(id);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch product');
    }
  }
);

export const searchProducts = createAsyncThunk(
  'productProfile/searchProducts',
  async (query: string, { rejectWithValue }) => {
    try {
      return await productProfileService.searchProducts(query);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to search products');
    }
  }
);

export const createProduct = createAsyncThunk(
  'productProfile/createProduct',
  async ({ 
    product, 
    materials 
  }: { 
    product: CreateProduct, 
    materials: Omit<ProductMaterial, 'id' | 'productId'>[] 
  }, { rejectWithValue }) => {
    try {
      return await productProfileService.createProduct(product, materials);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'productProfile/updateProduct',
  async ({ 
    id, 
    updates, 
    materials 
  }: { 
    id: number, 
    updates: UpdateProduct, 
    materials: ProductMaterial[] 
  }, { rejectWithValue }) => {
    try {
      return await productProfileService.updateProduct(id, updates, materials);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'productProfile/deleteProduct',
  async (id: number, { rejectWithValue }) => {
    try {
      await productProfileService.deleteProduct(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete product');
    }
  }
);

// Create the slice
const productProfileSlice = createSlice({
  name: 'productProfile',
  initialState,
  reducers: {
    setSelectedProduct: (state, action: PayloadAction<ExtendedProduct | null>) => {
      state.selectedProduct = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all products
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch product by ID
      .addCase(fetchProductById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedProduct = action.payload;
        state.error = null;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Search products
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload;
        state.error = null;
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products.push(action.payload);
        state.error = null;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex(product => product.id === updatedProduct.id);
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
        if (state.selectedProduct?.id === updatedProduct.id) {
          state.selectedProduct = updatedProduct;
        }
        state.error = null;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = state.products.filter(product => product.id !== action.payload);
        if (state.selectedProduct?.id === action.payload) {
          state.selectedProduct = null;
        }
        state.error = null;
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { setSelectedProduct, clearError } = productProfileSlice.actions;
export default productProfileSlice.reducer;

// Selectors
export const selectAllProducts = (state: RootState) => state.productProfile.products;
export const selectProductById = (state: RootState, productId: number) => 
  state.productProfile.products.find(product => product.id === productId);
export const selectSelectedProduct = (state: RootState) => state.productProfile.selectedProduct;
export const selectProductLoading = (state: RootState) => state.productProfile.isLoading;
export const selectProductError = (state: RootState) => state.productProfile.error;