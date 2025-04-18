import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, 
  TextField, InputAdornment, Chip, Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Snackbar, Alert, Grid, SelectChangeEvent } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';

interface RawMaterial {
  id: number;
  itemName: string;
  itemType: string;
  quantity: number;
}

// Interface for products
interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  materials: ProductMaterial[];
}

// Interface for materials used in a product
interface ProductMaterial {
  materialId: number;
  materialName: string;
  quantityRequired: number;
}

const ProductProfile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // State for product list
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  
  // State for inventory items (raw materials)
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  
  // State for snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  // For demonstration purposes - would typically come from Redux
  useEffect(() => {
    // Placeholder for fetching products and raw materials
    setIsLoading(true);
    // This would be a Redux action in the real implementation
    // Example: dispatch(fetchProducts());
    // Example: dispatch(fetchRawMaterials());
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Sample data for raw materials
      const sampleRawMaterials: RawMaterial[] = [
        { id: 1, itemName: 'Paper - Bond', itemType: 'paper', quantity: 5000 },
        { id: 2, itemName: 'Ink - Black', itemType: 'ink', quantity: 200 },
        { id: 3, itemName: 'Ink - Colored', itemType: 'ink', quantity: 150 },
        { id: 4, itemName: 'Binding Material', itemType: 'binding', quantity: 300 },
        { id: 5, itemName: 'Printing Plates', itemType: 'plate', quantity: 50 },
      ];
      
      // Sample data for products
      const sampleProducts: Product[] = [
        { 
          id: 1, 
          name: 'Business Cards', 
          price: 800, 
          description: 'Standard business cards, double-sided print',
          materials: [
            { materialId: 1, materialName: 'Paper - Bond', quantityRequired: 1 },
            { materialId: 2, materialName: 'Ink - Black', quantityRequired: 0.5 },
          ]
        },
        { 
          id: 2, 
          name: 'Brochures', 
          price: 1500, 
          description: 'Tri-fold colored brochures',
          materials: [
            { materialId: 1, materialName: 'Paper - Bond', quantityRequired: 3 },
            { materialId: 3, materialName: 'Ink - Colored', quantityRequired: 2 },
            { materialId: 4, materialName: 'Binding Material', quantityRequired: 1 },
          ]
        },
      ];
      
      setRawMaterials(sampleRawMaterials);
      setProducts(sampleProducts);
      setFilteredProducts(sampleProducts);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleOpenCreateDialog = () => {
    setCurrentProduct({
      id: 0, // Will be assigned by backend
      name: '',
      price: 0,
      description: '',
      materials: []
    });
    setIsEdit(false);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (product: Product) => {
    setCurrentProduct({ ...product });
    setIsEdit(true);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentProduct(null);
  };
  
  const handleOpenViewDialog = (product: Product) => {
    setCurrentProduct({ ...product });
    setViewDialogOpen(true);
  };
  
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setCurrentProduct(null);
  };
  
  const handleOpenDeleteDialog = (product: Product) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCurrentProduct(null);
  };
  
  const handleDeleteProduct = () => {
    if (!currentProduct) return;
    
    // This would be a Redux action in the real implementation
    // Example: dispatch(deleteProduct(currentProduct.id));
    
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      const updatedProducts = products.filter(p => p.id !== currentProduct.id);
      setProducts(updatedProducts);
      setSnackbarMessage('Product deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setIsLoading(false);
      handleCloseDeleteDialog();
    }, 1000);
  };

  const handleAddMaterial = () => {
    if (!currentProduct) return;
    
    const updatedProduct = { 
      ...currentProduct,
      materials: [
        ...currentProduct.materials,
        { materialId: 0, materialName: '', quantityRequired: 1 }
      ]
    };
    
    setCurrentProduct(updatedProduct);
  };

  const handleRemoveMaterial = (index: number) => {
    if (!currentProduct) return;
    
    const updatedMaterials = [...currentProduct.materials];
    updatedMaterials.splice(index, 1);
    
    setCurrentProduct({
      ...currentProduct,
      materials: updatedMaterials
    });
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    if (!currentProduct) return;
    
    const updatedMaterials = [...currentProduct.materials];
    
    if (field === 'materialId') {
      const selectedMaterial = rawMaterials.find(m => m.id === value);
      if (selectedMaterial) {
        updatedMaterials[index] = {
          ...updatedMaterials[index],
          materialId: value,
          materialName: selectedMaterial.itemName
        };
      }
    } else if (field === 'quantityRequired') {
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        quantityRequired: value
      };
    }
    
    setCurrentProduct({
      ...currentProduct,
      materials: updatedMaterials
    });
  };

  const handleProductChange = (field: string, value: any) => {
    if (!currentProduct) return;
    
    setCurrentProduct({
      ...currentProduct,
      [field]: value
    });
  };

  const handleSaveProduct = () => {
    if (!currentProduct) return;
    
    // Validate form
    if (!currentProduct.name || currentProduct.price <= 0 || currentProduct.materials.length === 0) {
      setSnackbarMessage('Please fill in all required fields and add at least one material');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Check if all materials are properly selected
    const invalidMaterials = currentProduct.materials.some(m => m.materialId === 0);
    if (invalidMaterials) {
      setSnackbarMessage('Please select valid materials for the product');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // This would be a Redux action in the real implementation
    // Example: dispatch(isEdit ? updateProduct(currentProduct) : createProduct(currentProduct));
    
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      if (isEdit) {
        // Update existing product
        const updatedProducts = products.map(p => 
          p.id === currentProduct.id ? currentProduct : p
        );
        setProducts(updatedProducts);
        setSnackbarMessage('Product updated successfully');
      } else {
        // Create new product with a fake ID (backend would assign real ID)
        const newProduct = {
          ...currentProduct,
          id: Math.max(0, ...products.map(p => p.id)) + 1
        };
        setProducts([...products, newProduct]);
        setSnackbarMessage('Product created successfully');
      }
      
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setIsLoading(false);
      handleCloseDialog();
    }, 1000);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // ProductForm component for creating/editing products
  const ProductForm = () => {
    if (!currentProduct) return null;
    
    return (
      <Box>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Product Name"
              fullWidth
              required
              value={currentProduct.name}
              onChange={(e) => handleProductChange('name', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Price"
              type="number"
              fullWidth
              required
              value={currentProduct.price}
              onChange={(e) => handleProductChange('price', Number(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                inputProps: { min: 0 }
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={currentProduct.description || ''}
              onChange={(e) => handleProductChange('description', e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
              Raw Materials Required
            </Typography>
            
            {currentProduct.materials.length === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                No materials added. Click "Add Material" to add raw materials required for this product.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Material</strong></TableCell>
                      <TableCell><strong>Quantity Required</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentProduct.materials.map((material, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <InputLabel>Material</InputLabel>
                            <Select
                              value={material.materialId || ''}
                              label="Material"
                              onChange={(e) => handleMaterialChange(index, 'materialId', Number(e.target.value))}
                            >
                              {rawMaterials.map((rawMaterial) => (
                                <MenuItem key={rawMaterial.id} value={rawMaterial.id}>
                                  {rawMaterial.itemName} ({rawMaterial.quantity} in stock)
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={material.quantityRequired}
                            onChange={(e) => handleMaterialChange(index, 'quantityRequired', Number(e.target.value))}
                            InputProps={{
                              inputProps: { min: 0.1, step: 0.1 }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            startIcon={<DeleteIcon />}
                            color="error"
                            onClick={() => handleRemoveMaterial(index)}
                            size="small"
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddMaterial}
            >
              Add Material
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Product Profiles
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Create Product
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          placeholder="Search products..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearch}
          sx={{ width: 300, mr: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isLoading && products.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Table>
            <TableHead sx={{ backgroundColor: 'background.paper' }}>
              <TableRow>
                <TableCell><strong>Product Name</strong></TableCell>
                <TableCell><strong>Price</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>Materials</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>₱{product.price.toLocaleString()}</TableCell>
                    <TableCell>{product.description || '-'}</TableCell>
                    <TableCell>
                      {product.materials.length} materials
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="outlined" 
                          size="small"
                          color="info"
                          onClick={() => handleOpenViewDialog(product)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditDialog(product)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteDialog(product)}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEdit ? 'Edit Product' : 'Create New Product'}
        </DialogTitle>
        <DialogContent>
          <ProductForm />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveProduct} 
            variant="contained" 
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : (isEdit ? 'Save Changes' : 'Create Product')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Product Details
        </DialogTitle>
        <DialogContent>
          {currentProduct && (
            <Box sx={{ py: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Product Name</Typography>
                  <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>{currentProduct.name}</Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Price</Typography>
                  <Typography variant="body1" sx={{ mt: 1, fontWeight: 500 }}>₱{currentProduct.price.toLocaleString()}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>{currentProduct.description || 'No description provided'}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>Required Materials</Typography>
                  
                  {currentProduct.materials.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No materials defined for this product</Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Material</strong></TableCell>
                            <TableCell><strong>Quantity Required</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {currentProduct.materials.map((material, index) => (
                            <TableRow key={index}>
                              <TableCell>{material.materialName}</TableCell>
                              <TableCell>{material.quantityRequired}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Delete Product
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete the product <strong>{currentProduct?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. This will permanently delete the product and remove it from all systems.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteProduct} 
            variant="contained" 
            color="error"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductProfile;