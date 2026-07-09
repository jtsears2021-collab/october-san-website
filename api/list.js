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
    
    const priceInPOL = (parseFloat(price) / 0.07).toFixed(6);
    const priceInWei = BigInt(Math.floor(parseFloat(priceInPOL) * 1e18)).toString();
    const now = Math.floor(Date.now() / 1000);
    const endTime = now + (7 * 24 * 60 * 60);

    // First approve marketplace via Engine
    const approveResponse = await fetch('https://engine.thirdweb.com/v1/write/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': SECRET_KEY,
      },
      body: JSON.stringify({
        chainId: '137',
        from: SERVER_WALLET,
        to: CONTRACT_ADDRESS,
        abi: [{"inputs":[{"name":"operator","type":"address"},{"name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"}],
        functionName: 'setApprovalForAll',
        args: [MARKETPLACE_ADDRESS, true],
      }),
    });
    
    const approveData = await approveResponse.json();
    console.log('Approve response:', JSON.stringify(approveData).substring(0, 200));

    // Wait for approval
    await new Promise(r => setTimeout(r, 8000));

    // Create listing via Engine
    const listResponse = await fetch('https://engine.thirdweb.com/v1/write/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': SECRET_KEY,
      },
      body: JSON.stringify({
        chainId: '137',
        from: SERVER_WALLET,
        to: MARKETPLACE_ADDRESS,
        abi: [{"inputs":[{"components":[{"name":"assetContract","type":"address"},{"name":"tokenId","type":"uint256"},{"name":"quantity","type":"uint256"},{"name":"currency","type":"address"},{"name":"pricePerToken","type":"uint256"},{"name":"startTimestamp","type":"uint128"},{"name":"endTimestamp","type":"uint128"},{"name":"reserved","type":"bool"}],"name":"params","type":"tuple"}],"name":"createListing","outputs":[{"name":"listingId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}],
        functionName: 'createListing',
        args: [{
          assetContract: CONTRACT_ADDRESS,
          tokenId: tokenId.toString(),
          quantity: '1',
          currency: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          pricePerToken: priceInWei,
          startTimestamp: now.toString(),
          endTimestamp: endTime.toString(),
          reserved: false,
        }],
      }),
    });

    const listData = await listResponse.json();
    console.log('List response:', JSON.stringify(listData).substring(0, 200));

    if (listData.error) {
      return res.status(500).json({ error: listData.error });
    }

    return res.status(200).json({ success: true, data: listData });

  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
