'use client';

import { useState } from 'react';
import StructureUpload from './StructureUpload';
import RunBindingSiteButton from './RunBindingSiteButton';
import RunVirtualScreeningButton from './RunVirtualScreeningButton';
import {
  Stepper,
  Step,
  StepLabel,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Chip,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import SearchIcon from '@mui/icons-material/Search';
import TimelineIcon from '@mui/icons-material/Timeline';
import BiotechIcon from '@mui/icons-material/Biotech';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const stages = [
  {
    label: 'Structure Preparation',
    icon: ScienceIcon,
    description: 'Preparing protein structure for analysis',
  },
  {
    label: 'Binding Site Analysis',
    icon: SearchIcon,
    description: 'Analyzing potential binding sites',
  },
  {
    label: 'Virtual Screening',
    icon: TimelineIcon,
    description: 'Screening compound library',
  },
  {
    label: 'Molecular Dynamics',
    icon: BiotechIcon,
    description: 'Running molecular dynamics simulation',
  },
  {
    label: 'Lead Optimization',
    icon: CheckCircleIcon,
    description: 'Optimizing lead compounds',
  },
];

export default function WorkflowStages({ workflow, onStageClick, onVirtualScreeningComplete, onStructureAnalysisStart, onStructureAnalysisComplete }) {
  const getStageStatus = (index) => {
    if (!workflow || !workflow.steps) return 'pending';
    const stageName = stages[index].label.toLowerCase().replace(' ', '_');
    const step = workflow.steps.find(s => s.id === stageName);
    
    if (step) {
      return step.status.toLowerCase();
    }
    
    if (workflow.error) return 'error';
    
    const currentStageIndex = stages.findIndex(
      (s) => s.label.toLowerCase().replace(' ', '_') === workflow.current_stage
    );
    
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stepper activeStep={workflow?.current_stage ? stages.findIndex(s => s.label.toLowerCase().replace(' ', '_') === workflow.current_stage) : -1} alternativeLabel>
        {stages.map((stage, index) => {
          const status = getStageStatus(index);
          const StageIcon = stage.icon;
          
          return (
            <Step key={stage.label}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {status === 'active' ? (
                      <CircularProgress size={24} />
                    ) : (
                      <StageIcon
                        color={
                          status === 'completed'
                            ? 'success'
                            : status === 'error'
                            ? 'error'
                            : 'disabled'
                        }
                      />
                    )}
                  </Box>
                )}
              >
                <Typography variant="subtitle2">{stage.label}</Typography>
                {workflow?.steps?.find(s => s.id === stage.label.toLowerCase().replace(' ', '_')) && (
                  <Chip
                    label={status}
                    size="small"
                    color={
                      status === 'completed'
                        ? 'success'
                        : status === 'error'
                        ? 'error'
                        : 'default'
                    }
                  />
                )}
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>

      <Box sx={{ mt: 4 }}>
        {stages.map((stage, index) => {
          const status = getStageStatus(index);
          const stageKey = stage.label.toLowerCase().replace(' ', '_');
          const stageData = workflow?.steps?.find(s => s.id === stageKey);
          
          return (
            <Paper
              key={stage.label}
              sx={{
                p: 2,
                mb: 2,
                cursor: workflow?.steps && stageData ? 'pointer' : 'default',
                '&:hover': workflow?.steps && stageData ? { backgroundColor: '#f5f5f5' } : {},
              }}
              onClick={() => stageData && onStageClick(stageKey, stageData)}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="h6">{stage.label}</Typography>
                  <Typography color="textSecondary">
                    {stage.description}
                  </Typography>
                  {stageData?.completed_at && (
                    <Typography variant="caption" display="block">
                      Completed: {new Date(stageData.completed_at).toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <Box>
                  {status === 'pending' && stage.label === 'Structure Preparation' && (
                    <StructureUpload 
                      workflowId={workflow.id} 
                      onUploadComplete={(data) => {
                        console.log('🔄 StructureUpload completed, data received in WorkflowStages:', data);
                        
                        // Call the completion handler to update main page state
                        if (onStructureAnalysisComplete && data.status === 'success') {
                          onStructureAnalysisComplete(data);
                        }
                        
                        // Also update the workflow stage state
                        if (data.status === 'success') {
                          onStageClick(stageKey, { ...stageData, results: data });
                        }
                      }} 
                    />
                  )}
                  
                  {/* Add Run Binding Site Analysis button for the Binding Site Analysis stage */}
                  {status === 'pending' && stage.label === 'Binding Site Analysis' && 
                   workflow?.steps?.find(s => s.id === 'structure_preparation')?.status === 'completed' && (
                    <RunBindingSiteButton 
                      workflowId={workflow.id}
                      onSuccess={(data) => {
                        console.log('Binding site analysis completed with data:', data);
                        // Update the workflow state to show the binding site analysis as completed
                        if (onStageClick && data && data.binding_site_analysis) {
                          // Force a click on the binding site analysis stage to show results
                          onStageClick('binding_site_analysis', {
                            id: 'binding_site_analysis',
                            status: 'completed',
                            results: data
                          });
                        }
                      }}
                    />
                  )}
                  {status === 'pending' && stage.label === 'Virtual Screening' && 
                   workflow?.steps?.find(s => s.id === 'binding_site_analysis')?.status === 'completed' && (
                    <RunVirtualScreeningButton 
                      workflowId={workflow.id}
                      onSuccess={(data) => {
                        console.log('Virtual screening success handler in WorkflowStages, calling onVirtualScreeningComplete:', data);
                        // Use the specific handler passed from the parent page
                        if (onVirtualScreeningComplete) {
                          onVirtualScreeningComplete(data);
                        } else {
                          console.warn('onVirtualScreeningComplete handler not provided to WorkflowStages');
                        }
                      }}
                      onError={(errorMessage) => {
                        console.error('Virtual screening failed:', errorMessage);
                        // Optionally, show an error message to the user
                      }}
                      disabled={!workflow?.steps?.find(s => s.id === 'binding_site_analysis')?.status === 'completed'} // Disable if previous step not done
                    />
                  )}
                  {status === 'completed' && (
                    <Button 
                      variant="contained" 
                      color="primary"
                      size="small"
                      onClick={() => onStageClick(stageKey, stageData)}
                      startIcon={<CheckCircleIcon />}
                    >
                      View Results
                    </Button>
                  )}
                  {status === 'error' && stageData?.error && (
                    <Typography color="error">{stageData.error}</Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
