import { ethers } from 'ethers';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenId, price, wallet } = req.body;
    
    const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
    const CONTRACT_ADDRESS = '0xfe597C525A68c7150B3923fCfc8Fbf22b95806b1';
    const MARKETPLACE_ADDRESS = '0x353aFb513F80F2D5b56D598EEA203D52D0D635f6';
    const SERVER_WALLET = '0x9B8f624f2821F98E1D0cC745Ec26B487e585204b';
    
    const priceInWei = ethers.utils.parseEther((parseFloat(price) / 0.07).toFixed(6)).toString();
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (7 * 24 * 60 * 60);

    // Encode approval transaction
    const nftInterface = new ethers.utils.Interface([
      'function setApprovalForAll(address operator, bool approved)'
    ]);
    const approveData = nftInterface.encodeFunctionData('setApprovalForAll', [
      MARKETPLACE_ADDRESS, true
    ]);

    // Encode listing transaction  
    const marketInterface = new ethers.utils.Interface([
      'function createListing(tuple(address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, bool reserved) params) returns (uint256)'
    ]);
    const listData = marketInterface.encodeFunctionData('createListing', [{
      assetContract: CONTRACT_ADDRESS,
      tokenId: tokenId.toString(),
      quantity: 1,
      currency: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      pricePerToken: priceInWei,
      startTimestamp: now,
      endTimestamp: endTime,
      reserved: false,
    }]);

    // Send both transactions via Engine Cloud
    const response = await fetch('https://api.thirdweb.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': SECRET_KEY,
      },
      body: JSON.stringify({
        chainId: '137',
        from: SERVER_WALLET,
        transactions: [
          { to: CONTRACT_ADDRESS, data: approveData },
          { to: MARKETPLACE_ADDRESS, data: listData },
        ],
      }),
    });

    const result = await response.json();
    console.log('Engine response:', JSON.stringify(result).substring(0, 300));

    if (result.error) {
      return res.status(500).json({ error: JSON.stringify(result.error) });
    }

    return res.status(200).json({ success: true, data: result });

  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
