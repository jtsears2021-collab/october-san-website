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

    // Verify auth token via Thirdweb
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
    console.log('User data:', JSON.stringify(userData).substring(0, 200));

    return res.status(200).json({ 
      success: true, 
      userData,
    });

  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
