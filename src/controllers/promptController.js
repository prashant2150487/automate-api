import { GoogleGenerativeAI } from "@google/generative-ai";
import interpretPrompt from "../helper/interpretPrompt.js";
// import { User } from "../models/User.js";
export const queryUsers = async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    // Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const queryConfig = await interpretPrompt(prompt, model);
    
    console.log(queryConfig, "query config");

    const { operation, limit, skip, filters, fields, sort, aggregate } = queryConfig;
    let result;

    switch (operation) {
      case "FIND":
        let query = User.find(filters || {});
        
        if (fields && fields.length > 0) {
          query = query.select(fields.join(' '));
        }
        
        if (sort) {
          query = query.sort(sort);
        }
        
        if (skip) {
          query = query.skip(skip);
        }
        
        if (limit) {
          query = query.limit(limit);
        }
        
        const users = await query.exec();
        result = {
          success: true,
          operation: 'FIND',
          count: users.length,
          users: users
        };
        break;

      case "FIND_ONE":
        let singleQuery = User.findOne(filters || {});
        
        if (fields && fields.length > 0) {
          singleQuery = singleQuery.select(fields.join(' '));
        }
        
        if (sort) {
          singleQuery = singleQuery.sort(sort);
        }
        
        const user = await singleQuery.exec();
        result = {
          success: true,
          operation: 'FIND_ONE',
          user: user
        };
        break;

      case "COUNT":
        const count = await User.countDocuments(filters || {});
        result = {
          success: true,
          operation: 'COUNT',
          count: count
        };
        break;

      case "AGGREGATE":
        if (!aggregate || !Array.isArray(aggregate)) {
          throw new Error("Aggregate pipeline is required for AGGREGATE operation");
        }
        
        const aggregateResult = await User.aggregate(aggregate);
        result = {
          success: true,
          operation: 'AGGREGATE',
          count: aggregateResult.length,
          data: aggregateResult
        };
        break;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    res.json(result);

  } catch (err) {
    console.error("[query-error]", err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};