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

// Interpret prompt and generate GraphQL query using Gemini
const interpretShopifyPrompt = async (prompt) => {
  const instruction = `
You are a Shopify GraphQL query generator. Given a user prompt, return a valid Shopify GraphQL query. Support case-insensitive queries for specific products (e.g., exact title), colors, sizes, variants, pricing, stock, and comparisons. Handle filters like price ranges, categories, and availability.

Only return the raw GraphQL query string (no markdown/code block or explanation). Examples:

Prompt: "Get 5 products with title and price"
Output:
{
  products(first: 5) {
    edges {
      node {
        title
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
}

Prompt: "What colors are available for Luna Tea Plate - Sagittarius"
Output:
{
  products(first: 10, query: "Luna Tea Plate") {
    edges {
      node {
        title
        productType
        variants(first: 10) {
          edges {
            node {
              title
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

Prompt: "What sizes do you have for Luna Tea Plate - Sagittarius"
Output:
{
  products(first: 1, query: "title:Luna Tea Plate - Sagittarius") {
    edges {
      node {
        title
        variants(first: 10) {
          edges {
            node {
              title
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

Prompt: "What is the price of Luna Tea Plate - Sagittarius"
Output:
{
  products(first: 1, query: "title:Luna Tea Plate - Sagittarius") {
    edges {
      node {
        title
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
}

Prompt: "Show me all red items under $50"
Output:
{
  products(first: 10, query: "color:red price:<50") {
    edges {
      node {
        title
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 10) {
          edges {
            node {
              title
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

Prompt: "Is Luna Tea Plate - Sagittarius in stock"
Output:
{
  products(first: 1, query: "title:Luna Tea Plate - Sagittarius") {
    edges {
      node {
        title
        totalInventory
        variants(first: 10) {
          edges {
            node {
              title
              availableForSale
              quantityAvailable
            }
          }
        }
      }
    }
  }
}

Prompt: "Compare prices between Luna Tea Plate - Sagittarius and Luna Tea Plate - Aquarius"
Output:
{
  products(first: 2, query: "title:Luna Tea Plate - Sagittarius OR title:Luna Tea Plate - Aquarius") {
    edges {
      node {
        title
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
}

Prompt: "What different styles are available for Luna Tea Plate"
Output:
{
  products(first: 10, query: "Luna Tea Plate") {
    edges {
      node {
        title
        productType
        variants(first: 10) {
          edges {
            node {
              title
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

Only return a valid GraphQL query string.`;

  const result = await model.generateContent([instruction, prompt]);
  let text = (await result.response).text().trim();

  // Clean up markdown if returned
  if (text.startsWith("```")) {
    text = text.replace(/```[a-z]*\n?/gi, "").replace(/```$/, "").trim();
  }

  return text;
};

