import dotenv from 'dotenv';
dotenv.config();

/**
 * Uploads a file buffer to IPFS via Pinata.
 * If credentials are not present, returns a mock CID for seamless development.
 * 
 * @param {Buffer} fileBuffer - The file content buffer.
 * @param {string} fileName - Name of the file.
 * @param {string} mimeType - The file MIME type (e.g., 'image/png').
 * @returns {Promise<string>} The IPFS CID.
 */
export const uploadToIPFS = async (fileBuffer, fileName, mimeType) => {
  const pinataJwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!pinataJwt && (!apiKey || !secretKey)) {
    console.warn("⚠️ Pinata API keys are missing in .env. Falling back to Mock IPFS CID.");
    // Return a mock CID based on a hash of the file name + time for testing
    const mockHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `QmMockIPFS` + mockHash.toUpperCase();
  }

  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, fileName);

    // Optional metadata
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        project: 'AAHAAR',
        uploadedAt: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    const headers = {};
    if (pinataJwt) {
      headers['Authorization'] = `Bearer ${pinataJwt}`;
    } else {
      headers['pinata_api_key'] = apiKey;
      headers['pinata_secret_api_key'] = secretKey;
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      body: formData,
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata response error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.IpfsHash;
  } catch (error) {
    console.error("❌ Error uploading to IPFS via Pinata:", error);
    throw error;
  }
};

/**
 * Returns the public gateway URL for an IPFS CID.
 * 
 * @param {string} cid - The IPFS CID.
 * @returns {string} The public gateway URL.
 */
export const getFileFromCID = (cid) => {
  if (!cid) return "";
  if (cid.startsWith("QmMockIPFS")) {
    // Return a beautiful mock placeholder image or mock certificate URL for local testing
    return `https://placehold.co/600x400/orange/white?text=Verified+IPFS+File:+${cid.slice(-10)}`;
  }
  
  // Use public Pinata or Cloudflare gateway
  const gateway = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";
  return `${gateway}${cid}`;
};
