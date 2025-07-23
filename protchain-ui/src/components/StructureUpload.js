'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  Divider,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import { retrieveProteinDetail } from '@/lib/api';

export default function StructureUpload({ onUploadComplete, workflowId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [pdbId, setPdbId] = useState('');
  const [searchMode, setSearchMode] = useState(true); // true = search, false = upload

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.toLowerCase().endsWith('.pdb')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid PDB file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload the structure file
      const response = await fetch(`/api/workflow/${workflowId}/structure`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload structure file');
      }

      const data = await response.json();
      console.log('Structure upload response:', data);
      
      // Poll for structure processing completion
      await pollStructureStatus();
      
      // Structure processing completed successfully
      onUploadComplete(data);
    } catch (err) {
      console.error('Structure upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };
  
  // Function to poll the structure processing status
  const pollStructureStatus = async () => {
    const maxAttempts = 60; // Increased maximum number of polling attempts (2 minutes total)
    const pollInterval = 2000; // Polling interval in milliseconds
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/workflow/${workflowId}/structure-status`);
          
          if (!statusResponse.ok) {
            throw new Error('Failed to check structure processing status');
          }
          
          const statusData = await statusResponse.json();
          console.log('Structure processing status:', statusData);
          
          if (statusData.status === 'COMPLETED') {
            // Structure processing completed successfully
            resolve(statusData);
            return;
          } else if (statusData.status === 'ERROR') {
            // Structure processing failed
            reject(new Error(statusData.message || 'Structure processing failed'));
            return;
          }
          
          // Continue polling if not completed or errored
          attempts++;
          
          // Update the UI with progress information
          if (attempts % 5 === 0) { // Every 10 seconds
            setError(`Processing structure... (${attempts}/${maxAttempts})`);
          }
          
          if (attempts >= maxAttempts) {
            // Try one last time to fetch results directly before giving up
            try {
              const resultsResponse = await fetch(`/api/workflow/${workflowId}/refresh-results`);
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json();
                if (resultsData && (resultsData.STRUCTURE_PREPARATION || resultsData.structure_preparation)) {
                  console.log('Found results despite timeout, continuing');
                  resolve(resultsData);
                  return;
                }
              }
            } catch (lastAttemptErr) {
              console.error('Last attempt to fetch results failed:', lastAttemptErr);
            }
            
            reject(new Error('Structure processing timed out. The PDB file may be too large or complex.'));
            return;
          }
          
          // Schedule next polling attempt
          setTimeout(checkStatus, pollInterval);
        } catch (err) {
          console.error('Error checking structure status:', err);
          
          // Don't immediately reject on network errors, try again
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Structure processing checks failed too many times'));
            return;
          }
          
          // Schedule next polling attempt despite error
          setTimeout(checkStatus, pollInterval);
        }
      };
      
      // Start polling
      checkStatus();
    });
  };

  const handlePdbSearch = async () => {
    if (!pdbId.trim()) {
      setError('Please enter a valid PDB ID');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      console.log('Searching for PDB ID:', pdbId);
      const response = await retrieveProteinDetail(pdbId);

      if (!response || !response.metadata || !response.file) {
        throw new Error('Failed to fetch protein data. Please check the PDB ID and try again.');
      }

      const pdbBlob = new Blob([response.file], { type: 'chemical/x-pdb' });
      const formData = new FormData();
      formData.append('file', pdbBlob, `${pdbId}.pdb`);

      // Upload to workflow
      const uploadResponse = await fetch(`/api/workflow/${workflowId}/structure`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to process structure');
      }

      const data = await uploadResponse.json();
      console.log('Structure upload response:', data);
      
      // Poll for structure processing completion
      await pollStructureStatus();
      
      // Structure processing completed successfully
      onUploadComplete({
        ...data,
        metadata: response.metadata.payload
      });
    } catch (err) {
      console.error('PDB search error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Prepare Protein Structure
      </Typography>
      <Typography color="textSecondary" paragraph>
        Search for a PDB structure or upload your own file.
        The structure will be prepared for analysis including:
        - Adding missing hydrogens
        - Optimizing hydrogen bonds
        - Generating molecular descriptors
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button
          variant={searchMode ? 'contained' : 'outlined'}
          onClick={() => setSearchMode(true)}
          sx={{ 
            mr: 1,
            ...(searchMode && {
              backgroundColor: '#4caf50',
              '&:hover': {
                backgroundColor: '#45a049'
              }
            })
          }}
        >
          Search PDB
        </Button>
        <Button
          variant={!searchMode ? 'contained' : 'outlined'}
          onClick={() => setSearchMode(false)}
          sx={{
            ...(!searchMode && {
              backgroundColor: '#4caf50',
              '&:hover': {
                backgroundColor: '#45a049'
              }
            })
          }}
        >
          Upload File
        </Button>
      </Box>

      {searchMode ? (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="PDB ID"
            value={pdbId}
            onChange={(e) => setPdbId(e.target.value.toUpperCase())}
            placeholder="Enter PDB ID (e.g., 1ABC)"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handlePdbSearch}
            disabled={uploading || !pdbId.trim()}
            fullWidth
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': {
                backgroundColor: '#45a049'
              },
              '&:disabled': {
                backgroundColor: '#cccccc'
              }
            }}
          >
            {uploading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Processing Structure...
              </>
            ) : (
              'Search and Process Structure'
            )}
          </Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 3,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <input
              type="file"
              accept=".pdb"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="structure-file-input"
            />
            <label htmlFor="structure-file-input">
              <Button
                component="span"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={uploading}
              >
                Select PDB File
              </Button>
            </label>
            
            {file && (
              <Typography sx={{ mt: 2 }}>
                Selected: {file.name}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || uploading}
            fullWidth
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': {
                backgroundColor: '#45a049'
              },
              '&:disabled': {
                backgroundColor: '#cccccc'
              }
            }}
          >
            {uploading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Processing Structure...
              </>
            ) : (
              'Upload and Process Structure'
            )}
          </Button>
        </>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
}