// Format Shopify data into a concise conversational response and structured array
const formatChatResponse = (data, prompt) => {
  const lowerPrompt = prompt.toLowerCase();
  const isSpecificProductQuery = lowerPrompt.includes("luna tea plate - sagittarius") || lowerPrompt.includes("this product");
  const targetProduct = "luna tea plate - sagittarius";

  if (!data?.products?.edges?.length) {
    return {
      message: `Oops, no products found for "${prompt}"! Try another question? 😎`,
      products: []
    };
  }

  let message = `Hey! Here's what I found for "${prompt}":\n`;
  const products = [];

  // Handle comparison queries
  if (lowerPrompt.includes("compare")) {
    message += `Comparing products:\n`;
    data.products.edges.forEach(({ node }) => {
      const productData = {
        title: node.title || 'Unnamed Product',
        price: node.priceRange?.minVariantPrice?.amount || 'N/A',
        currencyCode: node.priceRange?.minVariantPrice?.currencyCode || 'N/A',
        compareAtPrice: node.compareAtPriceRange?.minVariantPrice?.amount || 'N/A'
      };
      message += `🎉 ${node.title}: ${node.priceRange?.minVariantPrice?.amount || 'N/A'} ${node.priceRange?.minVariantPrice?.currencyCode || 'N/A'}`;
      if (node.compareAtPriceRange?.minVariantPrice?.amount) {
        message += ` (was ${node.compareAtPriceRange.minVariantPrice.amount})`;
      }
      message += `\n`;
      products.push(productData);
    });
    message += `Which one catches your eye? 😎`;
    return { message, products };
  }

  // Handle other queries
  let foundExactProduct = false;
  let relatedProducts = [];

  data.products.edges.forEach(({ node }) => {
    const productData = {
      title: node.title || 'Unnamed Product',
      productType: node.productType || 'N/A',
      price: node.priceRange?.minVariantPrice?.amount || 'N/A',
      currencyCode: node.priceRange?.minVariantPrice?.currencyCode || 'N/A',
      description: node.descriptionHtml
        ? node.descriptionHtml.replace(/<[^>]+>/g, "").trim() || 'No description available'
        : 'No description available',
      variants: [],
      availableForSale: node.availableForSale || false,
      totalInventory: node.totalInventory || 0
    };

    // Collect variants
    if (node.variants?.edges?.length) {
      node.variants.edges.forEach(({ node: variant }) => {
        const color = variant.selectedOptions?.find(opt => opt.name.toLowerCase() === 'color')?.value || 'N/A';
        const size = variant.selectedOptions?.find(opt => opt.name.toLowerCase() === 'size')?.value || 'N/A';
        productData.variants.push({
          title: variant.title,
          price: variant.price,
          color: color,
          size: size,
          available: variant.availableForSale || false
        });
      });
    }

    // Case-insensitive match for exact product
    if (isSpecificProductQuery && node.title.toLowerCase() === targetProduct) {
      foundExactProduct = true;
      message += `🎉 **${node.title}**:\n`;
      if (lowerPrompt.includes("color")) {
        const colors = productData.variants
          .map(v => v.color)
          .filter(c => c !== 'N/A')
          .join(', ');
        message += colors
          ? `  Colors: ${colors}\n`
          : `  No other colors available.\n`;
      } else if (lowerPrompt.includes("size")) {
        const sizes = productData.variants
          .map(v => v.size)
          .filter(s => s !== 'N/A')
          .join(', ');
        message += sizes
          ? `  Sizes: ${sizes}\n`
          : `  No size options available.\n`;
      } else if (lowerPrompt.includes("price")) {
        message += node.priceRange?.minVariantPrice
          ? `  Price: ${node.priceRange.minVariantPrice.amount} ${node.priceRange.minVariantPrice.currencyCode}`
          : `  No price info available.`;
        if (node.compareAtPriceRange?.minVariantPrice?.amount) {
          message += ` (was ${node.compareAtPriceRange.minVariantPrice.amount})`;
        }
        message += `\n`;
      } else if (lowerPrompt.includes("stock") || lowerPrompt.includes("availability")) {
        message += node.availableForSale && node.totalInventory > 0
          ? `  In stock: ${node.totalInventory} units!\n`
          : `  Out of stock.\n`;
      } else if (lowerPrompt.includes("style") || lowerPrompt.includes("variant")) {
        const variants = productData.variants
          .map(v => `${v.title} (${v.price} ${productData.currencyCode})`)
          .join(', ');
        message += variants
          ? `  Variants: ${variants}\n`
          : `  No other variants available.\n`;
      }
    } else {
      relatedProducts.push({ node, productData });
    }

    products.push(productData);
  });

  // Handle related products for color or style queries
  if (lowerPrompt.includes("color") && relatedProducts.length) {
    message += foundExactProduct ? `🌈 Other Luna Tea Plates:\n` : `🌈 Found these Luna Tea Plates:\n`;
    relatedProducts.forEach(({ node }, index) => {
      message += `  ${index + 1}. ${node.title}`;
      const colors = node.variants?.edges
        ?.map(({ node }) => node.selectedOptions?.find(opt => opt.name.toLowerCase() === 'color')?.value || 'N/A')
        .filter(c => c !== 'N/A')
        .join(', ');
      if (colors) {
        message += ` (Colors: ${colors})`;
      }
      if (node.priceRange?.minVariantPrice) {
        message += ` - ${node.priceRange.minVariantPrice.amount} ${node.priceRange.minVariantPrice.currencyCode}`;
      }
      message += `\n`;
    });
  }

  if (!foundExactProduct && isSpecificProductQuery) {
    message = `Couldn't find "Luna Tea Plate - Sagittarius". Here's what I found:\n${message}`;
  }

  message += `😎 Need more details or something else?`;

  return { message, products };
};

// Controller function
export const queryShopifyProducts = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    // 1. Generate GraphQL query from natural language prompt
    const graphQLQuery = await interpretShopifyPrompt(prompt);
    console.log("🧠 Generated GraphQL Query:\n", graphQLQuery);

    // 2. Send GraphQL query to Shopify
    const response = await axios.post(
      API_URL,
      { query: graphQLQuery },
      {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    // 3. Format response in a chat-friendly way with structured data
    const { message, products } = formatChatResponse(response.data.data, prompt);
    
    res.json({
      success: true,
      message,
      data: products
    });
  } catch (err) {
    console.error("[Shopify Query Error]", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: `Yikes, something went wrong: ${err.message}. Try another question? 😎`,
      data: [],
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};