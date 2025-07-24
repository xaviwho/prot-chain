import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }

    console.log('Processing binding site analysis for workflow:', id);
    
    // Call bioapi binding site analysis endpoint
    const bioapiResponse = await fetch(`http://localhost:8000/api/v1/workflows/${id}/binding-sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: `/app/uploads/${id}/input.pdb`
      })
    });

    if (!bioapiResponse.ok) {
      const errorText = await bioapiResponse.text();
      console.error('Bioapi binding site analysis error:', errorText);
      return NextResponse.json(
        { error: `Bioapi binding site analysis failed: ${errorText}` },
        { status: bioapiResponse.status }
      );
    }

    const results = await bioapiResponse.json();
    console.log('Binding site analysis results:', results);

    // Save results to workflow directory
    const fs = require('fs');
    const path = require('path');
    
    try {
      const rootDir = path.resolve(process.cwd(), '..');
      const uploadsDir = path.join(rootDir, 'uploads', id);
      const resultsPath = path.join(uploadsDir, 'binding_site_results.json');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.log('Binding site results saved to:', resultsPath);
    } catch (saveError) {
      console.error('Failed to save binding site results:', saveError);
    }

    return NextResponse.json({
      success: true,
      results: results,
      message: 'Binding site analysis completed successfully'
    });

  } catch (error) {
    console.error('Binding site analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process binding site analysis' },
      { status: 500 }
    );
  }
}