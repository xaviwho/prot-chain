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
import WorkflowResults from '@/components/WorkflowResults';

export default function WorkflowDetailsPage() {
  const params = useParams();
  const { id } = params;
  const [workflow, setWorkflow] = useState(null);
  const [runs, setRuns] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchWorkflowAndRuns = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch workflow, runs, and results in parallel
        const [workflowRes, runsRes, resultsRes] = await Promise.all([
          fetch(`/api/v1/workflows/${id}`, { headers }),
          fetch(`/api/v1/workflows/${id}/runs`, { headers }),
          fetch(`/api/workflow/${id}/refresh-results`, { headers })
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

        // Process results response (optional - may not exist for all workflows)
        if (resultsRes.ok) {
          try {
            const resultsData = await resultsRes.json();
            console.log('Loaded workflow results:', resultsData);
            // The results are nested inside the 'details' property from bioapi
            // and the refresh-results endpoint passes the whole object.
            // We only need the core results object for the component.
            setResults(resultsData.details ? resultsData : null);
          } catch (resultsErr) {
            console.log('No results available for this workflow yet:', resultsErr);
            setResults(null);
          }
        } else {
          console.log('Results response not ok:', resultsRes.status, resultsRes.statusText);
          setResults(null);
        }

      } catch (err) {
        console.error('Error fetching workflow data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowAndRuns();
  }, [id]);

  // Note: Removed polling mechanism - we now handle results directly from StructureUpload component

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

  const handleStructureAnalysisStart = () => {
    console.log('Structure analysis started...');
    setIsProcessing(true);
  };

  const handleStructureAnalysisComplete = (data) => {
    console.log('🎉 Structure analysis completed! Received data:', JSON.stringify(data, null, 2));
    setIsProcessing(false);
    
    // Set the results directly from the structure upload component
    if (data && data.details && data.details.descriptors) {
      console.log('✅ Valid bioapi format detected, setting results state...');
      console.log('🔄 BEFORE setResults - current results state:', results);
      setResults(data);
      console.log('✅ Results state updated with structure data:', JSON.stringify(data, null, 2));
      console.log('🚀 UI should now automatically re-render with new results!');
      
      // Force a small delay to ensure state update is processed
      setTimeout(() => {
        console.log('🔍 AFTER setResults - results should now be visible in UI');
      }, 100);
    } else {
      console.error('❌ Invalid structure data received. Expected {details: {descriptors: {...}}} but got:', JSON.stringify(data, null, 2));
      console.error('❌ Data type:', typeof data);
      console.error('❌ Has details?', !!(data && data.details));
      console.error('❌ Has descriptors?', !!(data && data.details && data.details.descriptors));
    }
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
              onStructureAnalysisStart={handleStructureAnalysisStart}
              onStructureAnalysisComplete={handleStructureAnalysisComplete}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Analysis Results
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : results ? (
              <>
                {console.log('Results data being passed to WorkflowResults:', JSON.stringify(results, null, 2))}
                <WorkflowResults results={results} stage="structure_preparation" />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No analysis results available yet. Process a structure to see results here.
              </Typography>
            )}
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