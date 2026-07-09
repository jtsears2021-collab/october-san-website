export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenId, priceInPOL, authToken, walletAddress } = req.body;
    
    const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
    const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
    const CONTRACT_ADDRESS = '0x397160Ad067BaaBa7f35Dd0b7A5C25F836b2539F';
    const MARKETPLACE_ADDRESS = '0xef77CDF9Dc521563270B6aBba379dbc3d389C08c';

    const { ethers } = require('ethers');
    
    const provider = new ethers.providers.JsonRpcProvider(
      `https://137.rpc.thirdweb.com/${CLIENT_ID}`
    );

    // Verify auth token and get user's wallet signer via Thirdweb
    const userWalletResponse = await fetch(
      'https://api.thirdweb.com/v1/wallets/embedded/user',
      {
        headers: {
          'x-client-id': CLIENT_ID,
          'x-secret-key': SECRET_KEY,
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );
    
    const userData = await userWalletResponse.json();
    console.log('User wallet data:', JSON.stringify(userData).substring(0, 200));

    // For now return the user data to verify auth works
    return res.status(200).json({ 
      success: true, 
      userData,
      walletAddress 
    });

  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
