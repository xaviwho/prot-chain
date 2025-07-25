import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    console.log('Processing REAL binding site analysis for workflow:', id);
    
    // Get the uploads directory path (in root directory, not protchain-ui)
    const rootDir = path.resolve(process.cwd(), '..');
    const uploadsDir = path.join(rootDir, 'uploads', id);
    console.log('DEBUG: uploadsDir:', uploadsDir);
    
    // Check if PDB file exists
    const pdbPath = path.join(uploadsDir, 'input.pdb');
    if (!fs.existsSync(pdbPath)) {
      return NextResponse.json({ 
        error: 'PDB file not found. Please run structure preparation first.' 
      }, { status: 400 });
    }
    
    // Read PDB content
    const pdbContent = fs.readFileSync(pdbPath, 'utf8');
    
    // Call REAL bioapi binding site analysis
    console.log('Calling REAL bioapi binding site analysis...');
    const bioApiResponse = await fetch('http://localhost:8000/api/v1/binding/direct-binding-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: id,
        pdb_content: pdbContent,
        wsl_path: `/app/uploads/${id}`
      })
    });
    
    if (!bioApiResponse.ok) {
      throw new Error(`BioAPI request failed: ${bioApiResponse.status} ${bioApiResponse.statusText}`);
    }
    
    const bioApiResult = await bioApiResponse.json();
    console.log('REAL bioapi binding site analysis result:', bioApiResult);
    
    // Wait for bioapi to complete processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // The bioapi returns results directly in the response, not in a file
    // Check if bioapi result already contains binding sites
    if (bioApiResult && bioApiResult.binding_sites) {
      console.log('Found REAL binding site results in bioapi response:', bioApiResult);
      return NextResponse.json({
        status: 'success',
        message: 'REAL binding site analysis completed successfully',
        binding_sites: bioApiResult.binding_sites,
        method: bioApiResult.method || 'real_geometric_cavity_detection',
        protein_atoms_count: bioApiResult.protein_atoms_count
      });
    }
    
    // Also try reading from results file as backup
    const resultsPath = path.join(uploadsDir, 'results.json');
    let bindingSiteResults = null;
    
    if (fs.existsSync(resultsPath)) {
      try {
        const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        bindingSiteResults = resultsData.binding_site_analysis;
        console.log('Found REAL binding site results in file:', bindingSiteResults);
      } catch (error) {
        console.error('Error reading binding site results:', error);
      }
    }
    
    // Return real binding site analysis results from file
    if (bindingSiteResults && bindingSiteResults.binding_sites) {
      return NextResponse.json({
        status: 'success',
        message: 'REAL binding site analysis completed successfully',
        binding_sites: bindingSiteResults.binding_sites,
        method: bindingSiteResults.method || 'real_geometric_cavity_detection'
      });
    } else {
      return NextResponse.json({ 
        error: 'Binding site analysis failed or no results found',
        debug_info: {
          bioapi_response: bioApiResult,
          results_file_exists: fs.existsSync(resultsPath),
          uploads_dir: uploadsDir
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in binding site analysis:', error);
    return NextResponse.json({ 
      error: 'Internal server error during binding site analysis',
      details: error.message 
    }, { status: 500 });
  }
}