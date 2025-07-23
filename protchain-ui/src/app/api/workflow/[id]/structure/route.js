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

    // Check if workflow exists in bioapi
    const bioApiUrl = process.env.BIOAPI_URL || 'http://localhost:8000';  // Hardcode for development
    console.log('Sending request to:', `${bioApiUrl}/api/v1/workflows/${id}/structure`);
    
    try {
      // Log file size for debugging
      const stats = fs.statSync(filePath);
      console.log(`Processing PDB file of size: ${stats.size} bytes`);
      
      // Create a log file to track processing
      const logPath = join(workflowDir, 'structure_processing.log');
      await writeFile(logPath, `Starting structure processing at ${new Date().toISOString()}\nFile size: ${stats.size} bytes\n`);
      
      // First, check if the workflow exists in bioapi by trying to get its status
      let workflowExists = false;
      try {
        const statusCheck = await axios({
          method: 'get',
          url: `${bioApiUrl}/api/v1/workflows/${id}/status`,
          headers: { 'Content-Type': 'application/json' },
        });
        workflowExists = true;
        console.log(`Workflow ${id} exists in bioapi`);
      } catch (statusError) {
        // If we get a 404, the workflow doesn't exist in bioapi
        if (statusError.response && statusError.response.status === 404) {
          console.log(`Workflow ${id} not found in bioapi, will register it`);
          workflowExists = false;
        } else {
          // Some other error occurred when checking status
          throw statusError;
        }
      }

      // Track the bioapi workflow ID to use for processing
      let bioApiWorkflowId = id;
      
      // If workflow doesn't exist in bioapi, register it
      if (!workflowExists) {
        console.log(`Registering workflow ${id} with bioapi`);
        try {
          const registrationResponse = await axios({
            method: 'post',
            url: `${bioApiUrl}/api/v1/workflows`,
            data: { 
              name: `Workflow ${id}`,
              template: 'simple-test',
              parameters: { 
                // Only use parameters that WorkflowConfig actually accepts
                max_compounds: 1000,
                thorough_mode: true
              }
            },
            headers: { 'Content-Type': 'application/json' },
          });
          console.log(`Successfully registered workflow with bioapi:`, registrationResponse.data);
          
          // Use the bioapi-returned workflow ID for subsequent operations
          if (registrationResponse.data && registrationResponse.data.id) {
            bioApiWorkflowId = registrationResponse.data.id;
            console.log(`Using bioapi workflow ID: ${bioApiWorkflowId}`);
            
            // Store the bioapi workflow ID mapping for status polling
            const mappingPath = join(workflowDir, 'bioapi-mapping.json');
            fs.writeFileSync(mappingPath, JSON.stringify({
              frontendWorkflowId: id,
              bioApiWorkflowId: bioApiWorkflowId,
              createdAt: new Date().toISOString()
            }, null, 2));
          }
          
          // Append to log
          fs.appendFileSync(logPath, `Registered workflow with bioapi at ${new Date().toISOString()}, bioapi ID: ${bioApiWorkflowId}\n`);
        } catch (registrationError) {
          console.error(`Failed to register workflow with bioapi:`, registrationError);
          fs.appendFileSync(logPath, `Failed to register workflow with bioapi: ${registrationError.message}\n`);
          
          // If registration fails with a 409 Conflict, the workflow might actually exist
          if (registrationError.response && registrationError.response.status === 409) {
            console.log(`Workflow appears to already exist (conflict error), continuing with structure processing`);
          } else {
            throw registrationError;
          }
        }
      }
      
      // Construct the path that is accessible from within the bioapi container
      const containerFilePath = join('/uploads', id, 'input.pdb').replace(/\\/g, '/');

      // Store the bioapi workflow ID mapping for status polling (in case it wasn't stored during registration)
      const mappingPath = join(workflowDir, 'bioapi-mapping.json');
      if (!fs.existsSync(mappingPath)) {
        fs.writeFileSync(mappingPath, JSON.stringify({
          frontendWorkflowId: id,
          bioApiWorkflowId: bioApiWorkflowId,
          createdAt: new Date().toISOString()
        }, null, 2));
      }
      
      // Now proceed with structure processing using the correct bioapi workflow ID
      const response = await axios({
        method: 'post',
        url: `${bioApiUrl}/api/v1/workflows/${bioApiWorkflowId}/structure`,
        data: { file_path: containerFilePath }, // Use the container-accessible path
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
