'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WorkflowRunHistory from '@/components/workflow-run-history';
import WorkflowStages from '@/components/WorkflowStages';

export default function WorkflowDetailsPage() {
  const params = useParams();
  const { id } = params;
  const [workflow, setWorkflow] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchWorkflowAndRuns = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch both in parallel
        const [workflowRes, runsRes] = await Promise.all([
          fetch(`/api/v1/workflows/${id}`, { headers }),
          fetch(`/api/v1/workflows/${id}/runs`, { headers })
        ]);

        // Process workflow response
        if (!workflowRes.ok) {
          const data = await workflowRes.json();
          throw new Error(data.message || 'Failed to fetch workflow details');
        }
        const workflowData = await workflowRes.json();
        setWorkflow(workflowData.payload);

        // Process runs response
        if (!runsRes.ok) {
          const data = await runsRes.json();
          throw new Error(data.message || 'Failed to fetch workflow runs');
        }
        const runsData = await runsRes.json();
        setRuns(runsData.data || []);

      } catch (err) {
        console.error('Error fetching workflow data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowAndRuns();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          component={Link}
          href="/workflows"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Workflows
        </Button>
      </Container>
    );
  }

  if (!workflow) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Workflow not found.</Typography>
        <Button
          component={Link}
          href="/workflows"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Workflows
        </Button>
      </Container>
    );
  }

  const handleStageClick = (stage) => {
    console.log('Selected stage:', stage);
    // Handle stage click/selection
  };

  const handleVirtualScreeningComplete = (results) => {
    console.log('Virtual screening complete:', results);
    // Handle virtual screening completion
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        component={Link}
        href="/workflows"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Back to Workflows
      </Button>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {workflow.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Workflow ID: {workflow.id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Created: {new Date(workflow.created_at).toLocaleString()}
        </Typography>
      </Paper>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Drug Pipeline
            </Typography>
            <WorkflowStages 
              workflow={workflow} 
              onStageClick={handleStageClick}
              onVirtualScreeningComplete={handleVirtualScreeningComplete} 
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Run History
            </Typography>
            <WorkflowRunHistory runs={runs} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}