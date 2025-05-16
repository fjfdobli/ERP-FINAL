import { supabase } from '../supabaseClient';

export interface ProductMaterial {
  id?: number;
  productId: number;
  materialId: number;
  materialName: string;
  quantityRequired: number;
  unit_type?: string;
  otherType?: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtendedProduct extends Product {
  materials: ProductMaterial[];
}

export interface CreateProduct {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}

export interface UpdateProduct {
  name?: string;
  price?: number;
  description?: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
}

// Table names
const PRODUCTS_TABLE = 'products';
const PRODUCT_MATERIALS_TABLE = 'product_materials';

/**
 * Service for managing product profiles in Supabase
 */
export const productProfileService = {
  /**
   * Upload a product image to Supabase storage
   */
  async uploadProductImage(file: File, productId: number): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}_${Date.now()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading product image:', error);
      throw new Error(error.message);
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  },

  /**
   * Upload multiple product images to Supabase storage
   */
  async uploadMultipleProductImages(files: File[], productId: number): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadProductImage(file, productId));
    return Promise.all(uploadPromises);
  },
  
  /**
   * Fetch all products with their materials
   */
  async getProducts(): Promise<ExtendedProduct[]> {
    // First, get all products
    const { data: products, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .order('name', { ascending: true });

    if (productError) {
      console.error('Error fetching products:', productError);
      throw new Error(productError.message);
    }
    
    console.log('[SERVICE] Raw products from database:', JSON.stringify(products.map(p => p.id), null, 2));

    if (!products || products.length === 0) {
      return [];
    }

    // Get all product materials
    const productIds = products.map(prod => prod.id);
    
    // If no product IDs, return empty array
    if (productIds.length === 0) {
      return [];
    }
    
    // Log what we're selecting to debug properly
    console.log('Fetching materials for product IDs:', productIds);
    
    const { data: materials, error: materialsError } = await supabase
      .from(PRODUCT_MATERIALS_TABLE)
      .select(`
        id,
        productId,
        materialId,
        quantityRequired,
        unit_type,
        other_type,
        inventory!inner(itemName)
      `)
      .in('productId', productIds);
      
    // Log a sample of the raw data returned
    if (materials && materials.length > 0) {
      console.log('Sample raw material data:', {
        first_material: materials[0],
        has_unit_type: 'unit_type' in materials[0],
        unit_type_value: materials[0].unit_type
      });
    }

    if (materialsError) {
      console.error('Error fetching product materials:', materialsError);
      throw new Error(materialsError.message);
    }
    
    // Debug: Log the raw materials data to see what's coming from the server
    console.log('[SERVICE] Raw materials from database:', 
                JSON.stringify(materials.slice(0, 3).map((m: any) => {
                  return {
                    id: m.id,
                    productId: m.productId,
                    materialId: m.materialId,
                    unit_type: m.unit_type,
                    other_type: m.other_type
                  };
                }), null, 2));

    // Map materials to their respective products
    const productsWithMaterials = products.map(product => {
      const productMaterials = (materials || [])
        .filter(material => material.productId === product.id)
        .map(material => {
          // First get the inventory item data
          const inventoryData = material.inventory as any;
          
          // Cast material to any to access properties that TypeScript doesn't know about
          const materialAny = material as any;
          
          // Get unit_type with fallback
          const unitType = materialAny.unit_type;
          
          return {
            id: material.id,
            productId: material.productId,
            materialId: material.materialId,
            materialName: inventoryData?.itemName || 'Unknown Material',
            quantityRequired: material.quantityRequired,
            unit_type: unitType || 'piece',
            otherType: materialAny.other_type || ''
          };
        });

      return {
        ...product,
        materials: productMaterials
      };
    });

    return productsWithMaterials;
  },

  /**
   * Fetch a specific product by ID with its materials
   */
  async getProductById(id: number): Promise<ExtendedProduct | null> {
    // Get the product
    const { data: product, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (productError) {
      console.error(`Error fetching product with ID ${id}:`, productError);
      throw new Error(productError.message);
    }

    if (!product) {
      return null;
    }

    // Get the product materials
    const { data: materials, error: materialsError } = await supabase
      .from(PRODUCT_MATERIALS_TABLE)
      .select(`
        id,
        productId,
        materialId,
        quantityRequired,
        unit_type,
        other_type,
        inventory!inner(itemName)
      `)
      .eq('productId', id);

    if (materialsError) {
      console.error(`Error fetching materials for product ID ${id}:`, materialsError);
      throw new Error(materialsError.message);
    }

    // Map materials with proper names
    const productMaterials = (materials || []).map(material => {
      // First get the inventory item data
      const inventoryData = material.inventory as any;
      
      const mappedMaterial = {
        id: material.id,
        productId: material.productId,
        materialId: material.materialId,
        materialName: inventoryData?.itemName || 'Unknown Material',
        quantityRequired: material.quantityRequired,
        unit_type: 'unit_type' in material ? material.unit_type : 'piece',
        otherType: 'other_type' in material ? material.other_type : ''
      };
      
      // Debug log
      console.log('Material data from DB:', material, '-> Mapped to:', mappedMaterial);
      
      return mappedMaterial;
    });

    return {
      ...product,
      materials: productMaterials
    };
  },

  /**
   * Search products by name or description
   */
  async searchProducts(query: string): Promise<ExtendedProduct[]> {
    const searchTerm = `%${query}%`;
    
    // Search for products
    const { data: products, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .order('name', { ascending: true });

    if (productError) {
      console.error('Error searching products:', productError);
      throw new Error(productError.message);
    }

    if (!products || products.length === 0) {
      return [];
    }

    // Get materials for the found products
    const productIds = products.map(prod => prod.id);
    
    // If no product IDs, return empty array
    if (productIds.length === 0) {
      return [];
    }
    
    const { data: materials, error: materialsError } = await supabase
      .from(PRODUCT_MATERIALS_TABLE)
      .select(`
        id,
        productId,
        materialId,
        quantityRequired,
        unit_type,
        other_type,
        inventory!inner(itemName)
      `)
      .in('productId', productIds);

    if (materialsError) {
      console.error('Error fetching materials for search results:', materialsError);
      throw new Error(materialsError.message);
    }

    // Map materials to their respective products
    const productsWithMaterials = products.map(product => {
      const productMaterials = (materials || [])
        .filter(material => material.productId === product.id)
        .map(material => {
          // First get the inventory item data
          const inventoryData = material.inventory as any;
          
          // Cast material to any to access properties that TypeScript doesn't know about
          const materialAny = material as any;
          
          // Get unit_type with fallback
          const unitType = materialAny.unit_type;
          
          return {
            id: material.id,
            productId: material.productId,
            materialId: material.materialId,
            materialName: inventoryData?.itemName || 'Unknown Material',
            quantityRequired: material.quantityRequired,
            unit_type: unitType || 'piece',
            otherType: materialAny.other_type || ''
          };
        });

      return {
        ...product,
        materials: productMaterials
      };
    });

    return productsWithMaterials;
  },

  /**
   * Create a new product with its materials
   */
  async createProduct(
    product: CreateProduct, 
    materials: Omit<ProductMaterial, 'id' | 'productId'>[]
  ): Promise<ExtendedProduct> {
    // Start a transaction
    const { data: newProduct, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .insert([product])
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      throw new Error(productError.message);
    }

    // Map materials with the new product ID
    const productMaterials = materials.map(material => {
      // Force unit_type to string, avoiding any nullable values
      const unitType = String(material.unit_type || 'piece');
      
      // Create a direct record with explicit unit_type
      const materialRecord = {
        productId: newProduct.id,
        materialId: material.materialId,
        quantityRequired: material.quantityRequired,
        unit_type: unitType, // Explicitly string
        other_type: unitType === 'other' ? material.otherType : null
      };
      
      console.log('Material being created in database:', {
        original: material,
        modified: materialRecord,
        unit_type_source: material.unit_type,
        unit_type_used: unitType
      });
      
      return materialRecord;
    });

    // Insert the materials if there are any
    if (productMaterials.length > 0) {
      const { data: newMaterials, error: materialsError } = await supabase
        .from(PRODUCT_MATERIALS_TABLE)
        .insert(productMaterials)
        .select(`
          id,
          productId,
          materialId,
          quantityRequired,
          unit_type,
          other_type,
          inventory!inner(itemName)
        `);

      if (materialsError) {
        console.error('Error adding product materials:', materialsError);
        // If materials insertion fails, try to delete the product
        await supabase.from(PRODUCTS_TABLE).delete().eq('id', newProduct.id);
        throw new Error(materialsError.message);
      }
      
      // Log what was returned from the database after insertion
      console.log('[DATABASE RESPONSE] Received from insert:', newMaterials);

      // Format the materials with proper names for return
      const formattedMaterials = (newMaterials || []).map(material => {
        // First get the inventory item data
        const inventoryData = material.inventory as any;
        
        // Explicitly log the incoming data for debugging
        console.log('Raw material data from DB:', material);
        
        // Cast material to any to access properties that TypeScript doesn't know about
        const materialAny = material as any;
        
        // Very important: Make a direct reference to unit_type with fallback
        const unitType = materialAny.unit_type;
        
        const mappedMaterial = {
          id: material.id,
          productId: material.productId,
          materialId: material.materialId,
          materialName: inventoryData?.itemName || 'Unknown Material',
          quantityRequired: material.quantityRequired,
          // Force the unit_type to be explicitly set - this is critical
          unit_type: unitType || 'piece',
          otherType: materialAny.other_type || ''
        };
        
        // Explicitly log whether unit_type exists
        console.log('[CRITICAL] Material unit_type debug:', {
          has_unit_type: !!unitType,
          unit_type_value: unitType,
          mapped_unit_type: mappedMaterial.unit_type
        });
        
        // Debug: Log an individual mapped material
        console.log('Mapped material object:', mappedMaterial);
        
        return mappedMaterial;
      });

      return {
        ...newProduct,
        materials: formattedMaterials
      };
    }

    return {
      ...newProduct,
      materials: []
    };
  },

  /**
   * Update an existing product and its materials
   */
  async updateProduct(
    id: number, 
    updates: UpdateProduct, 
    materials: ProductMaterial[]
  ): Promise<ExtendedProduct> {
    // Update the product
    const { data: updatedProduct, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      console.error(`Error updating product with ID ${id}:`, productError);
      throw new Error(productError.message);
    }

    // Delete all existing materials for this product
    const { error: deleteError } = await supabase
      .from(PRODUCT_MATERIALS_TABLE)
      .delete()
      .eq('productId', id);

    if (deleteError) {
      console.error(`Error deleting existing materials for product ID ${id}:`, deleteError);
      throw new Error(deleteError.message);
    }

    // Insert the new set of materials
    if (materials.length > 0) {
      // Prepare materials without 'id' and with the correct productId
      // Force the materials to use string values for unit_type
      const materialsToInsert = materials.map(material => {
        // Force unit_type to string, avoiding any nullable values
        const unitType = String(material.unit_type || 'piece');
        
        // Create a direct record with explicit unit_type
        const materialRecord = {
          productId: id,
          materialId: material.materialId,
          quantityRequired: material.quantityRequired,
          unit_type: unitType, // Explicitly string
          other_type: unitType === 'other' ? material.otherType : null
        };
        
        console.log('Material being sent to database:', {
          original: material,
          modified: materialRecord,
          unit_type_source: material.unit_type,
          unit_type_used: unitType
        });
        
        return materialRecord;
      });

      // Log exactly what's going to the database - critical for debugging
      console.log('[DATABASE INSERT] Sending to product_materials table:', 
                 JSON.stringify(materialsToInsert, null, 2));
      
      const { data: newMaterials, error: materialsError } = await supabase
        .from(PRODUCT_MATERIALS_TABLE)
        .insert(materialsToInsert)
        .select(`
          id,
          productId,
          materialId,
          quantityRequired,
          unit_type,
          other_type,
          inventory!inner(itemName)
        `);

      if (materialsError) {
        console.error(`Error adding updated materials for product ID ${id}:`, materialsError);
        throw new Error(materialsError.message);
      }
      
      // Log what was returned from the database after insertion
      console.log('[DATABASE RESPONSE] Received from insert:', newMaterials);

      // Format the materials with proper names for return
      const formattedMaterials = (newMaterials || []).map(material => {
        // First get the inventory item data
        const inventoryData = material.inventory as any;
        
        // Explicitly log the incoming data for debugging
        console.log('Raw material data from DB:', material);
        
        // Cast material to any to access properties that TypeScript doesn't know about
        const materialAny = material as any;
        
        // Very important: Make a direct reference to unit_type with fallback
        const unitType = materialAny.unit_type;
        
        const mappedMaterial = {
          id: material.id,
          productId: material.productId,
          materialId: material.materialId,
          materialName: inventoryData?.itemName || 'Unknown Material',
          quantityRequired: material.quantityRequired,
          // Force the unit_type to be explicitly set - this is critical
          unit_type: unitType || 'piece',
          otherType: materialAny.other_type || ''
        };
        
        // Explicitly log whether unit_type exists
        console.log('[CRITICAL] Material unit_type debug:', {
          has_unit_type: !!unitType,
          unit_type_value: unitType,
          mapped_unit_type: mappedMaterial.unit_type
        });
        
        // Debug: Log an individual mapped material
        console.log('Mapped material object:', mappedMaterial);
        
        return mappedMaterial;
      });

      return {
        ...updatedProduct,
        materials: formattedMaterials
      };
    }

    return {
      ...updatedProduct,
      materials: []
    };
  },

  /**
   * Delete a product and all its associated materials
   */
  async deleteProduct(id: number): Promise<void> {
    // Delete the materials first (handled by foreign key constraints in some DBs)
    const { error: materialsError } = await supabase
      .from(PRODUCT_MATERIALS_TABLE)
      .delete()
      .eq('productId', id);

    if (materialsError) {
      console.error(`Error deleting materials for product ID ${id}:`, materialsError);
      throw new Error(materialsError.message);
    }

    // Now delete the product
    const { error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .delete()
      .eq('id', id);

    if (productError) {
      console.error(`Error deleting product with ID ${id}:`, productError);
      throw new Error(productError.message);
    }
  }
};