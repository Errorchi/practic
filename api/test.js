export default function handler(req, res) {
    res.status(200).json({ 
        message: 'API test works!',
        timestamp: new Date().toISOString()
    });
}