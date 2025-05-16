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
        
        // Ensure all products have proper unit_type values for materials
        const productsWithUnitTypes = action.payload.map(product => {
          // First log the product materials to debug what's coming in
          if (product.materials && product.materials.length > 0) {
            console.log(`[REDUX] Product ${product.id} materials unit_types before processing:`, 
              product.materials.map(m => m.unit_type));
          }
          
          return {
            ...product,
            materials: product.materials.map(material => {
              // Always log the unit_type being processed to help debug
              console.log(`Material ${material.id} unit_type processing:`, {
                materialId: material.materialId,
                materialName: material.materialName,
                unit_type_orig: material.unit_type,
                has_unit_type: material.unit_type !== undefined && material.unit_type !== null
              });
              
              // Keep the original unit_type if present, fallback only if needed
              return {
                ...material,
                // Preserve original unit_type, only use fallback if undefined/null
                unit_type: material.unit_type || 'piece',
                // Also ensure otherType is defined
                otherType: material.otherType || ''
              };
            })
          };
        });
        
        // Log first product's materials after processing
        if (productsWithUnitTypes.length > 0 && productsWithUnitTypes[0].materials.length > 0) {
          console.log('[REDUX] First product materials after processing:', 
            productsWithUnitTypes[0].materials.map(m => ({ 
              id: m.id, 
              materialName: m.materialName,
              unit_type: m.unit_type,
              otherType: m.otherType 
            })));
        }
        
        state.products = productsWithUnitTypes;
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
        
        // Ensure created product has proper unit_type values for materials
        const createdProduct = {
          ...action.payload,
          materials: action.payload.materials.map(material => ({
            ...material,
            // Force unit_type to be present and correct
            unit_type: material.unit_type || 'piece'
          }))
        };
        
        // Log the product being created with unit_types
        console.log('[REDUX] Created product with forced unit_types:', 
                  JSON.stringify({
                    id: createdProduct.id,
                    materials: createdProduct.materials.map(m => ({
                      id: m.id,
                      materialName: m.materialName,
                      unit_type: m.unit_type
                    }))
                  }, null, 2));
        
        state.products.push(createdProduct);
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
        
        // Ensure updated product has proper unit_type values for materials
        const updatedProduct = {
          ...action.payload,
          materials: action.payload.materials.map(material => ({
            ...material,
            // Force unit_type to be present and correct
            unit_type: material.unit_type || 'piece'
          }))
        };
        
        // Log the product being updated with unit_types
        console.log('[REDUX] Updated product with forced unit_types:', 
                  JSON.stringify({
                    id: updatedProduct.id,
                    materials: updatedProduct.materials.map(m => ({
                      id: m.id,
                      materialName: m.materialName,
                      unit_type: m.unit_type
                    }))
                  }, null, 2));
        
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