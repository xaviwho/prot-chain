import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
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
      console.log('Local results.json not found, attempting to fetch from bioapi');
      
      // Try to get bioapi workflow ID from mapping file
      const mappingPath = getWorkflowFilePath(id, 'bioapi-mapping.json');
      if (fs.existsSync(mappingPath)) {
        try {
          const mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
          const bioApiWorkflowId = mappingData.bioApiWorkflowId;
          
          if (bioApiWorkflowId) {
            console.log(`Fetching results from bioapi for workflow: ${bioApiWorkflowId}`);
            
            // Fetch results from bioapi
            const bioApiUrl = process.env.BIOAPI_URL || 'http://localhost:8000';
            const bioApiResponse = await axios({
              method: 'get',
              url: `${bioApiUrl}/api/v1/workflows/${bioApiWorkflowId}/results`,
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000
            });
            
            if (bioApiResponse.data) {
              console.log('Successfully fetched results from bioapi');
              
              // Save the results locally for future use
              fs.writeFileSync(resultsPath, JSON.stringify(bioApiResponse.data, null, 2));
              
              // Return the bioapi results
              return NextResponse.json({
                status: 'success',
                message: 'Results fetched from bioapi',
                ...bioApiResponse.data
              });
            }
          }
        } catch (bioApiError) {
          console.error('Failed to fetch results from bioapi:', bioApiError.message);
          // Continue to return 404 if bioapi fetch fails
        }
      }
      
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
