const { ethers } = require('ethers');
const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = '0xfe597C525A68c7150B3923fCfc8Fbf22b95806b1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  console.log('Mint API called:', req.method, req.body);

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
      'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
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
    const receipt = await tx.wait();
    console.log('Receipt events:', JSON.stringify(receipt.events?.map(e => ({ event: e.event, args: e.args }))));
    const transferEvent = receipt.events?.find(e => e.event === 'TransferSingle');
    const tokenId = transferEvent?.args?.id?.toString() || null;
    return res.status(200).json({ success: true, txHash: tx.hash, tokenId });
  } catch (err) {
    console.error('Mint error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
