import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Setup Gemini model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SHOP = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const API_URL = `https://${SHOP}.myshopify.com/admin/api/2024-04/graphql.json`;

// Simple in-memory cache: { [conversationId]: { prompt, graphQLQuery } }
const conversationCache = {};

// Detects if the prompt is a casual chat/greeting
const isCasualPrompt = (prompt) => {
  const greetings = [
    "hi", "hello", "hey", "how are you", "how r u", "good morning", "good evening", "good afternoon",
    "what's up", "how's it going", "how do you do", "greetings"
  ];
  const lower = prompt.trim().toLowerCase();
  return greetings.some(greet => lower.includes(greet));
};

// Generates a friendly human-like response for casual prompts
const casualResponse = (prompt) => {
  const lower = prompt.trim().toLowerCase();
  if (["hi", "hello", "hey"].some(greet => lower === greet)) {
    return "Hello! 👋 How can I help you with your Shopify products today?";
  }
  if (lower.includes("how are you") || lower.includes("how r u")) {
    return "I'm just a bot, but I'm doing great! 😊 How can I assist you with your Shopify store?";
  }
  if (lower.includes("good morning")) {
    return "Good morning! ☀️ How can I help you with your Shopify products?";
  }
  if (lower.includes("good evening")) {
    return "Good evening! 🌙 What can I do for you regarding your Shopify store?";
  }
  if (lower.includes("good afternoon")) {
    return "Good afternoon! 😃 How may I assist you with your Shopify products?";
  }
  if (lower.includes("what's up")) {
    return "Not much, just here to help you with Shopify queries! What would you like to know?";
  }
  return "Hi there! How can I help you with your Shopify products or analytics?";
};

