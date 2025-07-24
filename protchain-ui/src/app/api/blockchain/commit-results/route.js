import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// PureChain configuration
const PURECHAIN_RPC_URL = 'https://purechainnode.com:8547';
const CHAIN_ID = 900520900520;

// Contract configuration (from .env)
const WORKFLOW_TRACKER_ADDRESS = process.env.WORKFLOW_TRACKER_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Workflow Tracker ABI (simplified for result commits)
const WORKFLOW_TRACKER_ABI = [
  {
    "inputs": [
      {"name": "workflowId", "type": "string"},
      {"name": "stage", "type": "string"},
      {"name": "ipfsHash", "type": "string"},
      {"name": "resultsHash", "type": "string"}
    ],
    "name": "commitResults",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
    const { workflowId, ipfsHash, resultsHash, stage } = await request.json();
    
    if (!workflowId || !ipfsHash || !resultsHash || !stage) {
      return NextResponse.json(
        { error: 'Missing required fields: workflowId, ipfsHash, resultsHash, stage' },
        { status: 400 }
      );
    }

    if (!WORKFLOW_TRACKER_ADDRESS || !PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Blockchain configuration missing. Check environment variables.' },
        { status: 500 }
      );
    }

    // Initialize provider and wallet (ethers v5 syntax) with PureChain network config
    const provider = new ethers.providers.JsonRpcProvider({
      url: PURECHAIN_RPC_URL,
      timeout: 30000
    }, {
      name: 'purechain',
      chainId: CHAIN_ID
    });
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Initialize contract
    const contract = new ethers.Contract(WORKFLOW_TRACKER_ADDRESS, WORKFLOW_TRACKER_ABI, wallet);

    console.log(`Committing results to blockchain for workflow ${workflowId}...`);

    // Call the smart contract to commit results
    const transaction = await contract.commitResults(
      workflowId,
      stage,
      ipfsHash,
      resultsHash
    );

    console.log('Transaction submitted:', transaction.hash);

    // Wait for transaction confirmation
    const receipt = await transaction.wait();
    
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    return NextResponse.json({
      success: true,
      transactionHash: transaction.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString(),
      workflowId,
      stage,
      ipfsHash,
      resultsHash
    });

  } catch (error) {
    console.error('Blockchain commit error:', error);
    
    // Handle specific blockchain errors
    if (error.code === 'NETWORK_ERROR') {
      return NextResponse.json(
        { error: 'Unable to connect to PureChain network. Please check network connectivity.' },
        { status: 503 }
      );
    }
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json(
        { error: 'Insufficient funds for blockchain transaction.' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to commit to blockchain' },
      { status: 500 }
    );
  }
}
