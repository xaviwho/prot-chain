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
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SearchIcon from '@mui/icons-material/Search';
import WorkflowStages from '@/components/WorkflowStages';
import WorkflowResults from '@/components/WorkflowResults';

export default function WorkflowDetailsPage() {
  const params = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [stageResults, setStageResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch workflow status
        const statusRes = await fetch(`/api/workflow/${params.id}/status`);
        if (!statusRes.ok) {
          throw new Error(`Failed to fetch workflow status: ${statusRes.statusText}`);
        }
        const statusData = await statusRes.json();
        console.log('Fetched workflow status:', statusData);
        
        // If workflow has any stage completed, fetch results
        if (statusData.steps && statusData.steps.some(step => step.status === 'COMPLETED')) {
          try {
            // First try to fetch results from the API
            const resultsRes = await fetch(`/api/workflow/${params.id}/results`);
            if (resultsRes.ok) {
              const resultsData = await resultsRes.json();
              console.log('Fetched workflow results:', resultsData);
              
              // Check if we need to fetch structure data directly
              if (resultsData.message && resultsData.message === "Workflow completed successfully") {
                console.log('Attempting to fetch structure data directly');
                // Try to fetch the structure data directly from the results.json file
                try {
                  const structureRes = await fetch(`/api/workflow/${params.id}/refresh-results`);
                  if (structureRes.ok) {
                    const structureData = await structureRes.json();
                    console.log('Fetched refreshed results:', structureData);
                    setResults(structureData);
                  } else {
                    // Fall back to the original results
                    setResults(resultsData);
                  }
                } catch (structureErr) {
                  console.error('Failed to fetch structure data:', structureErr);
                  setResults(resultsData);
                }
              } else {
                setResults(resultsData);
              }
            } else {
              console.error('Failed to fetch results:', await resultsRes.text());
              
              // Try to fetch from refresh-results as a fallback
              try {
                const refreshRes = await fetch(`/api/workflow/${params.id}/refresh-results`);
                if (refreshRes.ok) {
                  const refreshData = await refreshRes.json();
                  console.log('Fetched results from refresh endpoint:', refreshData);
                  setResults(refreshData);
                }
              } catch (refreshErr) {
                console.error('Failed to fetch from refresh endpoint:', refreshErr);
              }
            }
          } catch (err) {
            console.error('Error fetching workflow results:', err);
          }
        }
        
        setWorkflow(statusData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(() => {
      if (workflow && workflow.status !== 'COMPLETED' && workflow.status !== 'ERROR') {
        fetchData();
      }
    }, 3000); // Poll more frequently (every 3 seconds)

    return () => clearInterval(interval);
  }, [params.id, workflow?.stage]);
  
  const handleStageClick = async (stage, stageData) => {
    console.log('Stage clicked:', stage);
    console.log('Results available:', results);
    
    setSelectedStage(stage);
    setActiveTab(0); // Reset to the first tab when switching stages
    
    // If binding site analysis stage is clicked, check if we need to run it
    if (stage === 'binding_site_analysis' && (!results || !results.binding_site_analysis)) {
      console.log('Binding site analysis stage clicked, checking if we need to run it');
      
      // Check if the button to run binding site analysis is visible
      const runBindingSiteAnalysis = async () => {
        try {
          console.log('Running binding site analysis...');
          setLoading(true);
          
          // Call the direct binding site analysis endpoint
          const response = await fetch(`/api/workflow/${params.id}/direct-binding-site-analysis`, {
            method: 'POST',
          });
          
          if (!response.ok) {
            throw new Error(`Failed to run binding site analysis: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('Binding site analysis completed:', data);
          
          // Refresh the results
          const refreshRes = await fetch(`/api/workflow/${params.id}/refresh-results`);
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            console.log('Refreshed results:', refreshData);
            setResults(refreshData);
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Error running binding site analysis:', error);
          setError(error.message);
          setLoading(false);
        }
      };
      
      // Ask the user if they want to run binding site analysis
      if (confirm('Would you like to run binding site analysis now?')) {
        runBindingSiteAnalysis();
      }
    }
    // Pass the entire results object to the component
    // The component will extract what it needs based on the stage
    setStageResults(results); // Set results based on current state for simple clicks
    setShowResults(true);
  };

  // New handler specifically for when Virtual Screening completes
  const handleVirtualScreeningComplete = (screeningData) => {
    console.log("Handling virtual screening completion in page.js:", screeningData);
    // Update the main results state with the new screening data
    const updatedResults = { ...results, virtual_screening: screeningData.virtual_screening };
    setResults(updatedResults);
    
    // Set the stage and results to display
    setSelectedStage('virtual_screening');
    setStageResults(updatedResults); // Use the newly updated results
    setShowResults(true);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!workflow) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Workflow not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 'bold',
                color: 'text.primary',
                fontSize: '2rem',
                mb: 1
              }}
            >
              {workflow.name || workflow.workflow_name || `Workflow ${params.id}`}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Created: {new Date(workflow.created_at || Date.now()).toLocaleString()}
            </Typography>
          </Box>
          <Link href="/workflows" passHref style={{ textDecoration: 'none' }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />}>Back to Workflows</Button>
          </Link>
        </Box>

        {/* Progress indicator */}
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Workflow Progress
          </Typography>
          <WorkflowStages 
            workflow={workflow} 
            onStageClick={handleStageClick} 
            onVirtualScreeningComplete={handleVirtualScreeningComplete} 
          />
        </Paper>

        {/* Display results in a tabbed interface */}
        {showResults && (
          <Paper elevation={3} sx={{ p: 4, mt: 4, borderRadius: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {selectedStage === 'structure_preparation' && 'Structure Preparation'}
                {selectedStage === 'binding_site_analysis' && 'Binding Site Analysis'}
                {selectedStage === 'virtual_screening' && 'Virtual Screening'}
                {selectedStage === 'molecular_dynamics' && 'Molecular Dynamics'}
                {selectedStage === 'lead_optimization' && 'Lead Optimization'}
              </Typography>
              
              {/* Stage-specific tabs */}
              {selectedStage === 'structure_preparation' && (
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                  <Tab icon={<DescriptionIcon />} label="Results" value={0} />
                  <Tab icon={<VisibilityIcon />} label="Visualization" value={1} />
                  <Tab icon={<AnalyticsIcon />} label="Analysis" value={2} />
                </Tabs>
              )}
              
              {selectedStage === 'binding_site_analysis' && (
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                  <Tab icon={<DescriptionIcon />} label="Results" value={0} />
                  <Tab icon={<SearchIcon />} label="Binding Sites" value={1} />
                </Tabs>
              )}
              
              {selectedStage === 'virtual_screening' && (
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                  <Tab icon={<DescriptionIcon />} label="Results" value={0} />
                  <Tab icon={<AnalyticsIcon />} label="Compounds" value={1} />
                </Tabs>
              )}
              
              <Divider sx={{ mt: 1 }} />
            </Box>
            
            <WorkflowResults 
              results={stageResults} 
              stage={selectedStage} 
              activeTab={activeTab} 
            />
          </Paper>
        )}
      </Box>
    </Container>
  );
}