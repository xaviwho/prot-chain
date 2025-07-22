'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const workflowTemplates = [
  {
    id: 'amyloid_prediction',
    name: 'Amyloid Prediction',
    description: 'Predict amyloid-forming regions in proteins',
    parameters: {
      max_compounds: {
        type: 'number',
        label: 'Max Compounds',
        default: 1000,
        description: 'Maximum number of compounds to screen',
      },
      thorough_mode: {
        type: 'boolean',
        label: 'Thorough Mode',
        default: true,
        description: 'Run full molecular dynamics simulation',
      },
    },
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [parameters, setParameters] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await fetch('/api/workflow/list');
        const data = await res.json();
        setWorkflows(data);
      } catch (err) {
        console.error('Error fetching workflows:', err);
      }
    };
    
    fetchWorkflows();
    const interval = setInterval(fetchWorkflows, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateWorkflow = async () => {
    try {
      if (!workflowName || !selectedTemplate) {
        throw new Error('Please fill in all required fields');
      }

      // Clear any previous errors
      setError(null);

      // Get template config
      const template = workflowTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('Selected template not found');
      }

      const res = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workflowName,
          template: selectedTemplate,
          parameters: parameters
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to create workflow');
      }
      
      setShowNewWorkflow(false);
      setWorkflowName('');
      setSelectedTemplate('');
      setParameters({});
      
      // Redirect to the workflow details page
      window.location.href = `/workflows/${data.id}`;
    } catch (err) {
      console.error('Error creating workflow:', err);
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Drug Discovery Workflows
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowNewWorkflow(true)}
        >
          New Workflow
        </Button>
      </Box>

      <Grid container spacing={3}>
        {workflows.length > 0 ? (
          workflows.map((workflow) => (
            <Grid item xs={12} md={6} lg={4} key={workflow.id}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                }
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {workflow.name || `Workflow ${workflow.id.substring(0, 8)}`}
                  </Typography>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Created: {new Date(workflow.created_at).toLocaleString()}
                  </Typography>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    ID: {workflow.id.substring(0, 8)}...
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      icon={
                        workflow.stage === 'COMPLETED' ? (
                          <CheckCircleIcon />
                        ) : workflow.stage === 'ERROR' ? (
                          <ErrorIcon />
                        ) : workflow.stage === 'INITIALIZED' ? (
                          <ScienceIcon />
                        ) : (
                          <TimelineIcon />
                        )
                      }
                      label={workflow.stage}
                      color={
                        workflow.stage === 'COMPLETED'
                          ? 'success'
                          : workflow.stage === 'ERROR'
                          ? 'error'
                          : 'primary'
                      }
                      variant={workflow.stage === 'INITIALIZED' ? 'outlined' : 'filled'}
                    />
                    
                    {/* Display progress chips for each stage */}
                    {workflow.steps && workflow.steps.some(step => step.status === 'completed') && (
                      <Chip 
                        size="small" 
                        label={`${workflow.steps.filter(step => step.status === 'completed').length}/${workflow.steps.length} steps`}
                        color="info"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                  <Link href={`/workflows/${workflow.id}`} passHref style={{ textDecoration: 'none' }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      size="small"
                    >
                      Open Workflow
                    </Button>
                  </Link>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No workflows found
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Create a new workflow to get started with your drug discovery project
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
                onClick={() => setShowNewWorkflow(true)}
              >
                Create First Workflow
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog
        open={showNewWorkflow}
        onClose={() => setShowNewWorkflow(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Workflow Name"
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Template</InputLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  const template = workflowTemplates.find(
                    (t) => t.id === e.target.value
                  );
                  if (template) {
                    const defaultParams = {};
                    Object.entries(template.parameters).forEach(
                      ([key, param]) => {
                        defaultParams[key] = param.default;
                      }
                    );
                    setParameters(defaultParams);
                  }
                }}
              >
                {workflowTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedTemplate && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Parameters
                </Typography>
                {Object.entries(
                  workflowTemplates.find((t) => t.id === selectedTemplate)
                    .parameters
                ).map(([key, param]) => (
                  <TextField
                    key={key}
                    fullWidth
                    label={param.label}
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={parameters[key]}
                    onChange={(e) =>
                      setParameters({
                        ...parameters,
                        [key]: param.type === 'number'
                          ? Number(e.target.value)
                          : param.type === 'boolean'
                          ? e.target.value === 'true'
                          : e.target.value,
                      })
                    }
                    helperText={param.description}
                    margin="normal"
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewWorkflow(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWorkflow}
            color="primary"
            disabled={!workflowName || !selectedTemplate}
          >
            Create Workflow
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}