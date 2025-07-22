import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  const { id } = await Promise.resolve(params);
  
  console.log('Received request for processed structure with ID:', id);
  
  try {
    // Try multiple possible paths to find the processed PDB file
    const possiblePaths = [
      // Path relative to the Next.js app directory
      path.join(process.cwd(), '..', 'uploads', 'structures', id, 'processed.pdb'),
      // Absolute path (in case the relative path doesn't work)
      path.join('c:', 'Users', 'NSL', 'Downloads', 'prot-chain', 'uploads', 'structures', id, 'processed.pdb'),
      // Try with different casing
      path.join(process.cwd(), '..', 'Uploads', 'Structures', id, 'processed.pdb'),
    ];
    
    let pdbContent = null;
    let foundPath = null;
    
    // Try each path until we find one that exists
    for (const filePath of possiblePaths) {
      console.log('Checking for PDB file at:', filePath);
      if (fs.existsSync(filePath)) {
        console.log('Found PDB file at:', filePath);
        pdbContent = fs.readFileSync(filePath, 'utf8');
        foundPath = filePath;
        break;
      }
    }
    
    if (pdbContent) {
      console.log(`Successfully read PDB file from ${foundPath}, content length: ${pdbContent.length}`);
      // Return the PDB content as plain text
      return new Response(pdbContent, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
    
    return NextResponse.json(
      { error: 'Processed structure not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching processed structure:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processed structure' },
      { status: error.response?.status || 500 }
    );
  }
}
