import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  InputAdornment, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Delete as DeleteIcon, 
  Visibility as ViewIcon,
  Edit as EditIcon,
  InventoryOutlined as InventoryIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { 
  fetchProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  selectAllProducts,
  selectProductLoading,
  selectProductError
} from '../../redux/slices/productProfileSlice';
import { 
  ProductMaterial, 
  ExtendedProduct 
} from '../../services/productProfileService';
import { 
  fetchInventory,
  selectAllInventoryItems
} from '../../redux/slices/inventorySlice';
import { InventoryItem } from '../../services/inventoryService';

const ProductProfile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state
  const products = useSelector(selectAllProducts);
  const rawMaterials = useSelector(selectAllInventoryItems);
  const isLoading = useSelector(selectProductLoading);
  const error = useSelector(selectProductError);
  
  // Local state for UI
  const [filteredProducts, setFilteredProducts] = useState<ExtendedProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ExtendedProduct | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  
  // State for snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Fetch products and raw materials on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await dispatch(fetchInventory()).unwrap();
        await dispatch(fetchProducts()).unwrap();
      } catch (error) {
        console.error('Error loading data:', error);
        setSnackbarMessage('Failed to load data. Please refresh the page.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };
    
    loadData();
  }, [dispatch]);

  // Update filtered products when products or search term changes
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
      id: 0,
      name: '',
      price: 0,
      description: '',
      materials: []
    });
    setIsEdit(false);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (product: ExtendedProduct) => {
    setCurrentProduct({ ...product });
    setIsEdit(true);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentProduct(null);
  };
  
  const handleOpenViewDialog = (product: ExtendedProduct) => {
    setCurrentProduct({ ...product });
    setViewDialogOpen(true);
  };
  
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setCurrentProduct(null);
  };
  
  const handleOpenDeleteDialog = (product: ExtendedProduct) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCurrentProduct(null);
  };
  
  const handleDeleteProduct = async () => {
    if (!currentProduct) return;
    
    try {
      await dispatch(deleteProduct(currentProduct.id)).unwrap();
      setSnackbarMessage('Product deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Failed to delete product:', error);
      setSnackbarMessage('Failed to delete product');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleAddMaterial = () => {
    if (!currentProduct) return;
    
    const updatedProduct = { 
      ...currentProduct,
      materials: [
        ...currentProduct.materials,
        { 
          productId: currentProduct.id,
          materialId: 0,
          materialName: '',
          quantityRequired: 1
        }
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

  const handleSaveProduct = async () => {
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
    
    try {
      if (isEdit) {
        // Update existing product
        await dispatch(updateProduct({
          id: currentProduct.id,
          updates: {
            name: currentProduct.name,
            price: currentProduct.price,
            description: currentProduct.description
          },
          materials: currentProduct.materials
        })).unwrap();
        
        setSnackbarMessage('Product updated successfully');
      } else {
        // Create new product
        await dispatch(createProduct({
          product: {
            name: currentProduct.name,
            price: currentProduct.price,
            description: currentProduct.description
          },
          materials: currentProduct.materials.map(m => ({
            materialId: m.materialId,
            materialName: m.materialName,
            quantityRequired: m.quantityRequired
          }))
        })).unwrap();
        
        setSnackbarMessage('Product created successfully');
      }
      
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save product:', error);
      setSnackbarMessage('Failed to save product');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // ProductCard component
  const ProductCard = ({ product }: { product: ExtendedProduct }) => {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {product.name}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              ₱{product.price.toLocaleString()}
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                display: '-webkit-box', 
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minHeight: '40px',
              }}
            >
              {product.description || 'No description provided'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <InventoryIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="body2" color="text.secondary">
              {product.materials.length} material{product.materials.length !== 1 ? 's' : ''} required
            </Typography>
          </Box>
        </CardContent>
        
        <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
          <Button 
            size="small" 
            color="info"
            onClick={() => handleOpenViewDialog(product)}
          >
            View
          </Button>
          
          <Button 
            size="small" 
            color="primary"
            onClick={() => handleOpenEditDialog(product)}
          >
            Edit
          </Button>
          
          <Button 
            size="small" 
            color="error"
            onClick={() => handleOpenDeleteDialog(product)}
          >
            Delete
          </Button>
        </CardActions>
      </Card>
    );
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
                              onChange={(e) => 
                                handleMaterialChange(index, 'materialId', Number(e.target.value))
                              }
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    maxHeight: 300
                                  }
                                }
                              }}
                            >
                              {rawMaterials && rawMaterials.length > 0 ? (
                                rawMaterials
                                  // Only allow raw materials to be selected
                                  .filter(item => item.itemType !== 'product')
                                  .map((rawMaterial) => (
                                    <MenuItem key={rawMaterial.id} value={rawMaterial.id}>
                                      {rawMaterial.itemName} ({rawMaterial.quantity} in stock)
                                    </MenuItem>
                                  ))
                              ) : (
                                <MenuItem disabled>No materials available</MenuItem>
                              )}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={material.quantityRequired}
                            onChange={(e) => handleMaterialChange(
                              index, 
                              'quantityRequired', 
                              Number(e.target.value)
                            )}
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
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4, flexDirection: 'column', alignItems: 'center' }}>
          <Typography color="error" gutterBottom>Failed to load products</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              dispatch(fetchProducts());
              dispatch(fetchInventory());
            }}
          >
            Retry
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredProducts.length === 0 ? (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No products found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {searchTerm ? 'Try adjusting your search term' : 'Click "Create Product" to add your first product'}
                </Typography>
              </Box>
            </Grid>
          ) : (
            filteredProducts.map((product) => (
              <Grid item xs={12} sm={6} md={4} key={product.id}>
                <ProductCard product={product} />
              </Grid>
            ))
          )}
        </Grid>
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