'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState(null);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [error, setError] = useState(null);
  const [invalidToken, setInvalidToken] = useState(false);
  
  const handleLogout = () => {
    // Clear token from localStorage
    localStorage.removeItem('token');
    // Redirect to login page
    window.location.href = '/';
  };

  const fetchWorkflows = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Validate token format (should be header.payload.signature)
      if (!token || token.split('.').length !== 3) {
        console.error('Invalid token format - please log out and log in again');
        setError('Authentication error - please log out and log in again');
        setInvalidToken(true);
        return;
      }

      const res = await fetch('/api/v1/workflows', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch workflows');
      }
      
      // Log the raw response for debugging
      const responseText = await res.text();
      console.log('Raw API response:', responseText);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Invalid response format from server');
      }
      
      // Check if data has the expected structure
      if (data && typeof data === 'object') {
        // Handle different response formats
        if (Array.isArray(data)) {
          // If the API returns an array directly
          setWorkflows(data);
        } else if (data.payload && Array.isArray(data.payload)) {
          // If the API returns {payload: [...workflows]}
          setWorkflows(data.payload);
        } else if (data.data && Array.isArray(data.data)) {
          // If the API returns {data: [...workflows]}
          setWorkflows(data.data);
        } else if (data.workflows && Array.isArray(data.workflows)) {
          // If the API returns {workflows: [...workflows]}
          setWorkflows(data.workflows);
        } else {
          // If we can't find workflows in any expected location
          console.error('Unexpected response structure:', data);
          setWorkflows([]);
          setError('No workflows data found in server response');
        }
      } else {
        console.error('Invalid response data:', data);
        setWorkflows([]);
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching workflows:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreateWorkflow = async () => {
    try {
      if (!newWorkflowName) {
        throw new Error('Workflow name is required');
      }
      setError(null);

      const token = localStorage.getItem('token');
      
      // Validate token format (should be header.payload.signature)
      if (!token || token.split('.').length !== 3) {
        setError('Authentication error - please log out and log in again');
        setInvalidToken(true);
        return;
      }
      
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newWorkflowName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create workflow');
      }

      setShowNewWorkflowDialog(false);
      setNewWorkflowName('');
      fetchWorkflows(); // Refresh the list
    } catch (err) {
      console.error('Error creating workflow:', err);
      setError(err.message);
    }
  };

  const openDeleteDialog = (workflow) => {
    setWorkflowToDelete(workflow);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    setWorkflowToDelete(null);
    setShowDeleteDialog(false);
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/workflows/${workflowToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete workflow');
      }

      setWorkflows(workflows.filter((w) => w.id !== workflowToDelete.id));
      closeDeleteDialog();
    } catch (err) {
      console.error('Error deleting workflow:', err);
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
          action={
            invalidToken && (
              <Button color="inherit" size="small" onClick={handleLogout}>
                Re-login
              </Button>
            )
          }
        >
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ color: 'text.primary' }}>
          My Workflows
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ScienceIcon />}
          onClick={() => setShowNewWorkflowDialog(true)}
        >
          New Workflow
        </Button>
      </Box>

      <Grid container spacing={3}>
        {workflows.length > 0 ? (
          workflows.map((workflow) => (
            <Grid item xs={12} md={6} lg={4} key={workflow.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">{workflow.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Created: {new Date(workflow.created_at).toLocaleString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Button component={Link} href={`/workflows/${workflow.id}`} size="small">
                    Open
                  </Button>
                  <IconButton onClick={() => openDeleteDialog(workflow)} size="small" aria-label="delete">
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Typography sx={{ ml: 2, mt: 2 }}>No workflows found. Create one to get started.</Typography>
        )}
      </Grid>

      {/* New Workflow Dialog */}
      <Dialog open={showNewWorkflowDialog} onClose={() => setShowNewWorkflowDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Workflow Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewWorkflowDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateWorkflow} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={closeDeleteDialog} fullWidth maxWidth="xs">
        <DialogTitle>Delete Workflow?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the workflow "{workflowToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteWorkflow} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}