// Enhanced prompt interpreter with more capabilities
const interpretShopifyPrompt = async (prompt) => {
  const instruction = `
You are an advanced Shopify GraphQL query generator. Your task is to convert natural language product queries into precise Shopify GraphQL queries. Support:

1. Basic searches (title, product_type, vendor, tags, status)
2. Advanced filtering (color, size, price, stock, date ranges, metafields, collections)
3. Multi-criteria combinations (AND/OR logic)
4. Sorting (CREATED_AT, UPDATED_AT, PUBLISHED_AT, TITLE, ID, MANUAL, BEST_SELLING; reverse for direction)
5. Analytics (aggregations like min, max, average; inventory trends)
6. Comparisons (multiple products or variants)
7. Variant-specific queries (price, options, stock)

Rules:
- Always include fields matching intent: title, vendor, productType, tags, createdAt, updatedAt, publishedAt, handle, status
- For variants: include title, price, selectedOptions, sku, availableForSale
- For options: include name, values
- Use ISO format for date fields
- For inventory: use variants → inventoryItem → inventoryLevels
- For variant-only queries: use productVariants
- For metafields: use "metafield:namespace.key=value"
- For sorting: use valid sortKey values only (CREATED_AT, etc.) with reverse: true if descending
- For collections: filter by title or ID
- Default: first: 10
- Do NOT use priceRangeV2 (use priceRange instead)

Response format: ONLY the raw GraphQL query (no explanations)

Example Outputs:

1. Basic Search:
{
  products(first: 10, query: "title:shirt AND product_type:clothing") {
    edges {
      node {
        title
        priceRange { minVariantPrice { amount } }
      }
    }
  }
}

2. Tags:
{
  products(first: 10, query: "tag:summer AND tag:sale") {
    edges {
      node {
        title
        tags
      }
    }
  }
}

3. Metafields:
{
  products(first: 10, query: "metafield:custom.material='cotton'") {
    edges {
      node {
        title
        metafields(first: 1, namespace: "custom", key: "material") {
          edges {
            node {
              value
            }
          }
        }
      }
    }
  }
}

4. Variant-Specific:
{
  productVariants(first: 10, query: "price:<20") {
    edges {
      node {
        title
        price
        product {
          title
        }
      }
    }
  }
}

5. Collection:
{
  collections(first: 1, query: "title:'Summer Collection'") {
    edges {
      node {
        products(first: 10) {
          edges {
            node {
              title
            }
          }
        }
      }
    }
  }
}

6. Sorting with Direction:
{
  products(first: 10, query: "product_type:shirt", sortKey: CREATED_AT, reverse: true) {
    edges {
      node {
        title
        priceRange { minVariantPrice { amount } }
      }
    }
  }
}

7. Date Range (Updated):
{
  products(first: 15, query: "updated_at:>2024-06-01", sortKey: UPDATED_AT) {
    edges {
      node {
        title
        updatedAt
      }
    }
  }
}

8. Specific Fields:
{
  products(first: 10, query: "title:shirt") {
    edges {
      node {
        title
        variants(first: 1) {
          edges {
            node {
              price {
                amount
                currencyCode
              }
              sku
            }
          }
        }
        
      }
    }
  }
}

9. Inventory:
{
  products(first: 10, query: "available_for_sale:true") {
    edges {
      node {
        title
        variants(first: 5) {
          edges {
            node {
              id
              title
              availableForSale
              inventoryItem {
                inventoryLevels(first: 1) {
                  edges {
                    node {
                      available
                      location {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

10. Variant Attributes:{
  products(first: 10, query: "title:shirt") {
    edges {
      node {
        title
        variants(first: 5) {
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
      }
    }
  }
}
  Now generate the query for: "${prompt}"
`;

  try {
    const result = await model.generateContent([instruction, prompt]);
    let query = (await result.response).text();
    // Clean up response
    query = query
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```$/, "")
      .trim();
    // Validate query structure
    if (!query.startsWith("{") || !query.endsWith("}")) {
      throw new Error("Invalid GraphQL query format");
    }
    // Log token usage
    const usage = result.usageMetadata;
    console.log(result,"result")
    console.log("Token Usage for Prompt:", {
      promptTokenCount: usage?.promptTokenCount || 'N/A',
      candidatesTokenCount: usage?.candidatesTokenCount || 'N/A',
      totalTokenCount: usage?.totalTokenCount || 'N/A',
      prompt: prompt, // Optional: log the prompt for context
    });
    return query;
  } catch (error) {
    console.error("Interpretation error:", error);
    throw new Error("Failed to interpret query");
  }
};

// Enhanced response formatter with analytics capabilities and casual chat
const formatChatResponse = (data, prompt) => {
  // Handle casual chat
  if (isCasualPrompt(prompt)) {
    return {
      message: casualResponse(prompt),
      data: null,
      analytics: null,
      suggestions: ["Ask about products", "Search by price", "Show inventory"],
    };
  }

  const lowerPrompt = prompt.toLowerCase();
  const isAnalyticsQuery =
    lowerPrompt.includes("insight") ||
    lowerPrompt.includes("analys") ||
    lowerPrompt.includes("statistic") ||
    lowerPrompt.includes("trend") ||
    lowerPrompt.includes("distribution");

  const isComparisonQuery =
    lowerPrompt.includes("compare") ||
    lowerPrompt.includes("vs") ||
    lowerPrompt.includes("difference");

  const isInventoryQuery =
    lowerPrompt.includes("stock") ||
    lowerPrompt.includes("inventory") ||
    lowerPrompt.includes("available");

  const isPriceQuery =
    lowerPrompt.includes("price") ||
    lowerPrompt.includes("cost") ||
    lowerPrompt.includes("expensive") ||
    lowerPrompt.includes("cheap");

  const isDateQuery =
    lowerPrompt.includes("date") ||
    lowerPrompt.includes("added") ||
    lowerPrompt.includes("new") ||
    lowerPrompt.includes("recent") ||
    lowerPrompt.includes("month") ||
    lowerPrompt.includes("year");

  if (!data?.products?.edges?.length) {
    return {
      message: `No products found matching "${prompt}"`,
      data: null,
      analytics: null,
      suggestions: [],
    };
  }

  // Handle analytics queries
  if (isAnalyticsQuery && data.products.priceStats) {
    const stats = data.products.priceStats;
    return {
      message:
        `📊 Price Analysis:\n` +
        `• Lowest price: $${stats.minPrice}\n` +
        `• Highest price: $${stats.maxPrice}\n` +
        `• Average price: $${stats.avgPrice.toFixed(2)}\n` +
        `Showing ${data.products.edges.length} products in this range.`,
      data: data.products.edges.map(({ node }) => ({
        title: node.title,
        price: node.priceRangeV2?.minVariantPrice?.amount,
        inventory: node.totalInventory,
      })),
      analytics: stats,
      suggestions: ["Show me cheapest options", "What are the newest items?"],
    };
  }

  // Handle comparison queries
  if (isComparisonQuery) {
    const comparisonData = data.products.edges.map(({ node }) => ({
      title: node.title,
      price: node.priceRangeV2?.minVariantPrice?.amount,
      variants: node.variants?.edges?.length || 0,
      inStock: node.totalInventory > 0,
    }));

    return {
      message:
        `🔍 Comparison Results:\n` +
        comparisonData
          .map(
            (p) =>
              `• ${p.title}: $${p.price} (${p.inStock ? "In Stock" : "Out of Stock"})`
          )
          .join("\n"),
      data: comparisonData,
      analytics: null,
      suggestions: ["Show more details", "Compare prices"],
    };
  }

  // Handle inventory queries
  if (isInventoryQuery) {
    const inventoryData = data.products.edges.map(({ node }) => ({
      title: node.title,
      inStock: node.totalInventory > 0,
      quantity: node.totalInventory,
      variants: node.variants?.edges?.map((v) => v.node.availableForSale),
    }));

    const inStockCount = inventoryData.filter((p) => p.inStock).length;
    const outOfStockCount = inventoryData.length - inStockCount;

    return {
      message:
        `📦 Inventory Status:\n` +
        `• In Stock: ${inStockCount} items\n` +
        `• Out of Stock: ${outOfStockCount} items\n` +
        inventoryData
          .slice(0, 5)
          .map(
            (p) =>
              `• ${p.title}: ${p.quantity > 0 ? `${p.quantity} available` : "Out of stock"}`
          )
          .join("\n") +
        (inventoryData.length > 5
          ? `\n...and ${inventoryData.length - 5} more`
          : ""),
      data: inventoryData,
      analytics: { inStockCount, outOfStockCount },
      suggestions: ["Show all in stock", "Show low inventory"],
    };
  }

  // Handle date-based queries
  if (isDateQuery) {
    const dateData = data.products.edges.map(({ node }) => ({
      title: node.title,
      date: new Date(node.createdAt).toLocaleDateString(),
      daysAgo: Math.floor(
        (new Date() - new Date(node.createdAt)) / (1000 * 60 * 60 * 24)
      ),
    }));

    return {
      message:
        `📅 Date-Based Results:\n` +
        dateData
          .slice(0, 5)
          .map((p) => `• ${p.title} (added ${p.daysAgo} days ago)`)
          .join("\n") +
        (dateData.length > 5 ? `\n...and ${dateData.length - 5} more` : ""),
      data: dateData,
      analytics: null,
      suggestions: ["Show newest first", "Show oldest items"],
    };
  }

  // Handle price queries
  if (isPriceQuery) {
    const priceData = data.products.edges.map(({ node }) => ({
      title: node.title,
      price: node.priceRangeV2?.minVariantPrice?.amount,
      compareAtPrice: node.compareAtPriceRange?.minVariantPrice?.amount,
    }));

    return {
      message:
        `💰 Price Results:\n` +
        priceData
          .slice(0, 5)
          .map(
            (p) =>
              `• ${p.title}: $${p.price}` +
              (p.compareAtPrice ? ` (was $${p.compareAtPrice})` : "")
          )
          .join("\n") +
        (priceData.length > 5 ? `\n...and ${priceData.length - 5} more` : ""),
      data: priceData,
      analytics: null,
      suggestions: ["Show cheapest", "Show most expensive"],
    };
  }

  // Default product listing
  const products = data.products.edges.map(({ node }) => ({
    title: node.title,
    price: node.priceRangeV2?.minVariantPrice?.amount,
    variants: node.variants?.edges?.map((v) => v.node),
    inventory: node.totalInventory,
    createdAt: node.createdAt,
  }));

  return {
    message:
      `Found ${products.length} products matching "${prompt}":\n` +
      products
        .slice(0, 5)
        .map(
          (p) =>
            `• ${p.title} - $${p.price} (${p.inventory > 0 ? `${p.inventory} in stock` : "out of stock"})`
        )
        .join("\n") +
      (products.length > 5 ? `\n...and ${products.length - 5} more` : ""),
    data: products,
    analytics: null,
    suggestions: ["Show more details", "Filter by price"],
  };
};

// Enhanced controller with error handling and caching
export const queryShopifyProducts = async (req, res) => {
  try {
    const { prompt, conversationId } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    // Handle casual chat directly
    if (isCasualPrompt(prompt)) {
      const result = formatChatResponse(null, prompt);
      return res.json({
        success: true,
        message: result.message,
        data: null,
        analytics: null,
        suggestions: result.suggestions,
        query: null,
      });
    }

    let graphQLQuery;

    // Use cache if available and prompt matches
    if (
      conversationId &&
      conversationCache[conversationId] &&
      conversationCache[conversationId].prompt === prompt
    ) {
      graphQLQuery = conversationCache[conversationId].graphQLQuery;
      console.log("Using cached GraphQL query for conversation:", conversationId);
    } else {
      // Step 1: Interpret the natural language query
      graphQLQuery = await interpretShopifyPrompt(prompt);
      if (conversationId) {
        conversationCache[conversationId] = { prompt, graphQLQuery };
      }
      console.log("Generated GraphQL:", graphQLQuery);
    }

    // Step 2: Execute Shopify API request
    const response = await axios.post(
      API_URL,
      { query: graphQLQuery },
      {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Step 3: Format the response
    const result = formatChatResponse(response.data.data, prompt);

    // Step 4: Return enriched response
    res.json({
      success: true,
      message: result.message,
      data: result.data,
      analytics: result.analytics,
      suggestions: result.suggestions,
      query: graphQLQuery, // For debugging
    });
  } catch (error) {
    console.error("Query Error:", error.message);

    // Enhanced error handling
    let errorMessage = "Failed to process your query";
    let statusCode = 500;

    if (error.response?.data?.errors) {
      errorMessage =
        "Shopify API error: " +
        error.response.data.errors.map((e) => e.message).join(", ");
      statusCode = 400;
    } else if (error.message && error.message.includes("timeout")) {
      errorMessage = "Request timed out. Please try a simpler query.";
      statusCode = 408;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      suggestions: [
        "Try a different search term",
        "Simplify your query",
        "Ask about specific products",
      ],
    });
  }
};