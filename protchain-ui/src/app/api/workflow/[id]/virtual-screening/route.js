import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Use the uploads directory instead of workflows
const workflowsDir = path.join(process.cwd(), '..', 'uploads');

export async function POST(request, { params }) {
    // Properly await params to resolve
    const { id } = await Promise.resolve(params);
    const workflowDir = path.join(workflowsDir, id);
    const resultsFilePath = path.join(workflowDir, 'results.json');
    
    // First verify the directory exists
    try {
        await fs.access(workflowDir);
    } catch (error) {
        console.error(`Workflow directory ${workflowDir} does not exist:`, error);
        return NextResponse.json(
            { error: `Workflow directory not found: ${id}` },
            { status: 404 }
        );
    }

    try {
        console.log(`Starting virtual screening for workflow: ${id}`);

        // Check if results.json exists
        let resultsData = {};
        try {
            const fileContent = await fs.readFile(resultsFilePath, 'utf-8');
            resultsData = JSON.parse(fileContent);
        } catch (error) {
            console.warn(`results.json not found for workflow ${id}, creating a new one.`);
        }

        // --- Placeholder for actual Virtual Screening Logic ---
        // TODO: Integrate with the actual backend virtual screening service
        // This might involve:
        // 1. Reading the processed PDB file from the workflow directory
        // 2. Reading binding site information from resultsData
        // 3. Specifying a compound library (this might come from the request body later)
        // 4. Calling the backend API/script
        // 5. Processing the results (e.g., top compounds, scores)

        console.log('Simulating virtual screening process...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

        // Example results structure
        const screeningResults = {
            status: 'completed',
            timestamp: new Date().toISOString(),
            top_compounds: [
                { id: 'CMPD001', score: -9.5, smiles: 'CCO' },
                { id: 'CMPD002', score: -9.2, smiles: 'CCC' },
                { id: 'CMPD003', score: -9.1, smiles: 'CCN' },
            ],
            // Add other relevant screening metadata here
        };
        // --- End Placeholder --- 

        // Update results.json with virtual screening results
        resultsData.virtual_screening = screeningResults;
        
        // Also update the workflow steps status
        if (!resultsData.steps) {
            resultsData.steps = [];
        }
        
        // Add or update the virtual_screening step
        const vsStepIndex = resultsData.steps.findIndex(step => step.id === 'virtual_screening');
        if (vsStepIndex >= 0) {
            resultsData.steps[vsStepIndex].status = 'completed';
        } else {
            resultsData.steps.push({
                id: 'virtual_screening',
                status: 'completed',
                name: 'Virtual Screening'
            });
        }

        try {
            await fs.writeFile(resultsFilePath, JSON.stringify(resultsData, null, 2));
            console.log(`Virtual screening results saved to ${resultsFilePath}`);
        } catch (writeError) {
            console.error(`Error writing results to ${resultsFilePath}:`, writeError);
            return NextResponse.json(
                { error: `Failed to save virtual screening results: ${writeError.message}` },
                { status: 500 }
            );
        }

        // Return the updated results
        return NextResponse.json(resultsData);

    } catch (error) {
        console.error(`Error during virtual screening for workflow ${id}:`, error);
        return NextResponse.json({ message: 'Error running virtual screening', error: error.message }, { status: 500 });
    }
}
