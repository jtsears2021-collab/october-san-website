export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tokenId, priceInPOL, authToken, walletAddress } = req.body;

  if (!tokenId || !priceInPOL || !authToken || !walletAddress) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { ethers } = require('ethers');

    const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
    const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
    const CONTRACT_ADDRESS = '0x397160Ad067BaaBa7f35Dd0b7A5C25F836b2539F';
    const MARKETPLACE_ADDRESS = '0xef77CDF9Dc521563270B6aBba379dbc3d389C08c';

    const provider = new ethers.providers.JsonRpcProvider(
      `https://137.rpc.thirdweb.com/${CLIENT_ID}`
    );

    // Use Thirdweb API to sign as the user's embedded wallet
    const signResponse = await fetch(
      'https://api.thirdweb.com/v1/wallets/embedded/sign-transaction',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
          'x-secret-key': SECRET_KEY,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          walletAddress,
          chainId: 137,
          transaction: {
            to: MARKETPLACE_ADDRESS,
            data: '0x', // placeholder
          }
        }),
      }
    );

    const signData = await signResponse.json();
    console.log('Sign response:', JSON.stringify(signData).substring(0, 200));

    // For now return the wallet address to confirm auth works
    return res.status(200).json({ 
      success: true, 
      message: 'Auth verified',
      walletAddress 
    });

  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
