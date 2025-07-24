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

    // Create a log file to track processing
    const logPath = join(workflowDir, 'structure_processing.log');
    const stats = fs.statSync(filePath);
    await writeFile(logPath, `Starting structure processing at ${new Date().toISOString()}\nFile size: ${stats.size} bytes\n`);

    // Save the bioapi workflow ID mapping (using frontend ID as bioapi ID for simplicity)
    const mappingPath = join(workflowDir, 'bioapi-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify({
      frontend_workflow_id: id,
      bioapi_workflow_id: id, // Use same ID for simplicity
      registered_at: new Date().toISOString()
    }, null, 2));

    // Process structure directly using bioapi structure endpoint (no workflow registration needed)
    const bioApiUrl = process.env.BIOAPI_URL || 'http://localhost:8000';
    const containerFilePath = join('/app/uploads', id, 'input.pdb').replace(/\\/g, '/');
    
    try {
      console.log('Calling bioapi structure endpoint:', `${bioApiUrl}/api/v1/workflows/${id}/structure`);
      
      // Send file_path to bioapi as expected by workflow structure endpoint
      const requestData = {
        file_path: containerFilePath
      };
      
      const response = await axios.post(
        `${bioApiUrl}/api/v1/workflows/${id}/structure`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('Bioapi structure processing response:', response.data);
      fs.appendFileSync(logPath, `Bioapi structure processing completed at ${new Date().toISOString()}\n`);
      
      // Save results from bioapi
      const resultsPath = join(workflowDir, 'results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(response.data, null, 2));
      console.log('Saved bioapi results to:', resultsPath);
      
      return NextResponse.json(response.data);
    } catch (bioApiError) {
      console.error('Bioapi structure processing failed:', {
        message: bioApiError.message,
        status: bioApiError.response?.status,
        statusText: bioApiError.response?.statusText,
        data: bioApiError.response?.data
      });
      
      fs.appendFileSync(logPath, `Bioapi error at ${new Date().toISOString()}: ${bioApiError.message}\n`);
      
      return NextResponse.json(
        { 
          error: 'Structure processing failed', 
          details: bioApiError.response?.data || bioApiError.message 
        },
        { status: 500 }
      );
    }
  } catch (error) {
      console.error('Error details:', error);
      
      // Log the error to the processing log file
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
        
        // Create a fallback result for timeout scenarios
        const fallbackResult = {
          status: 'timeout',
          message: 'Structure processing timed out but file was uploaded successfully',
          workflow_id: id,
          file_path: containerFilePath,
          processing_started: true
        };
        
        fs.appendFileSync(logPath, `Timeout fallback result created at ${new Date().toISOString()}\n`);
        
        return NextResponse.json(fallbackResult);
      }
      
      // For other errors, return the error details
      const errorResponse = {
        status: 'error',
        message: error.message || 'Unknown error occurred',
        workflow_id: id
      };
      
      if (error.response && error.response.data) {
        errorResponse.bioapi_error = error.response.data;
      }
      
      return NextResponse.json(errorResponse, { status: 500 });
    }
}