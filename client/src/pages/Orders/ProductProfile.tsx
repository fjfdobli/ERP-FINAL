import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Snackbar, Alert, Grid, Card, CardContent, CardActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Delete as DeleteIcon, Edit as EditIcon,
  Visibility as ViewIcon, PhotoCamera as PhotoCameraIcon, CloudUpload as CloudUploadIcon,
  InventoryOutlined as InventoryIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
  uploadMultipleProductImages,
  selectAllProducts, selectProductLoading, selectProductError
} from '../../redux/slices/productProfileSlice';
import { fetchInventory, selectAllInventoryItems } from '../../redux/slices/inventorySlice';
import { ExtendedProduct } from '../../services/productProfileService';
import { InventoryItem } from '../../services/inventoryService';

// Unit type options for materials
const unitTypes = [
  { id: 'piece', name: 'Per Piece' },
  { id: 'rim', name: 'Per Rim' },
  { id: 'box', name: 'Per Box' },
  { id: 'set', name: 'Per Set' },
  { id: 'roll', name: 'Per Roll' },
  { id: 'pack', name: 'Per Pack' },
  { id: 'sheet', name: 'Per Sheet' },
  { id: 'unit', name: 'Per Unit' },
  { id: 'other', name: 'Other' }
];

const ProductCard = React.memo(({ product, onView, onEdit, onDelete }: {
  product: ExtendedProduct;
  onView: (product: ExtendedProduct) => void;
  onEdit: (product: ExtendedProduct) => void;
  onDelete: (product: ExtendedProduct) => void;
}) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 } }}>
    <Box sx={{ position: 'relative', paddingTop: '60%', bgcolor: 'grey.100' }}>
      {product.imageUrl ? (
        <Box
          component="img"
          src={product.imageUrl}
          alt={product.name}
          sx={{ position: 'absolute', top: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Box sx={{ position: 'absolute', top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PhotoCameraIcon color="disabled" sx={{ fontSize: 40 }} />
        </Box>
      )}
    </Box>
    <CardContent sx={{ flexGrow: 1 }}>
      <Typography variant="h6" fontWeight="bold">{product.name}</Typography>
      <Typography variant="subtitle1" color="primary">₱{product.price.toLocaleString()}</Typography>
      <Typography variant="body2" color="text.secondary" noWrap>
        {product.description || 'No description provided'}
      </Typography>
    </CardContent>
    <CardActions sx={{ justifyContent: 'flex-end', gap: 1, pr: 2 }}>
      <Button size="small" onClick={() => onView(product)}>View</Button>
      <Button size="small" onClick={() => onEdit(product)}>Edit</Button>
      <Button size="small" color="error" onClick={() => onDelete(product)}>Delete</Button>
    </CardActions>
  </Card>
));

// Helper function to get unit type display name
const getUnitTypeDisplay = (unitType: string | undefined | null, otherType?: string): string => {
  if (!unitType) return 'Not Specified';
  
  if (unitType === 'other') {
    return otherType || 'Custom';
  }
  
  const matchingType = unitTypes.find(t => t.id === unitType);
  return matchingType ? matchingType.name : unitType;
};

const ProductProfile: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const products = useSelector(selectAllProducts);
  const rawMaterials = useSelector(selectAllInventoryItems);
  const isLoading = useSelector(selectProductLoading);
  const error = useSelector(selectProductError);

  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ExtendedProduct | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    // Fetch inventory and products when component mounts
    dispatch(fetchInventory());
    dispatch(fetchProducts());
    
    // Also set up a refresh of products after successful save operations
    const refreshProducts = () => {
      console.log('Refreshing products from database...');
      dispatch(fetchProducts());
    };
    
    // Refresh products every 30 seconds while component is mounted
    const refreshInterval = setInterval(refreshProducts, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [dispatch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);


  const handleOpenCreateDialog = () => {
    setCurrentProduct({
      id: 0,
      name: '',
      price: 0,
      description: '',
      imageUrl: null,
      imageUrls: [],
      materials: []
    });
    setIsEdit(false);
    setImageFiles([]);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (product: ExtendedProduct) => {
    console.log('Opening edit dialog with product data:', JSON.stringify(product, null, 2));
    
    // Force unit_type to be seen in the edit dialog by ensuring each material has the correct unit_type
    const enhancedProduct = {
      ...product,
      materials: product.materials.map(mat => {
        // Log each material as it's processed
        console.log('Edit processing material:', mat);
        
        // Try to get the unit type from Supabase or use what's already there
        const unitTypeFromDB = mat.unit_type;
        
        // If it's from our dropdown, ensure we preserve it
        return {
          ...mat,
          // Force unit_type to be a specific value for display
          unit_type: unitTypeFromDB || 'piece'
        };
      })
    };
    
    // Store the enhanced product for editing
    setCurrentProduct(enhancedProduct);
    setIsEdit(true);
    setImageFiles([]);
    setDialogOpen(true);
  };

  const handleOpenViewDialog = (product: ExtendedProduct) => {
    console.log('Opening view dialog with product:', JSON.stringify({
      productId: product.id,
      materialsCount: product.materials.length,
      firstMaterial: product.materials[0] ? {
        id: product.materials[0].id,
        unitType: product.materials[0].unit_type,
        typeOfUnitType: typeof product.materials[0].unit_type
      } : 'no materials'
    }));
    
    // Create a deep copy with unit_type values explicitly preserved
    const enhancedProduct = {
      ...product,
      materials: product.materials.map(mat => {
        // Enhanced debugging of unit_type
        console.log('Material unit_type in ViewDialog:', {
          id: mat.id, 
          rawUnitType: mat.unit_type,
          typeOfUnitType: typeof mat.unit_type
        });
        
        // Ensure unit_type is always defined properly
        return {
          ...mat,
          // Use the original unit_type from the database but provide fallback if needed
          unit_type: mat.unit_type || 'piece',
          // Ensure otherType is defined properly
          otherType: mat.otherType || ''
        };
      })
    };
    
    setCurrentProduct(enhancedProduct);
    setViewDialogOpen(true);
  };

  const handleOpenDeleteDialog = (product: ExtendedProduct) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentProduct(null);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setCurrentProduct(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCurrentProduct(null);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleRemoveImage = (index: number) => {
    if (!currentProduct) return;
    const updatedUrls = [...(currentProduct.imageUrls || [])];
    updatedUrls.splice(index, 1);
    setCurrentProduct({
      ...currentProduct,
      imageUrls: updatedUrls,
      imageUrl: updatedUrls[0] || null,
    });
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...newFiles]);

    const newImageUrls = newFiles.map(file => URL.createObjectURL(file));
    setCurrentProduct(prev => {
      if (!prev) return null;
      const updatedUrls = [...(prev.imageUrls || []), ...newImageUrls];
      return {
        ...prev,
        imageUrl: updatedUrls[0],
        imageUrls: updatedUrls,
      };
    });
  };

  const handleAddMaterial = () => {
    if (!currentProduct) return;
    setCurrentProduct(prev => ({
      ...prev!,
      materials: [...prev!.materials, {
        productId: prev!.id,
        materialId: 0,
        materialName: '',
        quantityRequired: 1,
        unit_type: 'piece',
        otherType: '',
      }]
    }));
  };

  const handleRemoveMaterial = (index: number) => {
    if (!currentProduct) return;
    const updated = [...currentProduct.materials];
    updated.splice(index, 1);
    setCurrentProduct({ ...currentProduct, materials: updated });
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    if (!currentProduct) return;

    const updatedMaterials = currentProduct.materials.map((material, idx) => {
      if (idx !== index) return material;

      if (field === 'materialId') {
        const selected = rawMaterials.find(m => m.id === value);
        if (selected) {
          return {
            ...material,
            materialId: value,
            materialName: selected.itemName,
          };
        }
      } else if (field === 'quantityRequired') {
        // Find current selected material
        const selectedMaterial = rawMaterials.find(m => m.id === material.materialId);
        const maxStock = selectedMaterial?.quantity ?? Infinity;

        // Prevent exceeding stock
        const adjustedQuantity = Math.min(Number(value), maxStock);

        return {
          ...material,
          quantityRequired: adjustedQuantity,
        };
      } else if (field === 'unit_type') {
        // Force unit_type to be explicitly set in the object
        // This is a critical fix to ensure unit_type is saved correctly
        return {
          ...material,
          unit_type: value,
          // Reset otherType if not 'other'
          otherType: value === 'other' ? material.otherType : '',
        };
      } else if (field === 'otherType') {
        return {
          ...material,
          otherType: value,
        };
      }

      return material;
    });

    setCurrentProduct({
      ...currentProduct,
      materials: updatedMaterials,
    });
  };



  const handleSaveProduct = async () => {
    if (!currentProduct) return;
    if (!currentProduct.name || currentProduct.price <= 0 || currentProduct.materials.length === 0) {
      setSnackbarMessage('Please fill required fields and add at least one material');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Log the current state before saving
    console.log('About to save product with materials:', JSON.stringify(currentProduct.materials, null, 2));
    
    // Force unit_type to be set correctly for all materials before saving
    const materialsWithForcedUnitType = currentProduct.materials.map(material => {
      return {
        ...material,
        unit_type: material.unit_type || 'piece', // Ensure unit_type is not undefined
      };
    });
    
    // Update current product with the ensured unit types
    const updatedProduct = {
      ...currentProduct,
      materials: materialsWithForcedUnitType
    };
    
    // Set the updated product in state 
    setCurrentProduct(updatedProduct);
    
    try {
      if (isEdit) {
        let finalImageUrls = (currentProduct.imageUrls || []).filter(url => !url.startsWith('blob:'));
        if (imageFiles.length > 0) {
          const newUploaded = await dispatch(uploadMultipleProductImages({ files: imageFiles, productId: currentProduct.id })).unwrap();
          finalImageUrls = [...finalImageUrls, ...newUploaded];
        }
        // Log the materials being sent for update
        console.log('Materials being sent for update:', currentProduct.materials);
        
        await dispatch(updateProduct({
          id: currentProduct.id,
          updates: {
            name: currentProduct.name,
            price: currentProduct.price,
            description: currentProduct.description,
            imageUrl: finalImageUrls[0] || null,
            imageUrls: finalImageUrls
          },
          // Explicitly ensure unit_type is passed for each material
          materials: currentProduct.materials.map(mat => ({
            ...mat,
            unit_type: mat.unit_type || 'piece' // Ensure unit_type is set
          }))
        })).unwrap();
        setSnackbarMessage('Product updated successfully');
      } else {
        const created = await dispatch(createProduct({
          product: {
            name: currentProduct.name,
            price: currentProduct.price,
            description: currentProduct.description,
            imageUrl: null,
            imageUrls: []
          },
          materials: currentProduct.materials.map(m => ({
            materialId: m.materialId,
            materialName: m.materialName,
            quantityRequired: m.quantityRequired,
            unit_type: m.unit_type || 'piece',
            otherType: m.unit_type === 'other' ? m.otherType : ''
          }))
        })).unwrap();
        if (imageFiles.length > 0 && created.id) {
          const newUploaded = await dispatch(uploadMultipleProductImages({ files: imageFiles, productId: created.id })).unwrap();
          await dispatch(updateProduct({
            id: created.id,
            updates: {
              imageUrl: newUploaded[0] || null,
              imageUrls: newUploaded
            },
            materials: created.materials
          })).unwrap();
        }
        setSnackbarMessage('Product created successfully');
      }
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseDialog();
    } catch (err) {
      console.error('Save error:', err);
      setSnackbarMessage('Failed to save product');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleDeleteProduct = async () => {
    if (!currentProduct) return;
    try {
      await dispatch(deleteProduct(currentProduct.id)).unwrap();
      setSnackbarMessage('Product deleted successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Delete error:', err);
      setSnackbarMessage('Failed to delete product');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Product Profiles</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
          Create Product
        </Button>
      </Box>

      <TextField
        placeholder="Search products..."
        variant="outlined"
        size="small"
        fullWidth
        value={searchTerm}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load products</Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredProducts.length === 0 ? (
            <Grid item xs={12}>
              <Typography textAlign="center" color="textSecondary">
                No products found
              </Typography>
            </Grid>
          ) : (
            filteredProducts.map(product => (
              <Grid item xs={12} sm={6} md={4} key={product.id}>
                <ProductCard
                  product={product}
                  onView={handleOpenViewDialog}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleOpenDeleteDialog}
                />
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? 'Edit Product' : 'Create New Product'}</DialogTitle>
        <DialogContent>
          {currentProduct && (
            <Box sx={{ py: 2 }}>
              <Grid container spacing={2}>
                {/* Upload Images */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Product Images</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {(currentProduct.imageUrls || []).map((url, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <Box
                          component="img"
                          src={url}
                          alt="Product"
                          sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 1 }}
                        />
                        <IconButton
                          size="small"
                          sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper' }}
                          onClick={() => handleRemoveImage(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    <Box
                      component="label"
                      sx={{
                        width: 100,
                        height: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed grey',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                    >
                      <AddIcon />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        ref={fileInputRef}
                        onChange={handleImageChange}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Product Fields */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Product Name"
                    fullWidth
                    required
                    value={currentProduct.name}
                    onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Price"
                    type="number"
                    fullWidth
                    required
                    value={currentProduct.price}
                    onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                    InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    minRows={2}
                    value={currentProduct.description || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  />
                </Grid>

                {/* Materials */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Required Materials</Typography>
                  {currentProduct.materials.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No materials added. Click \"Add Material\" below.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Material</TableCell>
                            <TableCell>Quantity Required</TableCell>
                            <TableCell>Unit Type</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {currentProduct.materials.map((mat, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Material</InputLabel>
                                  <Select
                                    label="Material"
                                    value={mat.materialId || ''}
                                    onChange={e => handleMaterialChange(idx, 'materialId', Number(e.target.value))}
                                  >
                                    {rawMaterials
                                      .filter(item => {
                                        const selectedIds = currentProduct.materials
                                          .filter((_, i) => i !== idx) // exclude current editing row
                                          .map(mat => mat.materialId);
                                        return !selectedIds.includes(item.id) || item.id === mat.materialId;
                                      })
                                      .map(item => (
                                        <MenuItem key={item.id} value={item.id}>
                                          {item.itemName} ({item.quantity} in stock)
                                        </MenuItem>
                                      ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={mat.quantityRequired}
                                  onChange={e => handleMaterialChange(idx, 'quantityRequired', Number(e.target.value))}
                                  inputProps={{ min: 0.1, step: 0.1 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <FormControl fullWidth size="small">
                                    <InputLabel>Unit Type</InputLabel>
                                    <Select
                                      label="Unit Type"
                                      // Force the value to be the string value
                                      value={mat.unit_type || 'piece'}
                                      onChange={e => {
                                        // Force the value to be a string
                                        const newValue = String(e.target.value);
                                        console.log(`CHANGING UNIT TYPE: ${mat.unit_type} -> ${newValue}`, {
                                          materialBefore: JSON.stringify(mat)
                                        });
                                        
                                        // Update the UI immediately for a better user experience
                                        const updatedMaterial = {
                                          ...mat,
                                          unit_type: newValue
                                        };
                                        
                                        // Directly update the current product
                                        const materials = [...currentProduct!.materials];
                                        materials[idx] = updatedMaterial;
                                        
                                        // Update the state with the new unit type immediately
                                        setCurrentProduct(prev => ({
                                          ...prev!,
                                          materials
                                        }));
                                        
                                        // Then call the regular handler
                                        handleMaterialChange(idx, 'unit_type', newValue);
                                      }}
                                    >
                                      {unitTypes.map(type => (
                                        <MenuItem key={type.id} value={type.id}>
                                          {type.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                  
                                  {mat.unit_type === 'other' && (
                                    <TextField
                                      size="small"
                                      placeholder="Specify unit type"
                                      value={mat.otherType || ''}
                                      onChange={e => handleMaterialChange(idx, 'otherType', e.target.value)}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Button size="small" color="error" onClick={() => handleRemoveMaterial(idx)}>
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveProduct} variant="contained" disabled={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {currentProduct && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6">{currentProduct.name}</Typography>
              <Typography variant="subtitle1" color="primary" gutterBottom>₱{currentProduct.price.toLocaleString()}</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>{currentProduct.description || 'No description provided.'}</Typography>

              <Grid container spacing={2}>
                {(currentProduct.imageUrls || []).map((url, idx) => (
                  <Grid item xs={4} sm={3} md={2} key={idx}>
                    <Box
                      component="img"
                      src={url}
                      alt="Preview"
                      sx={{ width: '100%', height: 'auto', borderRadius: 1 }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Required Materials</Typography>
              {currentProduct.materials.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Material</strong></TableCell>
                        <TableCell><strong>Quantity</strong></TableCell>
                        <TableCell><strong>Unit Type</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentProduct.materials.map((mat, idx) => {
                        // Log the material data for debugging
                        console.log(`View dialog material ${idx}:`, {
                          id: mat.id,
                          materialName: mat.materialName,
                          unit_type: mat.unit_type,
                          otherType: mat.otherType
                        });
                        
                        // Use our helper function to get the display name
                        const displayName = getUnitTypeDisplay(mat.unit_type, mat.otherType);
                        
                        // Log the final result for debugging
                        console.log(`Unit type for ${mat.materialName}:`, displayName);
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell>{mat.materialName}</TableCell>
                            <TableCell>{mat.quantityRequired}</TableCell>
                            <TableCell>{displayName}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">No materials added</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{currentProduct?.name}</strong>?</Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteProduct} color="error" variant="contained" disabled={isLoading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductProfile;