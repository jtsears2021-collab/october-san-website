export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenId, priceInPOL, authToken, walletAddress } = req.body;
    
    console.log('List called:', tokenId, priceInPOL, walletAddress);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Test response',
      received: { tokenId, priceInPOL, walletAddress }
    });
  } catch (err) {
    console.error('List error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
