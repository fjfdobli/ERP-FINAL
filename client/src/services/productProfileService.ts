import { supabase } from '../supabaseClient';

export interface ProductMaterial {
  id?: number;
  productId: number;
  materialId: number;
  materialName: string;
  quantityRequired: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
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
}

export interface UpdateProduct {
  name?: string;
  price?: number;
  description?: string;
}

// Table names
const PRODUCTS_TABLE = 'products';
const PRODUCT_MATERIALS_TABLE = 'product_materials';

/**
 * Service for managing product profiles in Supabase
 */
export const productProfileService = {
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

    if (!products || products.length === 0) {
      return [];
    }

    // Get all product materials
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
        inventory!inner(itemName)
      `)
      .in('productId', productIds);

    if (materialsError) {
      console.error('Error fetching product materials:', materialsError);
      throw new Error(materialsError.message);
    }

    // Map materials to their respective products
    const productsWithMaterials = products.map(product => {
      const productMaterials = (materials || [])
        .filter(material => material.productId === product.id)
        .map(material => {
          // First get the inventory item data
          const inventoryData = material.inventory as any;
          
          return {
            id: material.id,
            productId: material.productId,
            materialId: material.materialId,
            materialName: inventoryData?.itemName || 'Unknown Material',
            quantityRequired: material.quantityRequired
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
      
      return {
        id: material.id,
        productId: material.productId,
        materialId: material.materialId,
        materialName: inventoryData?.itemName || 'Unknown Material',
        quantityRequired: material.quantityRequired
      };
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
          
          return {
            id: material.id,
            productId: material.productId,
            materialId: material.materialId,
            materialName: inventoryData?.itemName || 'Unknown Material',
            quantityRequired: material.quantityRequired
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
    const productMaterials = materials.map(material => ({
      productId: newProduct.id,
      materialId: material.materialId,
      quantityRequired: material.quantityRequired
    }));

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
          inventory!inner(itemName)
        `);

      if (materialsError) {
        console.error('Error adding product materials:', materialsError);
        // If materials insertion fails, try to delete the product
        await supabase.from(PRODUCTS_TABLE).delete().eq('id', newProduct.id);
        throw new Error(materialsError.message);
      }

      // Format the materials with proper names for return
      const formattedMaterials = (newMaterials || []).map(material => {
        // First get the inventory item data
        const inventoryData = material.inventory as any;
        
        return {
          id: material.id,
          productId: material.productId,
          materialId: material.materialId,
          materialName: inventoryData?.itemName || 'Unknown Material',
          quantityRequired: material.quantityRequired
        };
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
      const materialsToInsert = materials.map(material => ({
        productId: id,
        materialId: material.materialId,
        quantityRequired: material.quantityRequired
      }));

      const { data: newMaterials, error: materialsError } = await supabase
        .from(PRODUCT_MATERIALS_TABLE)
        .insert(materialsToInsert)
        .select(`
          id,
          productId,
          materialId,
          quantityRequired,
          inventory!inner(itemName)
        `);

      if (materialsError) {
        console.error(`Error adding updated materials for product ID ${id}:`, materialsError);
        throw new Error(materialsError.message);
      }

      // Format the materials with proper names for return
      const formattedMaterials = (newMaterials || []).map(material => {
        // First get the inventory item data
        const inventoryData = material.inventory as any;
        
        return {
          id: material.id,
          productId: material.productId,
          materialId: material.materialId,
          materialName: inventoryData?.itemName || 'Unknown Material',
          quantityRequired: material.quantityRequired
        };
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