export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenId, price, wallet, authToken } = req.body;
    
    const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
    const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    const CONTRACT_ADDRESS = '0x397160Ad067BaaBa7f35Dd0b7A5C25F836b2539F';
    const MARKETPLACE_ADDRESS = '0xef77CDF9Dc521563270B6aBba379dbc3d389C08c';

    const { ethers } = require('ethers');
    
    const provider = new ethers.providers.JsonRpcProvider(
      `https://137.rpc.thirdweb.com/${CLIENT_ID}`
    );

    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

    const nftAbi = [
      'function balanceOf(address account, uint256 id) view returns (uint256)',
      'function isApprovedForAll(address owner, address operator) view returns (bool)',
      'function setApprovalForAll(address operator, bool approved) external',
    ];
    
    const nftContract = new ethers.Contract(CONTRACT_ADDRESS, nftAbi, provider);
    const balance = await nftContract.balanceOf(wallet, tokenId);
    
    if (balance.eq(0)) {
      return res.status(400).json({ error: 'You do not own this NFT' });
    }

    const isApproved = await nftContract.isApprovedForAll(wallet, MARKETPLACE_ADDRESS);
    
    if (!isApproved) {
      // Use Thirdweb API to send approval transaction as user
      const feeData = await provider.getFeeData();
      const maxFeePerGas = feeData.maxFeePerGas.mul(3);
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.lt(ethers.utils.parseUnits('30', 'gwei'))
        ? ethers.utils.parseUnits('30', 'gwei')
        : feeData.maxPriorityFeePerGas.mul(2);

      const nftWithSigner = new ethers.Contract(CONTRACT_ADDRESS, nftAbi, adminWallet);
      
      // Get approval tx data
      const approvalData = nftWithSigner.interface.encodeFunctionData('setApprovalForAll', [
        MARKETPLACE_ADDRESS, true
      ]);

      // Send via Thirdweb engine on behalf of user
      const approvalResponse = await fetch(
        `https://api.thirdweb.com/v1/wallets/embedded/send-transaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': CLIENT_ID,
            'x-secret-key': SECRET_KEY,
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            walletAddress: wallet,
            chainId: '137',
            transaction: {
              to: CONTRACT_ADDRESS,
              data: approvalData,
              value: '0',
              maxFeePerGas: maxFeePerGas.toString(),
              maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
              gasLimit: '100000',
            }
          }),
        }
      );
      
      const approvalResult = await approvalResponse.json();
      console.log('Approval result:', JSON.stringify(approvalResult).substring(0, 200));
      
      if (approvalResult.error) {
        return res.status(500).json({ error: 'Approval failed: ' + approvalResult.error });
      }
      
      // Wait a few seconds for approval to confirm
      await new Promise(r => setTimeout(r, 5000));
    }

    // Create listing with admin wallet
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas.mul(3);
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.lt(ethers.utils.parseUnits('30', 'gwei'))
      ? ethers.utils.parseUnits('30', 'gwei')
      : feeData.maxPriorityFeePerGas.mul(2);

    const priceInWei = ethers.utils.parseEther((parseFloat(price) / 0.07).toFixed(6));

    const marketAbi = [
      'function createListing(tuple(address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, bool reserved) params) external returns (uint256 listingId)',
    ];
    
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketAbi, adminWallet);
    const now = Math.floor(Date.now() / 1000);
    
    const tx = await marketplace.createListing({
      assetContract: CONTRACT_ADDRESS,
      tokenId,
      quantity: 1,
      currency: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      pricePerToken: priceInWei,
      startTimestamp: now,
      endTimestamp: now + (7 * 24 * 60 * 60),
      reserved: false,
    }, { maxFeePerGas, maxPriorityFeePerGas, gasLimit: 500000 });

    await tx.wait();
    
    return res.status(200).json({ success: true, txHash: tx.hash });

  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
