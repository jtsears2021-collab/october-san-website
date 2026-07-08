const { ethers } = require('ethers');

const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = '0x397160Ad067BaaBa7f35Dd0b7A5C25F836b2539F';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { metadataURI, recipientAddress } = req.body;

  if (!metadataURI || !recipientAddress) {
    return res.status(400).json({ error: 'Missing metadataURI or recipientAddress' });
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(
      `https://137.rpc.thirdweb.com/${CLIENT_ID}`
    );

    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

    const abi = [
      'function mintTo(address to, uint256 tokenId, string calldata uri, uint256 amount) external',
    ];

    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

    const feeData = await provider.getFeeData();
    const baseFee = feeData.maxFeePerGas || ethers.utils.parseUnits('300', 'gwei');
    const priorityFee = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits('30', 'gwei');
    const maxFeePerGas = baseFee.mul(3);
    const maxPriorityFeePerGas = priorityFee.lt(ethers.utils.parseUnits('30', 'gwei'))
      ? ethers.utils.parseUnits('30', 'gwei')
      : priorityFee.mul(2);

    const tx = await contract.mintTo(
      recipientAddress,
      ethers.constants.MaxUint256,
      metadataURI,
      1,
      { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 500000 }
    );

    await tx.wait();

    return res.status(200).json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error('Mint error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
