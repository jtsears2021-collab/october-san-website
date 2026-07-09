export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenId, price, wallet } = req.body;
    console.log('List called:', tokenId, price, wallet);
    return res.status(200).json({ success: true, message: 'Test' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
