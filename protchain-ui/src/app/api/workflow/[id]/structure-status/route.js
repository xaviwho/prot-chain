import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getWorkflowPath, getWorkflowFilePath } from '../../../../../utils/pathUtils';

/**
 * GET handler for checking structure processing status
 * This endpoint checks if the structure processing has completed
 */
export async function GET(request, { params }) {
  // Fix for Next.js warning - await params before destructuring
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;
  
  try {
    // Get the workflow directory path
    const workflowDir = getWorkflowPath(id);
    const inputPdbPath = getWorkflowFilePath(id, 'input.pdb');
    const processedPdbPath = getWorkflowFilePath(id, 'processed.pdb');
    const resultsPath = getWorkflowFilePath(id, 'results.json');
    
    console.log(`Checking structure processing status for workflow: ${id}`);
    
    // Check if input file exists and get its size
    let inputFileSize = 0;
    if (fs.existsSync(inputPdbPath)) {
      const stats = fs.statSync(inputPdbPath);
      inputFileSize = stats.size;
      console.log(`Input PDB file size: ${inputFileSize} bytes`);
    }
    
    // Check if the processed PDB file exists
    const processedPdbExists = fs.existsSync(processedPdbPath);
    
    // Check if the results file exists
    const resultsFileExists = fs.existsSync(resultsPath);
    
    // If both files exist, structure processing is complete
    if (processedPdbExists && resultsFileExists) {
      // Read the results file
      const resultsContent = fs.readFileSync(resultsPath, 'utf8');
      let resultsData = {};
      
      try {
        resultsData = JSON.parse(resultsContent);
        console.log('Successfully parsed results.json');
        
        return NextResponse.json({
          status: 'COMPLETED',
          message: 'Structure processing completed',
          results: resultsData
        });
      } catch (error) {
        console.error('Error parsing results file:', error);
        return NextResponse.json({
          status: 'ERROR',
          message: 'Error parsing results file'
        });
      }
    }
    
    // Check if there's a log file that might indicate an error
    const logPath = getWorkflowFilePath(id, 'structure_processing.log');
    if (fs.existsSync(logPath)) {
      try {
        const logContent = fs.readFileSync(logPath, 'utf8');
        if (logContent.includes('ERROR') || logContent.includes('Exception')) {
          return NextResponse.json({
            status: 'ERROR',
            message: 'Error detected in processing log',
            log: logContent.slice(-500) // Return the last 500 characters of the log
          });
        }
      } catch (logError) {
        console.error('Error reading log file:', logError);
      }
    }
    
    // If only the processed PDB file exists, structure processing is partially complete
    if (processedPdbExists) {
      return NextResponse.json({
        status: 'PROCESSING',
        message: 'Structure processed, waiting for results',
        fileSize: inputFileSize
      });
    }
    
    // If input file is very large, provide a warning
    if (inputFileSize > 5 * 1024 * 1024) { // More than 5MB
      return NextResponse.json({
        status: 'PROCESSING',
        message: 'Processing large PDB file, this may take longer than usual',
        fileSize: inputFileSize
      });
    }
    
    // If neither file exists, structure processing is still in progress
    return NextResponse.json({
      status: 'PENDING',
      message: 'Structure processing in progress',
      fileSize: inputFileSize
    });
    
  } catch (error) {
    console.error('Error checking structure processing status:', error);
    return NextResponse.json(
      { 
        status: 'ERROR',
        error: 'Failed to check structure processing status' 
      },
      { status: 500 }
    );
  }
}
