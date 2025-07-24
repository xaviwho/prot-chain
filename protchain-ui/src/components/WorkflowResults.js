'use client';

import { useState } from 'react';
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
  CircularProgress,
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
  const [blockchainCommitted, setBlockchainCommitted] = useState(false);
  const [ipfsHash, setIpfsHash] = useState(null);
  const [blockchainTxHash, setBlockchainTxHash] = useState(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [currentTab, setCurrentTab] = useState(activeTab);
  const params = useParams();

  console.log('🔍 WorkflowResults component received:');
  console.log('  - results:', JSON.stringify(results, null, 2));
  console.log('  - stage:', stage);
  console.log('  - activeTab:', activeTab);
  console.log('  - results type:', typeof results);
  console.log('  - results is null?', results === null);
  console.log('  - results is undefined?', results === undefined);

  const commitToBlockchain = async () => {
    if (!results || !params.id) return;

    setCommitLoading(true);
    try {
      const ipfsResponse = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          workflowId: params.id,
          results: results,
          timestamp: new Date().toISOString(),
          stage: stage,
        }),
      });

      if (!ipfsResponse.ok) {
        throw new Error('Failed to upload to IPFS');
      }

      const ipfsData = await ipfsResponse.json();
      setIpfsHash(ipfsData.hash);

      const blockchainResponse = await fetch('/api/blockchain/commit-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          workflowId: params.id,
          ipfsHash: ipfsData.hash,
          resultsHash: generateResultsHash(results),
          stage: stage,
        }),
      });

      if (!blockchainResponse.ok) {
        throw new Error('Failed to commit to blockchain');
      }

      const blockchainData = await blockchainResponse.json();
      setBlockchainTxHash(blockchainData.transactionHash);
      setBlockchainCommitted(true);
    } catch (error) {
      console.error('Error committing to blockchain:', error);
      alert('Failed to commit results to blockchain: ' + error.message);
    } finally {
      setCommitLoading(false);
    }
  };

  const verifyResults = async () => {
    if (!blockchainTxHash || !ipfsHash) return;

    setVerifyLoading(true);
    try {
      const verifyResponse = await fetch('/api/blockchain/verify-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          transactionHash: blockchainTxHash,
          ipfsHash: ipfsHash,
          workflowId: params.id,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify results');
      }

      const verifyData = await verifyResponse.json();
      setVerificationResult(verifyData);
    } catch (error) {
      console.error('Error verifying results:', error);
      alert('Failed to verify results: ' + error.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const generateResultsHash = (results) => {
    return btoa(JSON.stringify(results)).slice(0, 32);
  };

  const handleDownloadResults = () => {
    if (!results) {
      console.log('No results available for download');
      return;
    }

    try {
      // Extract structure data based on stage
      let structureData = {};
      if (stage === 'structure_preparation' && results.details?.descriptors) {
        structureData = results.details.descriptors;
      } else if (results.STRUCTURE_PREPARATION?.descriptors) {
        structureData = results.STRUCTURE_PREPARATION.descriptors;
      } else if (results.structure_preparation?.descriptors) {
        structureData = results.structure_preparation.descriptors;
      }

      // Create CSV content
      const csvHeader = 'Property,Value\n';
      const csvRows = Object.entries(structureData).map(([key, value]) => {
        const propertyName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const propertyValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                            (typeof value === 'number' ? value.toFixed(2) : value);
        return `"${propertyName}","${propertyValue}"`;
      }).join('\n');

      // Add metadata header
      const metadata = [
        `"Workflow ID","${params.id}"`,
        `"Analysis Stage","${stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}"`,
        `"Generated On","${new Date().toISOString()}"`,
        `"Status","${results.status || 'Completed'}"`,
        '',  // Empty line separator
        '"Structure Analysis Results"',
        csvHeader.trim()
      ].join('\n');

      const csvContent = metadata + '\n' + csvRows;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-${params.id}-${stage}-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('CSV results downloaded successfully');
    } catch (error) {
      console.error('Error downloading CSV results:', error);
    }
  };

  const renderStructurePreparation = (data) => {
    console.log('Structure preparation data:', data);
    let structureData = {};

    if (typeof data === 'object' && data !== null) {
      if (data.details && data.details.descriptors) {
        console.log('Found bioapi format with details.descriptors');
        structureData = data.details.descriptors;
      } else if (data.STRUCTURE_PREPARATION && data.STRUCTURE_PREPARATION.descriptors) {
        console.log('Found STRUCTURE_PREPARATION.descriptors format');
        structureData = data.STRUCTURE_PREPARATION.descriptors;
      } else if (data.atom_count || data.residue_count || data.chain_count) {
        console.log('Found direct properties format');
        structureData = {
          num_atoms: data.atom_count,
          num_residues: data.residue_count,
          num_chains: data.chain_count,
          hetatm_count: data.hetatm_count,
          has_hydrogens: data.has_hydrogens,
          has_ligands: data.has_ligands,
        };
      } else if (data.structure_preparation && data.structure_preparation.descriptors) {
        console.log('Found structure_preparation.descriptors format');
        structureData = data.structure_preparation.descriptors;
      }
    }

    console.log('Extracted structure data:', structureData);

    if (Object.keys(structureData).length === 0) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Structure Preparation Results
          </Typography>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No structure analysis results available
            </Typography>
          </Paper>
        </Box>
      );
    }

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
                {Object.entries(structureData).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableCell>
                    <TableCell>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (typeof value === 'number' ? value.toFixed(2) : value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleDownloadResults}
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2 30%, #0288D1 90%)',
                  },
                }}
              >
                Download Results
              </Button>

              {!blockchainCommitted ? (
                <Button
                  variant="contained"
                  color="success"
                  onClick={commitToBlockchain}
                  disabled={commitLoading}
                  sx={{
                    background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #388E3C 30%, #689F38 90%)',
                    },
                  }}
                >
                  {commitLoading ? <CircularProgress size={24} /> : 'Commit to Blockchain'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="info"
                  onClick={verifyResults}
                  disabled={verifyLoading}
                  sx={{
                    background: 'linear-gradient(45deg, #00BCD4 30%, #009688 90%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #0097A7 30%, #00796B 90%)',
                    },
                  }}
                >
                  {verifyLoading ? <CircularProgress size={24} /> : 'Verify'}
                </Button>
              )}
            </Box>

            {blockchainCommitted && ipfsHash && blockchainTxHash && (
              <Paper sx={{ p: 2, mt: 2, backgroundColor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                  Blockchain & IPFS Records
                </Typography>
                <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  <Typography variant="body2"><strong>IPFS Hash:</strong> {ipfsHash}</Typography>
                  <Typography variant="body2"><strong>Blockchain Tx:</strong> {blockchainTxHash}</Typography>
                </Box>
              </Paper>
            )}

            {verificationResult && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: verificationResult.verified ? 'rgba(46, 125, 50, 0.1)' : 'rgba(255, 167, 38, 0.1)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: verificationResult.verified ? 'success.main' : 'warning.main' }}>
                  {verificationResult.verified ? '✅ Verification Successful' : '⚠️ Verification Failed'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{verificationResult.message}</Typography>
                {verificationResult.blockchainData && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <Typography variant="caption" display="block">
                      Block: {verificationResult.blockchainData.blockNumber}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Timestamp: {new Date(verificationResult.blockchainData.timestamp * 1000).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderBindingSites = (data) => {
    console.log('Rendering binding sites with data:', data);
    let bindingSites = [];

    if (data?.binding_sites && Array.isArray(data.binding_sites) && data.binding_sites.length > 0) {
      console.log('Found binding sites in data.binding_sites');
      bindingSites = data.binding_sites;
    } else if (data?.binding_site_analysis?.binding_sites && Array.isArray(data.binding_site_analysis.binding_sites) && data.binding_site_analysis.binding_sites.length > 0) {
      console.log('Found binding sites in data.binding_site_analysis.binding_sites');
      bindingSites = data.binding_site_analysis.binding_sites;
    }

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
            <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Binding Site Analysis Results
        </Typography>

        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            3D Visualization
          </Typography>
          <Box sx={{ height: '500px', mb: 2, border: '1px solid #eee', borderRadius: 1 }}>
            <BindingSite3DViewer workflowId={params.id} bindingSites={bindingSites} />
          </Box>
        </Paper>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
          Binding Site Details
        </Typography>
        {bindingSites.map((site, index) => (
          <Accordion key={index} sx={{ mb: 2, '&:before': { display: 'none' }, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{ backgroundColor: '#f8f9fa' }}>
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
                      <TableCell>({site.center.x.toFixed(2)}, {site.center.y.toFixed(2)}, {site.center.z.toFixed(2)})</TableCell>
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

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<Download />} onClick={handleDownloadResults} sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}>
            Download Results
          </Button>
        </Box>
      </Box>
    );
  };

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
    console.log('Rendering Virtual Screening Results with data:', data);

    if (!data || data.status !== 'completed') {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Virtual Screening Analysis
          </Typography>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {data ? `Status: ${data.status}` : 'No data available.'}
            </Typography>
            {data && data.status === 'running' && <LinearProgress sx={{ mb: 2 }} />}
            <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
              Check Status
            </Button>
          </Paper>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Virtual Screening Top Compounds
        </Typography>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Compound ID</TableCell>
                  <TableCell>Docking Score</TableCell>
                  <TableCell>SMILES</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.top_compounds.map((compound) => (
                  <TableRow key={compound.id}>
                    <TableCell>{compound.id}</TableCell>
                    <TableCell>{compound.score.toFixed(3)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{compound.smiles}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined">View 3D</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<Download />} onClick={handleDownloadResults} sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#1565c0' } }}>
              Download Report
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderStageResults = () => {
    console.log('Rendering results for stage:', stage, 'with data:', results);

    if (!results) {
      return <Typography>No results available for this workflow.</Typography>;
    }

    switch (stage) {
      case 'structure_preparation':
        // Check for bioapi format (details.descriptors) or legacy formats
        return (results.details?.descriptors || results.STRUCTURE_PREPARATION || results.structure_preparation) ? 
          renderStructurePreparation(results) : 
          <Typography>No structure preparation results available.</Typography>;
      case 'binding_site_analysis':
        return (results.binding_site_analysis || results.binding_sites) ? renderBindingSites(results) : <Typography>No binding site analysis results available.</Typography>;
      case 'virtual_screening':
        return results.virtual_screening ? renderVirtualScreeningResults(results.virtual_screening) : <Typography>No virtual screening results available.</Typography>;
      case 'molecular_dynamics':
        return results.molecular_dynamics ? renderMDResults(results.molecular_dynamics) : <Typography>No molecular dynamics results available.</Typography>;
      case 'lead_optimization':
        return results.lead_optimization ? renderOptimizationResults(results.lead_optimization) : <Typography>No lead optimization results available.</Typography>;
      default:
        if (results.structure_preparation || results.STRUCTURE_PREPARATION) return renderStructurePreparation(results);
        if (results.binding_site_analysis) return renderBindingSites(results.binding_site_analysis);
        if (results.virtual_screening) return renderVirtualScreeningResults(results.virtual_screening);
        return <Typography>Select a valid stage to view results.</Typography>;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={currentTab} onChange={(e, val) => setCurrentTab(val)} variant="fullWidth">
          <Tab label="Results" />
          <Tab label="Visualization" />
          <Tab label="Analysis" />
        </Tabs>
        <TabPanel value={currentTab} index={0}>
          {renderStageResults()}
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ height: 400 }}>
            {stage === 'structure_preparation' && results?.STRUCTURE_PREPARATION ? (
              <PDBViewer workflowId={params.id} style={{ width: '100%', height: '100%' }} />
            ) : stage === 'binding_site_analysis' && (results?.binding_site_analysis || results?.binding_sites) ? (
              <BindingSite3DViewer workflowId={params.id} bindingSites={results.binding_site_analysis?.binding_sites || results.binding_sites} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="body1">Visualization will appear here once results are generated.</Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          {stage === 'structure_preparation' && results?.STRUCTURE_PREPARATION?.descriptors ? (
            <p>Structure Analysis / Drug-likeness content goes here.</p>
          ) : (
            <Typography>No analysis data available for this stage.</Typography>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}

