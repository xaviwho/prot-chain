import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getWorkflowPath, getWorkflowFilePath } from '../../../../../utils/pathUtils';

/**
 * GET handler for refreshing workflow results
 * This endpoint forces a reload of the results.json file
 */
export async function GET(request, { params }) {
  // Fix for Next.js warning - await params before destructuring
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  
  try {
    // Get the workflow directory path
    const workflowDir = getWorkflowPath(id);
    const resultsPath = getWorkflowFilePath(id, 'results.json');
    
    console.log(`Refreshing results for workflow: ${id}`);
    console.log(`Results path: ${resultsPath}`);
    
    // Check if the results file exists
    if (!fs.existsSync(resultsPath)) {
      return NextResponse.json(
        { error: 'Results file not found' },
        { status: 404 }
      );
    }
    
    // Read the results file
    const resultsContent = fs.readFileSync(resultsPath, 'utf8');
    let resultsData = {};
    
    try {
      resultsData = JSON.parse(resultsContent);
      console.log('Successfully parsed results.json');
    } catch (error) {
      console.error('Error parsing results file:', error);
      return NextResponse.json(
        { error: 'Invalid results file format' },
        { status: 500 }
      );
    }
    
    // Return the results
    return NextResponse.json({
      status: 'success',
      message: 'Results refreshed successfully',
      ...resultsData
    });
    
  } catch (error) {
    console.error('Error refreshing results:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh results' },
      { status: 500 }
    );
  }
}
