'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Button,
} from '@mui/material';
import { ExpandMore, Download } from '@mui/icons-material';
import dynamic from 'next/dynamic';

const PDBViewer = dynamic(() => import('./PDBViewer'), { ssr: false });
const BindingSiteViewer = dynamic(() => import('./BindingSiteViewer'), { ssr: false });
const BindingSite3DViewer = dynamic(() => import('./BindingSite3DViewer'), { ssr: false });

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function WorkflowResults({ results, stage, activeTab = 0 }) {
  const [loading, setLoading] = useState(false);
  const [localResults, setLocalResults] = useState(null);
  const params = useParams();
  
  // Initialize local results from props
  useEffect(() => {
    if (results) {
      setLocalResults(results);
    }
  }, [results]);

  // Download functionality
  const handleDownloadResults = () => {
    if (!results) {
      console.log('No results available for download');
      return;
    }

    try {
      // Create a comprehensive results object
      const downloadData = {
        workflow_id: params.id,
        stage: stage,
        timestamp: new Date().toISOString(),
        results: results
      };

      // Convert to JSON string with proper formatting
      const jsonString = JSON.stringify(downloadData, null, 2);
      
      // Create blob and download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-${params.id}-${stage}-results-${new Date().toISOString().split('T')[0]}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Results downloaded successfully');
    } catch (error) {
      console.error('Error downloading results:', error);
    }
  };

  const renderStructurePreparation = (data) => {
    console.log('Structure preparation data:', data);
    
    // Extract structure data from various possible formats
    let structureData = {};
    
    // Option 1: Direct STRUCTURE_PREPARATION key
    if (data?.STRUCTURE_PREPARATION?.descriptors) {
      structureData = data.STRUCTURE_PREPARATION.descriptors;
    }
    // Option 2: Check for atom_count and other properties directly in data
    else if (data && (data.atom_count || data.residue_count || data.chain_count)) {
      structureData = {
        num_atoms: data.atom_count,
        num_residues: data.residue_count,
        num_chains: data.chain_count,
        hetatm_count: data.hetatm_count,
        has_hydrogens: data.has_hydrogens,
        has_ligands: data.has_ligands
      };
    }
    // Option 3: Look for structure data in a nested structure
    else if (data?.structure_preparation) {
      if (data.structure_preparation.atom_count) {
        structureData = {
          num_atoms: data.structure_preparation.atom_count,
          num_residues: data.structure_preparation.residue_count,
          num_chains: data.structure_preparation.chain_count,
          hetatm_count: data.structure_preparation.hetatm_count,
          has_hydrogens: data.structure_preparation.has_hydrogens,
          has_ligands: data.structure_preparation.has_ligands
        };
      } else {
        structureData = data.structure_preparation;
      }
    }
    
    // If we still don't have structure data, show an error
    if (Object.keys(structureData).length === 0) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Structure Analysis
          </Typography>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body1" color="error" gutterBottom>
              No structure analysis data available
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }
    
    // Create a more visually appealing display for structure data
    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Structure Analysis Results
        </Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <TableContainer>
            <Table sx={{ minWidth: 500 }}>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Property</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {structureData.num_chains !== undefined && (
                  <TableRow>
                    <TableCell>Chains</TableCell>
                    <TableCell>{structureData.num_chains}</TableCell>
                  </TableRow>
                )}
                {structureData.num_residues !== undefined && (
                  <TableRow>
                    <TableCell>Residues</TableCell>
                    <TableCell>{structureData.num_residues}</TableCell>
                  </TableRow>
                )}
                {structureData.num_atoms !== undefined && (
                  <TableRow>
                    <TableCell>Atoms</TableCell>
                    <TableCell>{structureData.num_atoms}</TableCell>
                  </TableRow>
                )}
                {structureData.hetatm_count !== undefined && (
                  <TableRow>
                    <TableCell>HETATM Count</TableCell>
                    <TableCell>{structureData.hetatm_count}</TableCell>
                  </TableRow>
                )}
                {structureData.molecular_weight !== undefined && (
                  <TableRow>
                    <TableCell>Molecular Weight</TableCell>
                    <TableCell>{typeof structureData.molecular_weight === 'number' ? structureData.molecular_weight.toFixed(2) : structureData.molecular_weight}</TableCell>
                  </TableRow>
                )}
                {structureData.num_bonds !== undefined && (
                  <TableRow>
                    <TableCell>Bonds</TableCell>
                    <TableCell>{structureData.num_bonds}</TableCell>
                  </TableRow>
                )}
                {structureData.num_rings !== undefined && (
                  <TableRow>
                    <TableCell>Rings</TableCell>
                    <TableCell>{structureData.num_rings}</TableCell>
                  </TableRow>
                )}
                {structureData.num_rotatable_bonds !== undefined && (
                  <TableRow>
                    <TableCell>Rotatable Bonds</TableCell>
                    <TableCell>{structureData.num_rotatable_bonds}</TableCell>
                  </TableRow>
                )}
                {structureData.has_hydrogens !== undefined && (
                  <TableRow>
                    <TableCell>Has Hydrogens</TableCell>
                    <TableCell>{structureData.has_hydrogens ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                )}
                {structureData.has_ligands !== undefined && (
                  <TableRow>
                    <TableCell>Has Ligands</TableCell>
                    <TableCell>{structureData.has_ligands ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Download Results Button */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleDownloadResults}
              sx={{
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0'
                }
              }}
            >
              Download Results
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderBindingSites = (data) => {
    console.log('Rendering binding sites with data:', data);
    
    // Check all possible locations for binding site data
    let bindingSites = [];
    
    // Option 1: Direct binding_sites array
    if (data?.binding_sites && Array.isArray(data.binding_sites) && data.binding_sites.length > 0) {
      console.log('Found binding sites in data.binding_sites');
      bindingSites = data.binding_sites;
    }
    // Option 2: Inside binding_site_analysis object
    else if (data?.binding_site_analysis?.binding_sites && 
             Array.isArray(data.binding_site_analysis.binding_sites) && 
             data.binding_site_analysis.binding_sites.length > 0) {
      console.log('Found binding sites in data.binding_site_analysis.binding_sites');
      bindingSites = data.binding_site_analysis.binding_sites;
    }
    
    // If no binding sites found, show message
    if (bindingSites.length === 0) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Binding Site Analysis
          </Typography>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No binding sites found. Please run binding site analysis.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }

    // Render binding sites with 3D visualization
    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Binding Site Analysis Results
        </Typography>
        
        {/* 3D Visualization of binding sites */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            3D Visualization
          </Typography>
          <Box sx={{ height: '500px', mb: 2, border: '1px solid #eee', borderRadius: 1 }}>
            <BindingSite3DViewer 
              workflowId={params.id} 
              bindingSites={bindingSites} 
            />
          </Box>
        </Paper>
        
        {/* Detailed binding site information */}
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Binding Site Details
        </Typography>
        {bindingSites.map((site, index) => (
          <Accordion 
            key={index} 
            sx={{ 
              mb: 2, 
              '&:before': { display: 'none' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ backgroundColor: '#f8f9fa' }}
            >
              <Typography sx={{ fontWeight: 'medium' }}>
                Binding Site {index + 1} (Score: {site.score?.toFixed(2) || 'N/A'})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Volume</TableCell>
                      <TableCell>{site.volume.toFixed(2)} Å³</TableCell>
                    </TableRow>
                    {site.druggability && (
                      <TableRow>
                        <TableCell>Druggability</TableCell>
                        <TableCell>{site.druggability.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    {site.hydrophobicity && (
                      <TableRow>
                        <TableCell>Hydrophobicity</TableCell>
                        <TableCell>{site.hydrophobicity.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell>Center</TableCell>
                      <TableCell>
                        ({site.center.x.toFixed(2)}, {site.center.y.toFixed(2)}, {site.center.z.toFixed(2)})
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Residues</TableCell>
                      <TableCell>{site.residues.length} residues</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Residue List</TableCell>
                      <TableCell sx={{ maxWidth: '400px', overflowX: 'auto' }}>
                        {site.residues.map(r => `${r.name}${r.number}${r.chain}`).join(', ')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
        
        {/* Download Results Button */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadResults}
            sx={{
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0'
              }
            }}
          >
            Download Results
          </Button>
        </Box>
      </Box>
    );
  };

  const renderScreeningResults = (data) => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Virtual Screening Results
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Compound</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Binding Energy</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.compounds.map((compound, index) => (
              <TableRow key={index}>
                <TableCell>{compound.name}</TableCell>
                <TableCell>{compound.score.toFixed(2)}</TableCell>
                <TableCell>{compound.binding_energy.toFixed(2)} kcal/mol</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderMDResults = (data) => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Molecular Dynamics Results
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Simulation Summary
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>Duration</TableCell>
              <TableCell>{data.duration} ns</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Temperature</TableCell>
              <TableCell>{data.temperature} K</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>RMSD</TableCell>
              <TableCell>{data.rmsd.toFixed(2)} Å</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      {data.trajectories.map((traj, index) => (
        <Accordion key={index}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Trajectory {index + 1}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Trajectory visualization will be available here</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderOptimizationResults = (data) => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Lead Optimization Results
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Compound</TableCell>
              <TableCell>Predicted Activity</TableCell>
              <TableCell>Synthetic Accessibility</TableCell>
              <TableCell>Drug Likeness</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.optimized_compounds.map((compound, index) => (
              <TableRow key={index}>
                <TableCell>{compound.name}</TableCell>
                <TableCell>{compound.predicted_activity.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress variant="determinate" value={compound.synthetic_accessibility * 10} />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2">{compound.synthetic_accessibility.toFixed(1)}/10</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{compound.drug_likeness.toFixed(2)}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined">View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderVirtualScreeningResults = (data) => {
    console.log("Rendering Virtual Screening Results with data:", data);

    if (!data || data.status !== 'completed') {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Virtual Screening Analysis
          </Typography>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {data?.status === 'running' ? 'Virtual screening is in progress...' : 'Virtual screening not yet completed or results unavailable.'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }

    if (!data.top_compounds || data.top_compounds.length === 0) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Virtual Screening Analysis
          </Typography>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Screening completed, but no top compounds found.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Virtual Screening Results
        </Typography>
        
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
            Top Compounds
          </Typography>
          <TableContainer sx={{ maxHeight: 440, border: '1px solid #eee', borderRadius: 1 }}>
            <Table stickyHeader aria-label="virtual screening results table">
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Compound ID</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Score</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>SMILES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.top_compounds.map((compound) => (
                  <TableRow
                    key={compound.id}
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { backgroundColor: '#f8f9fa' }
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {compound.id}
                    </TableCell>
                    <TableCell align="right">{compound.score}</TableCell>
                    <TableCell sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {compound.smiles}
                    </TableCell> 
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Timestamp: {new Date(data.timestamp).toLocaleString()}
            </Typography>
            <Button 
              variant="contained"
              size="small"
              startIcon={<Download />}
              onClick={handleDownloadResults}
              sx={{
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0'
                }
              }}
            >
              Download Results
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderStageResults = () => {
    console.log('Rendering stage results for stage:', stage, 'with activeTab:', activeTab);
    console.log('Results:', results);
    
    if (!results) {
      return <Typography>No results available</Typography>;
    }
    
    // Structure Preparation Stage
    if (stage === 'structure_preparation') {
      // Tab 0: Results
      if (activeTab === 0) {
        return results?.STRUCTURE_PREPARATION ? 
          renderStructurePreparation(results) : 
          <Typography>No structure preparation results available</Typography>;
      }
      // Tab 1: Visualization
      else if (activeTab === 1) {
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              3D Structure Visualization
            </Typography>
            <Paper sx={{ p: 3, height: '500px', mb: 3 }}>
              <PDBViewer workflowId={params.id} />
            </Paper>
          </Box>
        );
      }
      // Tab 2: Analysis
      else if (activeTab === 2) {
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Structure Analysis
            </Typography>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="body1" paragraph>
                This section provides detailed analysis of the protein structure properties.
              </Typography>
              {results?.STRUCTURE_PREPARATION?.descriptors ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Property</TableCell>
                        <TableCell>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(results.STRUCTURE_PREPARATION.descriptors).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell>{key.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{typeof value === 'number' ? value.toFixed(2) : String(value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>No analysis data available</Typography>
              )}
            </Paper>
          </Box>
        );
      }
    }
    
    // Binding Site Analysis Stage
    else if (stage === 'binding_site_analysis') {
      // Tab 0: Results
      if (activeTab === 0) {
        return results?.binding_site_analysis || results?.binding_sites ? 
          renderBindingSites(results) : 
          <Typography>No binding site analysis results available</Typography>;
      }
      // Tab 1: Binding Sites
      else if (activeTab === 1) {
        let bindingSites = [];
        if (results?.binding_sites) bindingSites = results.binding_sites;
        else if (results?.binding_site_analysis?.binding_sites) bindingSites = results.binding_site_analysis.binding_sites;
        
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Binding Sites Visualization
            </Typography>
            <Paper sx={{ p: 3, height: '500px', mb: 3 }}>
              {bindingSites.length > 0 ? (
                <BindingSite3DViewer workflowId={params.id} bindingSites={bindingSites} />
              ) : (
                <Typography>No binding sites available for visualization</Typography>
              )}
            </Paper>
          </Box>
        );
      }
    }
    
    // Virtual Screening Stage
    else if (stage === 'virtual_screening') {
      // Tab 0: Results
      if (activeTab === 0) {
        return results?.virtual_screening ? 
          renderVirtualScreeningResults(results.virtual_screening) : 
          <Typography>No virtual screening results available</Typography>;
      }
      // Tab 1: Compounds
      else if (activeTab === 1) {
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Screened Compounds
            </Typography>
            <Paper sx={{ p: 3, mb: 3 }}>
              {results?.virtual_screening?.top_compounds ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Compound ID</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>SMILES</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.virtual_screening.top_compounds.map((compound) => (
                        <TableRow key={compound.id}>
                          <TableCell>{compound.id}</TableCell>
                          <TableCell>{compound.score}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{compound.smiles}</TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined">View 3D</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>No compound data available</Typography>
              )}
            </Paper>
          </Box>
        );
      }
    }
    
    // Molecular Dynamics Stage
    else if (stage === 'molecular_dynamics') {
      return results?.molecular_dynamics ? 
        renderMolecularDynamics(results.molecular_dynamics) : 
        <Typography>No molecular dynamics results available</Typography>;
    }
    
    // Lead Optimization Stage
    else if (stage === 'lead_optimization') {
      return results?.lead_optimization ? 
        renderLeadOptimization(results.lead_optimization) : 
        <Typography>No lead optimization results available</Typography>;
    }
    
    // Default case
    else {
      return <Typography>Select a stage to view results</Typography>;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="fullWidth"
        >
          <Tab label="Results" />
          <Tab label="Visualization" />
          <Tab label="Analysis" />
          <Tab label="Binding Sites" />
        </Tabs>
        <TabPanel value={activeTab} index={0}>
          {renderStageResults()}
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ height: 400 }}>
            {stage === 'structure_preparation' ? (
              // Check if we have the STRUCTURE_PREPARATION data, which means we have a processed structure
              results && results.STRUCTURE_PREPARATION ? (
                // Extract the workflow ID from the URL if available
                <PDBViewer 
                  workflowId={window.location.pathname.split('/').pop()} 
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="body1">
                    PDB structure visualization will appear here. Please process a structure first.
                  </Typography>
                </Box>
              )
            ) : (
              <PDBViewer pdbId={results.pdb_id} />
            )}
          </Box>
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ height: 400 }}>
            {(localResults || results) && (localResults?.binding_site_analysis || results?.binding_site_analysis) && 
             ((localResults?.binding_site_analysis?.binding_sites && localResults.binding_site_analysis.binding_sites.length > 0) ||
              (results?.binding_site_analysis?.binding_sites && results.binding_site_analysis.binding_sites.length > 0)) ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Binding Sites ({(localResults?.binding_site_analysis?.binding_sites?.length || results?.binding_site_analysis?.binding_sites?.length || 0)} detected)
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="small"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/workflow/${params.id}/direct-binding-site-analysis`, {
                          method: 'POST',
                        });
                        
                        if (!response.ok) {
                          throw new Error(`Failed to run binding site analysis: ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        console.log('Binding site analysis completed:', data);
                        
                        // Update the results state with the new data
                        setResults(prev => ({
                          ...prev,
                          binding_site_analysis: data.binding_site_analysis
                        }));
                      } catch (error) {
                        console.error('Error running binding site analysis:', error);
                        alert(`Error: ${error.message}`);
                      }
                    }}
                  >
                    Refresh Analysis
                  </Button>
                </Box>
                <Box sx={{ height: 300, overflow: 'auto' }}>
                  {renderBindingSites(localResults?.binding_site_analysis || results?.binding_site_analysis)}
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Method: {(localResults?.binding_site_analysis?.method || results?.binding_site_analysis?.method || 'reliable_python')}
                  </Typography>
                  {(localResults?.binding_site_analysis?.timestamp || results?.binding_site_analysis?.timestamp) && (
                    <Typography variant="body2" color="text.secondary">
                      Generated: {new Date(localResults?.binding_site_analysis?.timestamp || results?.binding_site_analysis?.timestamp).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  No binding site data available. Run binding site analysis to detect potential binding pockets.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={async () => {
                    try {
                      // Show loading state
                      setLoading(true);
                      
                      const response = await fetch(`/api/workflow/${params.id}/direct-binding-site-analysis`, {
                        method: 'POST',
                      });
                      
                      if (!response.ok) {
                        throw new Error(`Failed to run binding site analysis: ${response.statusText}`);
                      }
                      
                      const data = await response.json();
                      console.log('Binding site analysis completed:', data);
                      
                      // Update the local results state with the new data
                      setLocalResults(prev => ({
                        ...(prev || {}),
                        binding_site_analysis: data.binding_site_analysis
                      }));
                      
                      // Hide loading state
                      setLoading(false);
                    } catch (error) {
                      console.error('Error running binding site analysis:', error);
                      alert(`Error: ${error.message}`);
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Running Analysis...' : 'Run Binding Site Analysis'}
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          {stage === 'structure_preparation' && results?.STRUCTURE_PREPARATION?.descriptors ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Drug-likeness Analysis
              </Typography>
              <Typography variant="body1" paragraph>
                Analysis of the structure based on Lipinski's Rule of Five and other drug-likeness properties:
              </Typography>
              
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Property</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Preferred Range</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Molecular Weight</TableCell>
                      <TableCell>{results.STRUCTURE_PREPARATION.descriptors.molecular_weight?.toFixed(2)}</TableCell>
                      <TableCell>&lt; 500 Da</TableCell>
                      <TableCell>
                        {results.STRUCTURE_PREPARATION.descriptors.molecular_weight < 500 ? 
                          '✅ Good' : '⚠️ High'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>LogP</TableCell>
                      <TableCell>{results.STRUCTURE_PREPARATION.descriptors.logp?.toFixed(2)}</TableCell>
                      <TableCell>-0.4 to 5.6</TableCell>
                      <TableCell>
                        {(results.STRUCTURE_PREPARATION.descriptors.logp > -0.4 && 
                         results.STRUCTURE_PREPARATION.descriptors.logp < 5.6) ? 
                          '✅ Good' : '⚠️ Outside optimal range'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>H-Bond Donors</TableCell>
                      <TableCell>{results.STRUCTURE_PREPARATION.descriptors.num_h_donors}</TableCell>
                      <TableCell>&lt; 5</TableCell>
                      <TableCell>
                        {results.STRUCTURE_PREPARATION.descriptors.num_h_donors < 5 ? 
                          '✅ Good' : '⚠️ High'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>H-Bond Acceptors</TableCell>
                      <TableCell>{results.STRUCTURE_PREPARATION.descriptors.num_h_acceptors}</TableCell>
                      <TableCell>&lt; 10</TableCell>
                      <TableCell>
                        {results.STRUCTURE_PREPARATION.descriptors.num_h_acceptors < 10 ? 
                          '✅ Good' : '⚠️ High'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Rotatable Bonds</TableCell>
                      <TableCell>{results.STRUCTURE_PREPARATION.descriptors.num_rotatable_bonds}</TableCell>
                      <TableCell>&lt; 10</TableCell>
                      <TableCell>
                        {results.STRUCTURE_PREPARATION.descriptors.num_rotatable_bonds < 10 ? 
                          '✅ Good' : '⚠️ High'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>TPSA</TableCell>
                      <TableCell>{results.STRUCTURE_PREPARATION.descriptors.tpsa?.toFixed(2)}</TableCell>
                      <TableCell>&lt; 140 Å²</TableCell>
                      <TableCell>
                        {results.STRUCTURE_PREPARATION.descriptors.tpsa < 140 ? 
                          '✅ Good' : '⚠️ High'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="body1" sx={{ mt: 2 }}>
                Note: This is a protein structure, so drug-likeness rules (which are designed for small molecules) 
                may not apply directly. The analysis is provided for reference purposes.
              </Typography>
            </Box>
          ) : (
            <Typography>No analysis data available</Typography>
          )}
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          {stage === 'structure_preparation' && results?.STRUCTURE_PREPARATION ? (
            <BindingSiteViewer 
              workflowId={window.location.pathname.split('/').pop()} 
              pdbUrl={`/api/workflow/${window.location.pathname.split('/').pop()}/processed-structure`}
              style={{ width: '100%' }}
            />
          ) : (
            <Typography>Binding site analysis is only available after structure preparation</Typography>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}
