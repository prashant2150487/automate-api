import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { getCache, setCache } from "../services/redisClient.js";
import { executeShopifyQuery } from "../services/shopifyService.js";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const handleChat = async (req, res) => {
  try {
    const { message, userId = "anonymous" } = req.body;

    const isQueryLike =
      /give|get|show|list/i.test(message) && /product/i.test(message);

    const cacheKey = `gemini:${isQueryLike ? "graphql" : "chat"}:${message.trim().toLowerCase()}`;
    const followupKey = `shopify:lastResponse:${userId}`;

    // 1. Handle full data request: "show full data for 2nd product"
    const fullDataMatch = message.match(
      /show (?:me )?full data for (\d+)(?:st|nd|rd|th)? product/i
    );
    if (fullDataMatch) {
      const index = parseInt(fullDataMatch[1], 10) - 1;
      const products = (await getCache(followupKey))?.data?.products?.edges;

      if (products && products[index]) {
        return res.json({
          type: "product-details",
          index: index + 1,
          data: products[index].node,
        });
      } else {
        return res.status(404).json({
          type: "error",
          message: `No product found at index ${index + 1}`,
        });
      }
    }

    // 2. Check and return cache
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log("✅ Cache hit");
      return res.json(cached);
    }

    // 3. If it's a query-like message, generate GraphQL and send to Shopify
    if (isQueryLike) {
      console.log("called");
      const prompt = `
You are an expert in the Shopify Admin GraphQL API.

Your task is to convert the user's request into a valid GraphQL query using the Shopify Admin API version 2025-07.

Always include the following fields in the response:
- title
- description
- productType
- variants(first: 1) {
    edges {
      node {
        price
        selectedOptions {
          name
          value
        }
      }
    }
  }

Use the following rules:
- Use the "query" parameter for filtering by price. Examples:
  • Price greater than ₹5000 → variants.price:>5000
  • Price between ₹1000 and ₹3000 → variants.price:>1000 variants.price:<3000
- Use sorting for cheapest or most expensive products:
  • Cheapest products → sortKey: PRICE, reverse: false
  • Most expensive products → sortKey: PRICE, reverse: true

- Always limit results using first: X (e.g., first: 5 or first: 20)

Instructions:
- Only return the raw GraphQL query.
- Do not include explanations, markdown formatting, or code block wrappers.

User Request: "${message}"
`;

      const result = await model.generateContent(prompt);
      const query = result.response
        .text()
        .replace(/```graphql|```/g, "")
        .trim();

      const shopifyResponse = await executeShopifyQuery(query);
      console.log(query, "");

      // Cache response for follow-ups
      await setCache(followupKey, shopifyResponse);

      const response = {
        type: "graphql",
        query,
        shopifyResponse,
      };

      await setCache(cacheKey, response);
      return res.json(response);
    }

    // 4. Fallback: follow-up suggestion based on last Shopify response
    const lastShopifyData = await getCache(followupKey);

    if (lastShopifyData) {
      const contextPrompt = `
Given this Shopify product data:
${JSON.stringify(lastShopifyData, null, 2)}

User follow-up request: "${message}"

If description is missing, reply with: "No description available for this product."
Otherwise, help with relevant suggestions: improve description, suggest sizes, product enhancements, etc.
Be helpful and concise.
`;

      const result = await model.generateContent(contextPrompt);
      const reply = result.response.text().trim();

      const response = {
        type: "followup",
        reply,
      };

      return res.json(response);
    }

    // 5. Final fallback to general chat
    const result = await model.generateContent(message);
    const reply = result.response.text().trim();

    const response = { type: "chat", reply };
    await setCache(cacheKey, response);
    res.json(response);
  } catch (err) {
    console.error("AI Handler Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
