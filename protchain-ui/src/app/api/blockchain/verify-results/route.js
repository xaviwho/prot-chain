import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';

// PureChain configuration
const PURECHAIN_RPC_URL = 'https://purechainnode.com:8547';
const WORKFLOW_TRACKER_ADDRESS = process.env.WORKFLOW_TRACKER_ADDRESS;

// IPFS client
const ipfs = create({
  host: 'localhost',
  port: 5001,
  protocol: 'http'
});

// Workflow Tracker ABI (for verification)
const WORKFLOW_TRACKER_ABI = [
  {
    "inputs": [{"name": "workflowId", "type": "string"}],
    "name": "getWorkflowResults",
    "outputs": [
      {"name": "stage", "type": "string"},
      {"name": "ipfsHash", "type": "string"},
      {"name": "resultsHash", "type": "string"},
      {"name": "timestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export async function POST(request) {
  try {
    const { transactionHash, ipfsHash, workflowId } = await request.json();
    
    if (!transactionHash || !ipfsHash || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionHash, ipfsHash, workflowId' },
        { status: 400 }
      );
    }

    console.log(`Verifying results for workflow ${workflowId}...`);

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(PURECHAIN_RPC_URL);
    
    // Verify blockchain transaction
    let blockchainData = null;
    try {
      const receipt = await provider.getTransactionReceipt(transactionHash);
      if (!receipt) {
        return NextResponse.json({
          verified: false,
          message: 'Transaction not found on blockchain',
          workflowId
        });
      }

      blockchainData = {
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        timestamp: Date.now() / 1000 // Approximate timestamp
      };

      // Get actual block to get precise timestamp
      try {
        const block = await provider.getBlock(receipt.blockNumber);
        if (block) {
          blockchainData.timestamp = block.timestamp;
        }
      } catch (blockError) {
        console.warn('Could not fetch block details:', blockError.message);
      }

    } catch (blockchainError) {
      console.error('Blockchain verification error:', blockchainError);
      return NextResponse.json({
        verified: false,
        message: 'Failed to verify blockchain transaction: ' + blockchainError.message,
        workflowId
      });
    }

    // Verify IPFS data
    let ipfsData = null;
    try {
      const chunks = [];
      for await (const chunk of ipfs.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      ipfsData = JSON.parse(data);

      // Verify the IPFS data matches the workflow
      if (ipfsData.workflowId !== workflowId) {
        return NextResponse.json({
          verified: false,
          message: 'IPFS data workflow ID mismatch',
          workflowId,
          blockchainData
        });
      }

    } catch (ipfsError) {
      console.error('IPFS verification error:', ipfsError);
      return NextResponse.json({
        verified: false,
        message: 'Failed to verify IPFS data: ' + ipfsError.message,
        workflowId,
        blockchainData
      });
    }

    // Optional: Verify smart contract state
    let contractData = null;
    try {
      if (WORKFLOW_TRACKER_ADDRESS) {
        const contract = new ethers.Contract(WORKFLOW_TRACKER_ADDRESS, WORKFLOW_TRACKER_ABI, provider);
        const contractResults = await contract.getWorkflowResults(workflowId);
        
        contractData = {
          stage: contractResults[0],
          ipfsHash: contractResults[1],
          resultsHash: contractResults[2],
          timestamp: contractResults[3].toString()
        };

        // Verify contract data matches our verification
        if (contractData.ipfsHash !== ipfsHash) {
          return NextResponse.json({
            verified: false,
            message: 'Smart contract IPFS hash mismatch',
            workflowId,
            blockchainData,
            contractData
          });
        }
      }
    } catch (contractError) {
      console.warn('Smart contract verification failed:', contractError.message);
      // Don't fail verification if contract read fails, as transaction might still be valid
    }

    // All verifications passed
    return NextResponse.json({
      verified: true,
      message: 'Results successfully verified on blockchain and IPFS',
      workflowId,
      blockchainData,
      ipfsData: {
        workflowId: ipfsData.workflowId,
        stage: ipfsData.stage,
        timestamp: ipfsData.timestamp,
        type: ipfsData.type,
        version: ipfsData.version,
        resultsPreview: {
          num_residues: ipfsData.results?.details?.descriptors?.num_residues,
          num_chains: ipfsData.results?.details?.descriptors?.num_chains,
          num_atoms: ipfsData.results?.details?.descriptors?.num_atoms,
          molecular_weight: ipfsData.results?.details?.descriptors?.molecular_weight
        }
      },
      contractData,
      verificationTimestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify results' },
      { status: 500 }
    );
  }
}
