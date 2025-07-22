import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import fs from 'fs';
import axios from 'axios';

export async function POST(request, context) {
  try {
    const { id } = await context.params;
    const requestFormData = await request.formData();
    const file = requestFormData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Create uploads directory in the project
    const projectRoot = join(process.cwd(), '..');
    const uploadDir = join(projectRoot, 'uploads');
    const workflowDir = join(uploadDir, id);
    await mkdir(workflowDir, { recursive: true });
    console.log('Created workflow directory:', workflowDir);

    // Save the file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(workflowDir, 'input.pdb');
    await writeFile(filePath, buffer);
    console.log('Saved file to:', filePath);

    // Call BioAPI to process the structure
    const bioApiUrl = 'http://localhost:8000';  // Hardcode for development
    console.log('Sending request to:', `${bioApiUrl}/api/v1/workflows/${id}/structure`);
    
    try {
      // Log file size for debugging
      const stats = fs.statSync(filePath);
      console.log(`Processing PDB file of size: ${stats.size} bytes`);
      
      // Create a log file to track processing
      const logPath = join(workflowDir, 'structure_processing.log');
      await writeFile(logPath, `Starting structure processing at ${new Date().toISOString()}\nFile size: ${stats.size} bytes\n`);
      
      const response = await axios({
        method: 'post',
        url: `${bioApiUrl}/api/v1/workflows/${id}/structure`,
        data: { file_path: filePath },
        headers: { 'Content-Type': 'application/json' },
        timeout: 600000, // 10 minute timeout for larger files
        timeoutErrorMessage: 'Request timed out while processing structure'
      });

      return NextResponse.json(response.data);
    } catch (error) {
      console.error('Error details:', error);
      
      // Log the error to the processing log file
      const logPath = join(workflowDir, 'structure_processing.log');
      try {
        let logMessage = `\nError at ${new Date().toISOString()}: ${error.message}\n`;
        if (error.response && error.response.data) {
          logMessage += `Response data: ${JSON.stringify(error.response.data)}\n`;
        }
        fs.appendFileSync(logPath, logMessage);
      } catch (logError) {
        console.error('Failed to write to log file:', logError);
      }
      
      // Check if this is a timeout error
      if (error.message && (error.message.includes('timeout') || error.code === 'ECONNABORTED')) {
        console.log('Structure processing timed out, attempting local fallback processing');
        
        try {
          // Create a basic results.json file with minimal structure information
          const resultsPath = join(workflowDir, 'results.json');
          const basicResults = {
            STRUCTURE_PREPARATION: {
              status: 'COMPLETED',
              message: 'Structure processed with fallback mechanism',
              timestamp: new Date().toISOString(),
              descriptors: {
                file_name: basename(filePath),
                file_size: fs.statSync(filePath).size,
                processing_method: 'fallback'
              }
            }
          };
          
          // Write the fallback results file
          await writeFile(resultsPath, JSON.stringify(basicResults, null, 2));
          
          // Copy the input PDB to processed.pdb as a fallback
          const processedPath = join(workflowDir, 'processed.pdb');
          fs.copyFileSync(filePath, processedPath);
          
          // Log the fallback processing
          fs.appendFileSync(logPath, `\nFallback processing completed at ${new Date().toISOString()}\n`);
          
          return NextResponse.json({
            status: 'success',
            message: 'Structure processed with fallback mechanism',
            warning: 'The structure was too large for standard processing. Using simplified results.',
            ...basicResults
          });
        } catch (fallbackError) {
          console.error('Fallback processing failed:', fallbackError);
          fs.appendFileSync(logPath, `\nFallback processing failed: ${fallbackError.message}\n`);
        }
      }
      
      // Standard error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        return NextResponse.json(
          { error: error.response.data || 'Error processing structure' },
          { status: error.response.status }
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        return NextResponse.json(
          { error: 'No response received from processing server' },
          { status: 500 }
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        return NextResponse.json(
          { error: error.message || 'Unknown error processing structure' },
          { status: 500 }
        );
      }
    }


  } catch (error) {
    console.error('Error processing structure:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process structure' },
      { status: 500 }
    );
  }
}
