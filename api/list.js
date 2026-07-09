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
    const CONTRACT_ADDRESS = '0x397160Ad067BaaBa7f35Dd0b7A5C25F836b2539F';
    const MARKETPLACE_ADDRESS = '0xef77CDF9Dc521563270B6aBba379dbc3d389C08c';
    const SERVER_WALLET = '0x9B8f624f2821F98E1D0cC745Ec26B487e585204b';
    
    const priceInWei = BigInt(Math.floor((parseFloat(price) / 0.07) * 1e18)).toString();
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (7 * 24 * 60 * 60);

    // Step 1: Approve marketplace
    const approveResponse = await fetch('https://api.thirdweb.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': SECRET_KEY,
      },
      body: JSON.stringify({
        chainId: '137',
        from: SERVER_WALLET,
        transactions: [{
          type: 'contractCall',
          contractAddress: CONTRACT_ADDRESS,
          method: 'function setApprovalForAll(address operator, bool approved)',
          params: [MARKETPLACE_ADDRESS, true],
        }],
      }),
    });
    
    const approveData = await approveResponse.json();
    console.log('Approve:', JSON.stringify(approveData).substring(0, 200));

    // Wait for approval
    await new Promise(r => setTimeout(r, 8000));

    // Step 2: Create listing
    const listResponse = await fetch('https://api.thirdweb.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': SECRET_KEY,
      },
      body: JSON.stringify({
        chainId: '137',
        from: SERVER_WALLET,
        transactions: [{
          type: 'contractCall',
          contractAddress: MARKETPLACE_ADDRESS,
          method: 'function createListing((address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, bool reserved) params) returns (uint256)',
          params: [{
            assetContract: CONTRACT_ADDRESS,
            tokenId: tokenId.toString(),
            quantity: '1',
            currency: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            pricePerToken: priceInWei,
            startTimestamp: now.toString(),
            endTimestamp: endTime.toString(),
            reserved: false,
          }],
        }],
      }),
    });

    const listData = await listResponse.json();
    console.log('List:', JSON.stringify(listData).substring(0, 200));

    if (listData.error) {
      return res.status(500).json({ error: JSON.stringify(listData.error) });
    }

    return res.status(200).json({ success: true, data: listData });

  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
