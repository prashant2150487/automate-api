import axios from "axios";
import dotenv from "dotenv";
dotenv.config();


export async function executeShopifyQuery(query) {
  try {

    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2025-07/graphql.json`,
      { query },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("❌ Shopify Query Error:", err.message);
    throw err;
  }
}